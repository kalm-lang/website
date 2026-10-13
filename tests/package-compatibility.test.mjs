import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const website = resolve(import.meta.dirname, '..');
const fence = (language, source) => '```' + language + '\n' + source + '\n```\n';
const kalm = fence('kalm App.kalm', 'pub fun main() -> Unit: sayLine("Mira")');
const java = fence('java App.java', 'class App {}');
const record = (file, content, metadata = {}) => ({ file, content, metadata: { title: 'Sample', order: 0, ...metadata } });

for (const comparisons of [false, true]) {
  test(`build supports ${comparisons ? 'Java comparisons without scripts or styles' : 'legacy standalone snippets and file tabs'}`, () => {
    const root = mkdtempSync(resolve(tmpdir(), 'kalm-website-compatibility-'));
    try {
      for (const directory of ['scripts', 'shared', 'src', 'public']) cpSync(resolve(website, directory), resolve(root, directory), { recursive: true });
      for (const file of ['package.json', 'vite.config.mjs']) cpSync(resolve(website, file), resolve(root, file));
      mkdirSync(resolve(root, 'node_modules/@kalm-lang'), { recursive: true });
      for (const dependency of readdirSync(resolve(website, 'node_modules'))) {
        if (dependency !== '@kalm-lang') symlinkSync(resolve(website, 'node_modules', dependency), resolve(root, 'node_modules', dependency));
      }
      const group = comparisons ? ':::compare\n' + kalm + java + ':::\n' : kalm;
      const documents = Object.fromEntries([
        record('content/docs/quick-start.md', group + fence('powershell', 'Write-Host "<hello>"')),
        record('content/examples/index.md', 'Examples'),
        record('content/examples/sample.md', comparisons ? group : ':::tabs\n' + kalm + java + ':::\n'),
        record('content/learn/index.md', 'Learn Kalm'),
        record('content/home/greeting.md', group),
      ].map(document => [document.file, document]));
      function install(name, source) {
        const directory = resolve(root, 'node_modules/@kalm-lang', name);
        mkdirSync(directory);
        writeFileSync(resolve(directory, 'package.json'), JSON.stringify({ name: '@kalm-lang/' + name, type: 'module', exports: './index.mjs' }));
        writeFileSync(resolve(directory, 'index.mjs'), source);
      }
      // These modules deliberately omit optional exports from later package APIs.
      install('documentation', `export const documents = ${JSON.stringify(documents)};`);
      install('specification', `export const versions = ${JSON.stringify({ '0.1.0': { file: 'v0.1.0.md', metadata: { version: '0.1.0', status: 'final' }, markdown: '# Specification\n\nHistorical specification.' } })};`);
      const highlighting = import.meta.resolve('@kalm-lang/syntax-highlighting');
      install('syntax-highlighting', `import { createKalmHighlighter as create } from ${JSON.stringify(highlighting)};
        export async function createKalmHighlighter() {
          const highlighter = await create();
          return { codeToHtml: highlighter.codeToHtml.bind(highlighter) };
        }`);
      const run = (script, args = []) => {
        const result = spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8', timeout: 60_000 });
        assert.equal(result.status, 0, result.error?.message || result.stdout + result.stderr);
      };
      run('scripts/generate.mjs');
      run(resolve(website, 'node_modules/vite/bin/vite.js'), ['build']);
      run('scripts/check-links.mjs');
      const homepage = readFileSync(resolve(root, 'dist/index.html'), 'utf8');
      const example = readFileSync(resolve(root, 'dist/examples/sample/index.html'), 'utf8');
      assert.match(homepage, /data-code-capabilities="\{&quot;dialect&quot;:false,&quot;style&quot;:false,&quot;environment&quot;:false\}"/);
      assert.match(example, comparisons ? /kalm-code-compare/ : /kalm-code-tabs/);
      assert.doesNotMatch(example, /data-language="kalms"/);
      const guide = readFileSync(resolve(root, 'dist/docs/quick-start/index.html'), 'utf8');
      assert.match(guide, /(?:&lt;|&#x3C;)hello/);
      assert.doesNotMatch(guide, /<hello>/);
      assert.ok(readFileSync(resolve(root, 'dist/docs/specifications/0.1.0/index.html'), 'utf8').includes('Historical specification'));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
