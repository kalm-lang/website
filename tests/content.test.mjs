import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routes } from '../scripts/routes.mjs';
import { validateContent, validateCatalog } from '../scripts/validate-content.mjs';
import { markdown } from '../scripts/render.mjs';
import { specificationAliases } from '../scripts/content.mjs';

const sample = content => [{ source: 'content/examples/sample.md', path: '/examples/sample/',
  title: 'Sample', section: 'examples', group: 'Basics', content }];

test('all discovered content satisfies publishing constraints', () => {
  assert.doesNotThrow(() => validateContent(routes));
  assert.doesNotThrow(() => validateCatalog(routes));
  assert.throws(() => validateCatalog(routes.filter(route => route.path !== '/examples/fix/')), /coverage differs/);
  assert.equal(routes.filter(route => route.lesson).length, 8);
  assert.ok(routes.some(route => route.version === '0.1.0' && route.source.startsWith('specification/')));
  assert.ok(routes.some(route => route.version === '1.0.0'));
  assert.ok(routes.some(route => route.version === '1.1.0'));
  assert.ok(routes.some(route => route.path === '/docs/specifications/1.1.0/' && route.status === 'final'));
  assert.ok(routes.some(route => route.path === '/docs/specifications/1.1.0-draft/' && route.status === 'draft'));
  assert.ok(specificationAliases.some(([from, to]) => from === '/docs/specifications/1.1/' && to === '/docs/specifications/1.1.0/'));
});

test('repository links fail instead of exposing raw files', () => {
  assert.throws(() => markdown('[license](../../../LICENSE)', 'content/docs/sample.md'), /No website page/);
  assert.throws(() => markdown('[source](/source/LICENSE)', 'sample.md'), /Repository file link/);
  assert.match(markdown('[guide](values.md)', 'content/docs/language/layout.md'), /href="\/docs\/language\/values\/"/);
});

test('tab groups reject invalid sizes, content, and missing closing markers', () => {
  const block = '```kalm\npub fun answer() -> Int = 42\n```\n';
  assert.throws(() => markdown(`:::tabs\n${block.repeat(4)}:::\n`, 'sample.md'), /two or three/);
  assert.throws(() => markdown(`:::tabs\n${block}prose\n:::\n`, 'sample.md'), /two or three/);
  assert.throws(() => markdown(`:::tabs\n${block}`, 'sample.md'), /Unclosed/);
  assert.match(markdown(`:::tabs\n${block.repeat(3)}:::\n`, 'sample.md'), /kalm-code-tabs/);
});

test('long articles and cluttered examples cannot be published', () => {
  assert.throws(() => validateContent([{ ...sample('word '.repeat(801))[0], section: 'docs' }]), /800 prose words/);
  assert.throws(() => validateContent([{ ...sample('## Heading\n'.repeat(7))[0], section: 'docs' }]), /six main sections/);
  assert.throws(() => validateContent(sample('```kalm\nline\n```\n'.repeat(2))), /one code block/);
  assert.throws(() => validateContent(sample('```kalm\n' + 'line\n'.repeat(41) + '```')), /40 lines/);
});

test('heading anchors stay unique and authored HTML remains escaped', () => {
  const html = markdown('## Values\n\n## Values\n\n<script>alert(1)</script>', 'sample.md');
  assert.match(html, /id="values"/);
  assert.match(html, /id="values-1"/);
  assert.doesNotMatch(html, /<script>/);
});

test('comparisons require real counterparts and render unique accessible panels', () => {
  const group = '::::compare\n```kalm App.kalm\npub fun main() -> Unit: sayLine("Hello")\n```\n```kalms App.kalms\nsayLine("Hello")\n```\n```java App.java\nclass App {}\n```\n::::\n';
  const html = markdown(group.repeat(2), 'content/examples/sample.md');
  assert.match(html, /kalm-code-compare/);
  assert.match(html, /article-compare-0-java/);
  assert.match(html, /article-compare-1-java/);
  assert.throws(() => markdown(group.replace(/```java[\s\S]*?```\n/, ''), 'sample.md'), /needs Kalm, Java/);
  assert.throws(() => markdown(group.replace(/```kalms[\s\S]*?```\n/, ''), 'sample.md'), /scriptUnavailable/);
  assert.match(markdown(group, 'content/home/sample.md'), /data-home/);
  assert.doesNotMatch(markdown(group, 'content/home/sample.md'), /data-language="java"/);
  assert.match(markdown(`:::::tabs\n${group}${group}\n:::::\n`, 'sample.md'), /kalm-code-tabs/);
  assert.throws(() => validateContent(sample('```kalm\nline\n```')), /comparison group/);
  assert.match(markdown('::::dialect kalms\nVisible **script** instructions.\n::::', 'sample.md'), /Visible <strong>script<\/strong>/);
});
