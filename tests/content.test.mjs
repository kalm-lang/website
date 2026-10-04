import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routes } from '../scripts/routes.mjs';
import { validateContent, validateCatalog } from '../scripts/validate-content.mjs';
import { markdown } from '../scripts/render.mjs';

const sample = content => [{ source: 'website/content/examples/sample.md', path: '/examples/sample/',
  title: 'Sample', section: 'examples', group: 'Basics', content }];

test('all discovered content satisfies publishing constraints', () => {
  assert.doesNotThrow(() => validateContent(routes));
  assert.doesNotThrow(() => validateCatalog(routes));
  assert.throws(() => validateCatalog(routes.filter(route => route.path !== '/examples/fix/')), /coverage differs/);
  assert.equal(routes.filter(route => route.lesson).length, 8);
  assert.ok(routes.some(route => route.version === '0.1' && route.source.startsWith('specifications/')));
  assert.ok(routes.some(route => route.version === '1.0'));
  assert.ok(routes.some(route => route.version === '1.1'));
});

test('repository links fail instead of exposing raw files', () => {
  assert.throws(() => markdown('[license](../../../LICENSE)', 'website/content/docs/sample.md'), /No website page/);
  assert.throws(() => markdown('[source](/source/LICENSE)', 'sample.md'), /Repository file link/);
  assert.match(markdown('[guide](values.md)', 'website/content/docs/language/layout.md'), /href="\/docs\/language\/values\/"/);
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
