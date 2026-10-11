import { readdirSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import MarkdownIt from 'markdown-it';
import { routes } from './routes.mjs';
import { repository, contentRoot, readDocument, contentFiles } from './content.mjs';
import { tabsPlugin } from './tabs.mjs';
import { compilerCommand } from './compiler-command.mjs';

const md = new MarkdownIt().use(tabsPlugin);
const only = process.argv.slice(2);
const home = ['greeting.md', 'learning.md', ...contentFiles('home/notes').map(file => file.slice('content/home/'.length))]
  .map(file => readDocument(`${contentRoot}/home/${file}`))
  .map(document => ({ ...document, path: document.source }));
const examples = [...routes.filter(route => route.section === 'examples' && route.path !== '/examples/'), ...home]
  .filter(route => !only.length || only.includes(route.path));
const root = mkdtempSync(resolve(tmpdir(), 'kalm-examples-'));
let compiled = 0;
const failures = [];
try {
  for (const [index, route] of examples.entries()) {
    const tokens = md.parse(route.content, {}).flatMap(token => token.children ?? [token]).filter(token => token.type === 'fence');
    const codeTokens = tokens.filter(token => /^(kalm|java)(?:\s|$)/.test(token.info));
    if (!codeTokens.length) continue;
    const groups = route.verify === 'alternatives' ? codeTokens.map(token => [token]) : [codeTokens];
    for (const [variant, blocks] of groups.entries()) {
      const project = resolve(root, `${index}-${variant}`);
      const kalm = resolve(project, 'kalm');
      const java = resolve(project, 'java');
      mkdirSync(kalm, { recursive: true });
      mkdirSync(java);
      for (const token of blocks) {
        const [language, label] = token.info.split(/\s+/);
        const file = label?.match(/^[\w-]+\.(kalm|java)$/) ? label : `Example.${language === 'java' ? 'java' : 'kalm'}`;
        writeFileSync(resolve(language === 'java' ? java : kalm, file), token.content);
      }
      const command = route.verify === 'test' ? 'test' : 'compile';
      const result = spawnSync(compilerCommand.command, [...compilerCommand.args, command,
        '--source-root', kalm, '--java-source-root', java,
        '--generated-sources', resolve(project, 'generated'), '--output', resolve(project, 'classes'),
        '--reports', resolve(project, 'reports'), '--html-reports', resolve(project, 'html')],
      { cwd: project, encoding: 'utf8', timeout: 30_000 });
      if (result.status !== 0) failures.push(`${route.path}\n${result.error?.message ?? ''}${result.stdout}${result.stderr}`);
      else compiled++;
    }
  }
} finally { rmSync(root, { recursive: true, force: true }); }
if (failures.length) throw new Error(failures.join('\n'));
console.log(`Compiled ${compiled} example programs, including Java interoperability and native tests.`);
