import { escape } from './render.mjs';
import { routes } from './routes.mjs';
export function layout(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(title)} · Kalm</title><meta name="description" content="Kalm: explicit nullability, expressive syntax, and ordinary Java interoperability. Learn the JVM language through runnable examples.">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><script>try{const t=localStorage.getItem('kalm-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch{}</script>
<script type="module" src="/src/main.ts"></script></head><body><a class="skip-link" href="#main">Skip to content</a>
<header class="site-header"><a class="brand" href="/" aria-label="Kalm home">kalm<span>_</span></a><span class="header-version">0.1.0-SNAPSHOT / JVM 25+</span>
<kalm-site-nav><nav class="nav-links" aria-label="Main navigation"><a href="/docs/quick-start/">docs</a><a href="/examples/">examples</a><a href="/tutorial/">learn</a></nav></kalm-site-nav><kalm-theme-toggle></kalm-theme-toggle></header>
${body}<footer class="site-footer"><span>kalm / ordinary JVM bytecode / MIT</span><div><a href="/docs/quick-start/">start here</a> · <a href="/examples/">read the code</a> · <a href="/source/LICENSE">license</a></div><span>draft language, honest boundaries.</span></footer></body></html>`;
}
export function article(route, body, navigation = '') {
  const group = route.group === 'tutorial' ? 'tutorial' : 'docs';
  const sidebar = routes.filter(item => item.group === group || item.group === 'reference' || item.group === 'examples');
  return `<main id="main" class="page-layout"><aside class="sidebar"><div class="sidebar-inner"><p class="eyebrow">${group === 'tutorial' ? 'learning path' : 'field manual'}</p>${sidebar.map(item => `<a href="${item.path}" ${item.path === route.path ? 'aria-current="page"' : ''}>${escape(item.title)}</a>`).join('')}</div></aside><article class="article"><header class="article-header"><span class="eyebrow">${escape(route.path)}</span><h1>${escape(route.title)}</h1></header><div class="prose">${body}</div>${navigation}</article></main>`;
}
