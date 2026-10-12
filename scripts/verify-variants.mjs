import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import MarkdownIt from 'markdown-it';
import { routes } from './routes.mjs';
import { contentFiles, readDocument } from './content.mjs';
import { tabsPlugin, fences, sourceInfo } from './tabs.mjs';
import { compilerCommand } from './compiler-command.mjs';

const md = new MarkdownIt().use(tabsPlugin);
const root = mkdtempSync(resolve(tmpdir(), 'kalm-variants-'));
const groups = (tokens) =>
  tokens.flatMap((t) =>
    t.type === 'code_compare' ? [t] : t.children && t.type !== 'inline' ? groups(t.children) : [],
  );
const jobs = [],
  failures = [];
let count = 0;
function run(args, cwd) {
  return new Promise((done, reject) => {
    const child = spawn(compilerCommand.command, [...compilerCommand.args, ...args], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (data) => (output += data));
    child.stderr.on('data', (data) => (output += data));
    const timer = setTimeout(() => child.kill(), 30000);
    child.on('error', reject);
    child.on('close', (code) => {
      clearTimeout(timer);
      code === 0 ? done() : reject(new Error(output));
    });
  });
}
for (const route of [
  ...routes.filter((r) => !r.specification),
  ...contentFiles('home')
    .filter((f) => f.endsWith('.md') && !f.endsWith('learning.md'))
    .map(readDocument),
]) {
  const tokens = md.parse(route.content, {});
  const primary = new Set(fences(tokens, 'kalm', 'all'));
  for (const group of groups(tokens)) {
    const java = group.children.find((t) => sourceInfo(t.info).language === 'java');
    const variants = group.children.filter((t) => sourceInfo(t.info).language === 'kalm');
    if (java && variants.length) {
      const javaPackage = /^package (\w+(?:\.\w+)*);/m.exec(java.content)?.[1] || '';
      const kalmPackage = /^space (\w+(?:\.\w+)*)/m.exec(variants[0].content)?.[1] || '';
      if (javaPackage !== kalmPackage)
        failures.push((route.path || route.source) + ': package declarations differ');
    }
    if (route.lesson && (route.lesson === 8 || variants.some((v) => primary.has(v)))) continue;
    for (const variant of variants)
      jobs.push(async () => {
        const project = resolve(root, String(count++));
        mkdirSync(project);
        const sourceRoot = resolve(project, 'kalm');
        mkdirSync(sourceRoot);
        writeFileSync(resolve(project, 'notes.txt'), 'a quiet\nmorning\n');
        const info = sourceInfo(variant.info);
        const filename = /\.kalm$/.test(info.label) ? info.label : 'Example.kalm';
        writeFileSync(resolve(sourceRoot, filename), variant.content);
        const args = [
          variant.content.includes('test "') ? 'test' : 'compile',
          '--source-root',
          sourceRoot,
          '--output',
          resolve(project, 'classes'),
          '--generated-sources',
          resolve(project, 'generated'),
        ];
        // Cooperating files are compiled together in each authored Kalm style.
        if (
          group.meta.presentation === 'showcase' &&
          java &&
          java.content.includes('GreetingKalm.')
        ) {
          const javaRoot = resolve(project, 'java');
          mkdirSync(javaRoot);
          writeFileSync(resolve(javaRoot, sourceInfo(java.info).label), java.content);
          args.push('--java-source-root', javaRoot);
        }
        await run(args, project);
      });
    if (!route.lesson)
      for (const variant of group.children.filter(
        (t) =>
          sourceInfo(t.info).language === 'kalms' &&
          (sourceInfo(t.info).style === 'braces' || !java),
      ))
        jobs.push(async () => {
          const project = resolve(root, String(count++));
          mkdirSync(project);
          const script = resolve(project, 'Example.kalms');
          writeFileSync(script, variant.content);
          await run(['shell', '-f', script], project);
        });
  }
}
try {
  await Promise.all(
    Array.from({ length: 2 }, async () => {
      while (jobs.length) {
        const job = jobs.shift();
        try {
          await job();
        } catch (error) {
          failures.push(error.message);
        }
      }
    }),
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}
if (failures.length) throw new Error(failures.join('\n'));
console.log(
  'Directly compiled ' +
    count +
    ' additional Kalm/style/script/source-set variants; package declarations match.',
);
