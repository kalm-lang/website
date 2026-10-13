import MarkdownIt from 'markdown-it';
import {catalog} from './content.mjs';
import {fences, tabsPlugin} from './tabs.mjs';

export function validateContent(routes) {
  const md = new MarkdownIt().use(tabsPlugin);
  for (const route of routes) {
    if (typeof route.group !== 'string' || !route.group.trim()) throw new Error(`Missing navigation group: ${route.source}`);
    const fail = message => { throw new Error(`${route.source}: ${message}`); };
    if (/\{\{source:|(?:\.\.\/)*examples\/.*(?:README|src\/)/.test(route.content)) fail('Repository content references are not website links');
    const allTokens = md.parse(route.content, {});
    for (const dialect of ['kalm', 'kalms']) {
      const expand = tokens => tokens.flatMap(token => token.type === 'code_dialect'
        ? token.meta.dialect === dialect ? expand(token.children) : [] : [token]);
      const tokens = expand(allTokens);
      if (!route.specification) {
        const prose = tokens.filter(token => token.type === 'inline').map(token => token.content).join(' ');
        if (prose.split(/\s+/).length > 800) fail('Split this article: over 800 prose words');
        if (tokens.filter(token => token.type === 'heading_open' && token.tag === 'h2').length > 6) fail('Split this article: over six main sections');
      }
      if (route.section === 'examples' && route.path !== '/examples/') {
        const words = tokens.filter(token => token.type === 'inline').map(token => token.content).join(' ').split(/\s+/);
        if (words.length > 80) fail('Keep example explanations to 80 words or fewer');
        const code = tokens.filter(token => ['fence', 'code_tabs', 'code_compare'].includes(token.type));
        if (code.length !== 1) fail('Examples need one code block or one tab group');
        if (fences(code, dialect, 'all').some(token => token.content.trim().split('\n').length > 40)) fail('Keep example snippets to 40 lines or fewer');
      }
      if (route.lesson && (!Number.isInteger(route.lesson) || route.lesson < 1)) fail('Invalid lesson number');
    }
  }
  const lessons = routes.filter(route => route.lesson).map(route => route.lesson).sort((a, b) => a - b);
  if (lessons.some((lesson, index) => lesson !== index + 1)) throw new Error('Lessons must form a consecutive path');
}

export function validateCatalog(routes) {
  const topics = catalog();
  if (topics === undefined) return; // Older bundles may omit the optional coverage catalog.
  const published = routes.filter(route => route.section === 'examples' && route.path !== '/examples/')
    .map(route => route.path.split('/').filter(Boolean).at(-1)).sort();
  if (JSON.stringify(topics) !== JSON.stringify(published)) {
    throw new Error('Example topic coverage differs from content/examples/topics.json');
  }
}
