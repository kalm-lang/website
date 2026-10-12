import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, delimiter } from 'node:path';
import { spawnSync } from 'node:child_process';
import MarkdownIt from 'markdown-it';
import { routes } from './routes.mjs';
import { repository } from './content.mjs';
import { compilerCommand } from './compiler-command.mjs';
import { tabsPlugin, fences } from './tabs.mjs';

const root = mkdtempSync(resolve(tmpdir(), 'kalm-learn-'));
const main = resolve(root, 'src/main/kalm/stats');
const tests = resolve(root, 'src/test/kalm/stats');
const md = new MarkdownIt().use(tabsPlugin);
const java = process.env.KALM_JAVA_COMMAND ?? 'java';
function run(command, args, expectedStatus = 0, expectedText = '') {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout: 30_000 });
  if (result.status !== expectedStatus || !result.stdout.includes(expectedText)) {
    throw new Error(`${command} ${args.join(' ')}\nExpected status ${expectedStatus} and ${JSON.stringify(expectedText)}\n${result.error?.message ?? ''}${result.stdout}${result.stderr}`);
  }
}
const classpath = [resolve(root, 'target/classes'),
  resolve(repository, 'build-support/target/lib/*')].join(delimiter);
const execute = (args, status, text) => run(java, ['-cp', classpath, 'stats.AppKalm', ...args], status, text);
try {
  mkdirSync(main, { recursive: true });
  mkdirSync(tests, { recursive: true });
  writeFileSync(resolve(root, 'notes.txt'), 'a quiet\nmorning\n');
  const outputs = ['Text stats', '3 words: a quiet morning', 'Will read notes.txt', '3 words', '3 words', '2 lines / 3 words', '2 lines / 3 words', '2 lines / 3 words'];
  for (const style of ['indentation','braces']) {
  for (const route of routes.filter(route => route.lesson)) {
    for (const token of fences(md.parse(route.content, {}), 'kalm', 'primary', style)) {
      const [language, filename] = token.info.split(/\s+/);
      if (language !== 'kalm') continue;
      if (!/^[A-Za-z]+\.kalm$/.test(filename ?? '')) throw new Error(`Lesson snippet needs a filename: ${route.path}`);
      writeFileSync(resolve(filename.endsWith('Tests.kalm') ? tests : main, filename), token.content);
    }
    run(compilerCommand.command, [...compilerCommand.args, 'compile']);
    execute(route.lesson >= 7 || route.lesson === 3 ? ['notes.txt'] : [], 0, outputs[route.lesson - 1]);
    console.log(`Verified lesson ${route.lesson}`);
    if (route.lesson < 8) {
      const script = fences(md.parse(route.content, {}), 'kalms', 'primary', style).find(token => token.info.startsWith('kalms '));
      if (!script) throw new Error(`Missing self-contained script lesson: ${route.path}`);
      writeFileSync(resolve(root, 'App.kalms'), script.content);
      run(compilerCommand.command, [...compilerCommand.args, 'shell', '-f', resolve(root, 'App.kalms')], 0, outputs[route.lesson - 1]);
      if (route.lesson === 7) {
        writeFileSync(resolve(root, 'App.kalms'), script.content.replace('arrayOf("notes.txt")', 'arrayOf("missing.txt")'));
        run(compilerCommand.command, [...compilerCommand.args, 'shell', '-f', resolve(root, 'App.kalms')], 1, 'Could not read file');
      }
    }
  }
  run(compilerCommand.command, [...compilerCommand.args, 'test'], 0, '4 passed');
  writeFileSync(resolve(root, 'empty.txt'), '');
  execute(['empty.txt'], 0, '0 lines / 0 words');
  writeFileSync(resolve(root, 'whitespace.txt'), '\n \t\n');
  execute(['whitespace.txt'], 0, '2 lines / 0 words');
  execute(['missing.txt'], 1, 'Could not read file');
  execute([], 2, 'Usage:');
  execute(['notes.txt', 'extra.txt'], 2, 'Usage:');
  execute(['src'], 1, 'Could not read file');
  if (process.platform !== 'win32') {
  writeFileSync(resolve(root, 'unreadable.txt'), 'private');
  chmodSync(resolve(root, 'unreadable.txt'), 0);
  if (process.getuid?.() !== 0) execute(['unreadable.txt'], 1, 'Could not read file');
  }
  }
  console.log('Verified both styles of cumulative lessons, native tests, counts, input failures, and usage errors.');
} finally { rmSync(root, { recursive: true, force: true }); }
