import {selectSources} from '../shared/source-selection.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {routes} from '../scripts/routes.mjs';
import {validateCatalog, validateContent} from '../scripts/validate-content.mjs';
import {markdown} from '../scripts/render.mjs';
import {specificationAliases} from '../scripts/content.mjs';
import {contentCapabilities} from '../scripts/capabilities.mjs';
import * as specification from '@kalm-lang/specification';

const sample = content => [{ source: 'content/examples/sample.md', path: '/examples/sample/',
  title: 'Sample', section: 'examples', group: 'Basics', content }];

test('all discovered content satisfies publishing constraints', () => {
  assert.doesNotThrow(() => validateContent(routes));
  assert.doesNotThrow(() => validateCatalog(routes));
  assert.throws(() => validateCatalog(routes.filter(route => route.path !== '/examples/fix/')), /coverage differs/);
  const editions = [...Object.values(specification.versions ?? {}), ...Object.values(specification.drafts ?? {})];
  assert.equal(routes.filter(route => route.specification).length, editions.length);
  for (const { metadata: { version, status } } of editions) {
    const path = `/docs/specifications/${version}${status === 'final' ? '' : '-' + status}/`;
    assert.ok(routes.some(route => route.path === path && route.status === status));
  }
  assert.ok(specificationAliases.every(([, target]) => routes.some(route => route.path === target)));
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

test('comparisons use available counterparts and render unique accessible panels', () => {
  const group = '::::compare\n```kalm App.kalm\npub fun main() -> Unit: sayLine("Hello")\n```\n```kalms App.kalms\nsayLine("Hello")\n```\n```java App.java\nclass App {}\n```\n::::\n';
  const html = markdown(group.repeat(2), 'content/examples/sample.md');
  assert.match(html, /kalm-code-compare/);
  assert.match(html, /article-compare-0-java/);
  assert.match(html, /article-compare-1-java/);
  assert.doesNotMatch(markdown(group.replace(/```java[\s\S]*?```\n/, ''), 'sample.md'), /data-language="java"/);
  assert.doesNotMatch(markdown(group.replace(/```kalms[\s\S]*?```\n/, ''), 'sample.md'), /data-language="kalms"/);
  assert.match(markdown(group, 'content/home/greeting.md'), /data-home/);
  assert.doesNotMatch(markdown(group, 'content/home/greeting.md'), /data-language="java"/);
  assert.match(markdown(`:::::tabs\n${group}${group}\n:::::\n`, 'sample.md'), /kalm-code-tabs/);
  assert.doesNotThrow(() => validateContent(sample('```kalm\nline\n```')));
  assert.match(markdown('::::dialect kalms\nVisible **script** instructions.\n::::', 'sample.md'), /Visible <strong>script<\/strong>/);
});

test('legacy fences and file tabs do not require optional language variants', () => {
  const legacy = ':::tabs\n```kalm Greeting.kalm\npub fun greeting() -> Text = "Hello"\n```\n```java Caller.java\nclass Caller {}\n```\n:::\n';
  assert.doesNotThrow(() => validateContent(sample(legacy)));
  const html = markdown(legacy, 'sample.md');
  assert.match(html, /kalm-code-tabs/);
  assert.doesNotMatch(html, /kalm-code-compare/);
  assert.match(html, /Caller.java/);
  assert.deepEqual(contentCapabilities([{ file: 'content/examples/sample.md', content: legacy }]), { dialect: false, style: false, environment: false });
  const modern = ':::compare\n```kalm App.kalm {"style":"braces"}\nfun main() {}\n```\n```kalms\nsayLine("Hello")\n```\n:::\n:::compare\n```bash {"os":"linux","shell":"bash"}\nkalm App.kalms\n```\n:::\n';
  assert.deepEqual(contentCapabilities([{ file: 'content/home/greeting.md', content: modern }]), { dialect: true, style: true, environment: true });
  assert.deepEqual(selectSources([{ language: 'kalm' }], {}, { dialect: 'kalms', style: 'braces' }), [0]);
  assert.deepEqual(selectSources([{ language: 'java' }], {}, { dialect: 'kalm' }), [0]);
  assert.throws(() => markdown(':::compare\n```kalm\none\n```\n```kalm\ntwo\n```\n:::\n', 'sample.md'), /Duplicate/);
});

test('source locks operate independently and terminal variants follow resolved environment', () => {
  const preferences={dialect:'kalms',style:'braces',os:'windows',shell:'cmd'};
  const sources=[{language:'kalm',style:'indentation'},{language:'kalm',style:'braces'},{language:'kalms',style:'indentation'},{language:'kalms',style:'braces'}];
  assert.deepEqual(selectSources(sources,{presentation:'showcase',locks:{dialect:true}},preferences),[1,3]);
  const styles=sources.map(s=>({...s,pane:s.style}));
  assert.deepEqual(selectSources(styles,{presentation:'showcase',locks:{style:true}},preferences),[2,3]);
  const shells=[{language:'powershell',os:'windows',shell:'powershell'},{language:'batch',os:'windows',shell:'cmd'},{language:'bash',os:'linux',shell:'bash'}];
  assert.deepEqual(selectSources(shells,{},preferences),[1]);
  assert.deepEqual(selectSources(shells,{presentation:'showcase',locks:{os:true,shell:true}},preferences),[0]);
  assert.throws(()=>markdown(':::compare {"presentation":"showcase","locks":{"style":"true"}}\n'+ '\x60\x60\x60kalm\nfun answer() -> Int = 42\n\x60\x60\x60\n:::', 'sample.md'),/Invalid property lock/);
});
