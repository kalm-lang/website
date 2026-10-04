import { resolve, dirname, relative } from 'node:path';
import MarkdownIt from 'markdown-it';
import { routes } from './routes.mjs';
import { repository } from './content.mjs';
import { code, escape } from './code.mjs';
import { tabsPlugin } from './tabs.mjs';
export { code, escape, repository };

export function markdown(source, sourcePath, namespace = 'article') {
  const md = new MarkdownIt({ html: false }).use(tabsPlugin);
  const slugs = new Map();
  let group = 0;
  md.renderer.rules.fence = (tokens, i) => code(tokens[i].content, tokens[i].info.trim().split(/\s/)[0]);
  md.renderer.rules.code_tabs = (tokens, i) => {
    const id = `${namespace}-tabs-${group++}`;
    return `<kalm-code-tabs>${tokens[i].children.map((token, index) => {
      const [language, ...label] = token.info.trim().split(/\s+/);
      return `<section id="${id}-${index}" data-label="${escape(label.join(' ') || language)}">${code(token.content, language)}</section>`;
    }).join('')}</kalm-code-tabs>`;
  };
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
    if (href?.startsWith('/source/')) throw new Error(`Repository file link in ${sourcePath}: ${href}`);
    if (href && !/^(https?:|mailto:|#|\/)/.test(href)) {
      const [file, fragment] = href.split('#');
      const path = relative(repository, resolve(repository, dirname(sourcePath), file));
      const route = routes.find(route => route.source === path);
      if (!route) throw new Error(`No website page for ${href} in ${sourcePath}`);
      tokens[i].attrSet('href', route.path + (fragment ? `#${fragment}` : ''));
    }
    return link(tokens, i, options, env, renderer);
  };
  return md.render(source.replace(/^# [^\n]+\n/, ''));
}
