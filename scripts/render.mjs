import { selectSources, initializeSources } from '../shared/source-selection.mjs';
import { resolve, dirname, relative } from 'node:path';
import MarkdownIt from 'markdown-it';
import { routes } from './routes.mjs';
import { repository } from './content.mjs';
import { code, escape } from './code.mjs';
import { tabsPlugin, sourceInfo } from './tabs.mjs';
import { icon } from '../shared/icons.mjs';
export { code, escape, repository };

export function markdown(source, sourcePath, namespace = 'article') {
  const md = new MarkdownIt({ html: false }).use(tabsPlugin);
  const slugs = new Map();
  let group = 0;
  md.renderer.rules.fence = (tokens, i) => {
    const {language, label} = sourceInfo(tokens[i].info);
    return code(tokens[i].content, language, label);
  };
  md.renderer.rules.code_tabs = (tokens, i) => {
    const id = `${namespace}-tabs-${group++}`;
    return `<kalm-code-tabs>${tokens[i].children.map((token, index) => {
      const primary = token.type === 'code_compare' ? token.children[0] : token;
      const {language, label: caption} = sourceInfo(primary.info);
      const filename = /\.[a-z0-9]+$/i.test(caption) ? caption : '';
      const body = token.type === 'code_compare' ? md.renderer.render([token], md.options, {}) : code(token.content, language, filename);
      return `<section id="${id}-${index}" data-label="${escape(caption || language)}">${body}</section>`;
    }).join('')}</kalm-code-tabs>`;
  };
  md.renderer.rules.code_compare = (tokens, i) => {
    const token = tokens[i];
    const id = `${namespace}-compare-${group++}`;
    const home = sourcePath.startsWith('content/home/');
    const explanation = (token.meta.scriptUnavailable ?? '').trim();
    const policy = escape(JSON.stringify(token.meta));
    const seen = new Set();
    return `<kalm-code-compare id="${id}"${home && token.meta.presentation !== 'showcase' ? ' data-home' : ''} data-policy="${policy}"${token.meta.presentation === 'showcase' ? ' data-layout="split"' : ''}>
      <div class="comparison-controls"></div><div class="comparison-panes">${token.children.filter(t => !home || token.meta.presentation === 'showcase' || !t.info.startsWith('java')).map((t,index) => {
        const {language,label,style,os,shell,pane,dialect} = sourceInfo(t.info);
        const suffix = seen.has(language) ? '-'+index : ''; seen.add(language);
        return `<section id="${id}-${language}${suffix}" data-language="${language}" data-style="${style || ''}" data-os="${os || ''}" data-shell="${shell || ''}" data-dialect="${dialect || ''}" data-pane="${escape(pane || '')}" aria-label="${escape(pane || (language === 'kalms' ? 'Kalm Script' : language === 'java' ? 'Java' : language === 'kalm' ? 'Kalm' : 'Terminal'))}">${code(t.content, language, token.meta.presentation === 'showcase' && pane ? pane : label)}</section>`;
      }).join('')}</div>${explanation ? `<p class="script-unavailable" hidden><strong>Kalm Script unavailable — showing Kalm</strong><span>${escape(explanation)}</span></p>` : ''}</kalm-code-compare><script>{const selectSources=${selectSources.toString()};(${initializeSources.toString()})(${JSON.stringify(id)},${JSON.stringify(token.meta).replaceAll('<','\\u003c')})}</script>`;
  };
  md.renderer.rules.code_dialect = (tokens, i) => `<div class="dialect-content" data-dialect="${tokens[i].meta.dialect}">${md.renderer.render(tokens[i].children, md.options, {})}</div>`;
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
    return `<a class="heading-anchor" aria-label="Link to this section" href="#${id}">${icon('link')}</a></${tokens[i].tag}>`;
  };
  md.renderer.rules.table_open = () => '<div class="table-scroll"><table>';
  md.renderer.rules.table_close = () => '</table></div>';
  const link = md.renderer.rules.link_open ?? ((tokens, i, options, env, renderer) => renderer.renderToken(tokens, i, options));
  md.renderer.rules.link_open = (tokens, i, options, env, renderer) => {
    const href = tokens[i].attrGet('href');
    if (href?.startsWith('/source/')) throw new Error(`Repository file link in ${sourcePath}: ${href}`);
    if (href && !/^(https?:|mailto:|#|\/)/.test(href)) {
      const [file, fragment] = href.split('#');
      const path = relative(repository, resolve(repository, dirname(sourcePath), file)).replaceAll('\\', '/');
      const route = routes.find(route => route.source === path);
      if (!route) throw new Error(`No website page for ${href} in ${sourcePath}`);
      tokens[i].attrSet('href', route.path + (fragment ? `#${fragment}` : ''));
    }
    return link(tokens, i, options, env, renderer);
  };
  return md.render(source.replace(/^# [^\n]+\n/, ''));
}
