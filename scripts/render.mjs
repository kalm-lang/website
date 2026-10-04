import { readFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import MarkdownIt from 'markdown-it';
import { createHighlighter } from 'shiki';
import { routes } from './routes.mjs';

export const repository = resolve('..');
export const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const grammar = JSON.parse(readFileSync(resolve(repository, 'extensions/vscode-kalm/syntaxes/kalm.tmLanguage.json'), 'utf8'));
const highlighter = await createHighlighter({ themes: ['github-light', 'github-dark'], langs: [{ ...grammar, name: 'kalm' }, 'java', 'bash', 'xml', 'kotlin', 'json'] });
export function code(source, language = 'kalm') {
  const lang = highlighter.getLoadedLanguages().includes(language) ? language : 'text';
  return `<kalm-code-block>${highlighter.codeToHtml(source.trimEnd(), { lang, themes: { light: 'github-light', dark: 'github-dark' } })}</kalm-code-block>`;
}
export function sourceLink(path) {
  const absolute = resolve(repository, path);
  if (!absolute.startsWith(repository + '/')) throw new Error(`Source escapes repository: ${path}`);
  const target = resolve('public/source', path);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(absolute, target);
  return `/source/${path}`;
}
export function markdown(source, sourcePath) {
  const md = new MarkdownIt({ html: false });
  const slugs = new Map();
  md.renderer.rules.fence = (tokens, i) => code(tokens[i].content, tokens[i].info.trim().split(/\s/)[0]);
  md.renderer.rules.heading_open = (tokens, i) => {
    const base = tokens[i + 1].content.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
    const count = slugs.get(base) ?? 0;
    slugs.set(base, count + 1);
    const id = count ? `${base}-${count}` : base;
    tokens[i].attrSet('id', id);
    return `<${tokens[i].tag} id="${id}">`;
  };
  md.renderer.rules.heading_close = (tokens, i) => {
    const id = tokens[i - 2].attrGet('id');
    return `<a class="heading-anchor" aria-label="Link to this section" href="#${id}">#</a></${tokens[i].tag}>`;
  };
  md.renderer.rules.table_open = () => '<div class="table-scroll"><table>';
  md.renderer.rules.table_close = () => '</table></div>';
  const link = md.renderer.rules.link_open ?? ((tokens, i, options, env, renderer) => renderer.renderToken(tokens, i, options));
  md.renderer.rules.link_open = (tokens, i, options, env, renderer) => {
    const href = tokens[i].attrGet('href');
    if (href && !/^(https?:|mailto:|#|\/)/.test(href)) {
      const [file, fragment] = href.split('#');
      const path = relative(repository, resolve(repository, dirname(sourcePath), file));
      const route = routes.find(route => route.source === path);
      tokens[i].attrSet('href', (route?.path ?? sourceLink(path)) + (fragment ? `#${fragment}` : ''));
    }
    return link(tokens, i, options, env, renderer);
  };
  return md.render(source.replace(/^# [^\n]+\n/, ''));
}
