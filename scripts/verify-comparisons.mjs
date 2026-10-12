import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, delimiter } from 'node:path';
import { spawnSync } from 'node:child_process';
import MarkdownIt from 'markdown-it';
import { routes } from './routes.mjs';
import { readDocument, contentFiles, repository } from './content.mjs';
import { tabsPlugin, fences } from './tabs.mjs';
import { compilerCommand } from './compiler-command.mjs';

const md = new MarkdownIt().use(tabsPlugin);
const home = contentFiles('home').filter(file => file.endsWith('.md')).map(readDocument);
const root = mkdtempSync(resolve(tmpdir(), 'kalm-comparisons-'));
const java = process.env.KALM_JAVA_COMMAND || 'java';
const javac = process.env.KALM_JAVAC_COMMAND || 'javac';
const libraries = resolve(repository, 'build-support/target/lib/*');
let verified = 0;
const failures = [];
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 30_000 });
  if (result.status !== 0) throw new Error(`${result.error?.message ?? ''}${result.stdout}${result.stderr}`);
  return result.stdout;
}
function comparisons(tokens) { return tokens.flatMap(token => token.type === 'code_compare' ? [token] : token.children && token.type !== 'inline' ? comparisons(token.children) : []); }
try {
  for (const route of [...routes.filter(route => !route.specification), ...home]) {
    const tokens = md.parse(route.content, {});
    const groups = comparisons(tokens);
    const primaryBlocks = new Set(fences(tokens, 'kalm', 'all'));
    for (const [index, group] of groups.entries()) {
      const block = group.children.find(token => token.info.startsWith('java'));
      if (!block) continue;
      const project = resolve(root, `${verified++}`);
      mkdirSync(project);
      try {
        const source = block.content;
        let filename = block.info.split(/\s+/)[1];
        if (!filename?.endsWith('.java')) filename = 'Example.java';
        writeFileSync(resolve(project, filename), source);
        // Java interoperability examples intentionally refer to a Kalm facade.
        if (source.includes('GreetingKalm.')) {
          mkdirSync(resolve(project, 'kalm'));
          mkdirSync(resolve(project, 'java'));
          const greeting = fences(tokens).find(token => token.info.startsWith('kalm Greeting.kalm'));
          writeFileSync(resolve(project, 'kalm/Greeting.kalm'), greeting.content);
          writeFileSync(resolve(project, 'java', filename), source);
          run(compilerCommand.command, [...compilerCommand.args, 'compile', '--source-root', resolve(project, 'kalm'), '--java-source-root', resolve(project, 'java'), '--output', resolve(project, 'classes'), '--generated-sources', resolve(project, 'generated')], project);
        } else if (route.lesson && (primaryBlocks.has(block) || route.lesson === 8)) {
          // The existing project verifier checks cumulative Kalm lessons; Java source
          // counterparts are verified cumulatively below rather than in isolation.
        } else {
          run(javac, ['-cp', libraries, '-d', resolve(project, 'classes'), resolve(project, filename)], project);
          if (source.includes('org.junit.jupiter')) run(java, ['-cp', [resolve(project, 'classes'), libraries].join(delimiter), 'org.junit.platform.console.ConsoleLauncher', 'execute', '--scan-classpath', '--disable-banner', '--fail-if-no-tests'], project);
        }
        if (!route.lesson) {
          const script = group.children.find(token => token.info.startsWith('kalms'));
          if (script) {
            writeFileSync(resolve(project, 'Example.kalms'), script.content);
            run(compilerCommand.command, [...compilerCommand.args, 'shell', '-f', resolve(project, 'Example.kalms')], project);
          }
        }
      } catch (error) { failures.push(`${route.path ?? route.source} comparison ${index}: ${error.message}`); }
    }
  }
  const project = resolve(root, 'java-lessons');
  mkdirSync(project);
  writeFileSync(resolve(project, 'notes.txt'), 'a quiet\nmorning\n');
  const outputs = ['Text stats', '3 words: a quiet morning', 'Will read notes.txt', '3 words', '3 words', '2 lines / 3 words', '2 lines / 3 words', '2 lines / 3 words'];
  for (const route of routes.filter(route => route.lesson)) {
    for (const token of fences(md.parse(route.content, {}), 'kalm', 'all').filter(t => t.info.startsWith('java'))) {
      writeFileSync(resolve(project, token.info.split(/\s+/)[1]), token.content);
    }
    const sources = (await import('node:fs')).readdirSync(project).filter(f => f.endsWith('.java')).map(f => resolve(project, f));
    run(javac, ['-cp', libraries, '-d', resolve(project, 'classes'), ...sources], project);
    const output = run(java, ['-cp', resolve(project, 'classes'), 'stats.App', ...(route.lesson === 3 || route.lesson >= 7 ? ['notes.txt'] : [])], project);
    if (!output.includes(outputs[route.lesson - 1])) throw new Error(`Java lesson ${route.lesson} produced ${JSON.stringify(output)}`);
  }
  run(java, ['-cp', [resolve(project, 'classes'), libraries].join(delimiter), 'org.junit.platform.console.ConsoleLauncher', 'execute', '--scan-classpath', '--disable-banner', '--fail-if-no-tests'], project);
} finally { rmSync(root, { recursive: true, force: true }); }
if (failures.length) throw new Error(failures.join('\n'));
console.log(`Verified ${verified} comparisons, script counterparts, and cumulative Java lessons.`);
