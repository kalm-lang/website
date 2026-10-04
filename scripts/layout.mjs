import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { repository } from './content.mjs';
import { escape } from './code.mjs';
import { mainNavigation, sidebar, lessonNavigation } from './navigation.mjs';

const version = readFileSync(resolve(repository, 'pom.xml'), 'utf8').match(/<version>([^<]+)<\/version>/)[1];
export function layout(title, body, section = '') {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escape(title)} · Kalm</title>
  <meta name="description" content="Write Kalm. Explore small syntax examples, read the handbook, or follow a guided learning path.">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <script>try{const t=localStorage.getItem('kalm-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch{}</script>
  <style>:root{background:#f3e8d5;color:#30271f;color-scheme:light}:root[data-theme=dark]{background:#191c19;color:#ece5d7;color-scheme:dark}@media(prefers-color-scheme:dark){:root:not([data-theme=light]):not([data-theme=dark]){background:#191c19;color:#ece5d7;color-scheme:dark}}</style>
  <link rel="stylesheet" href="/src/styles/global.css">
  <script type="module" src="/src/main.ts"></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <a class="brand" href="/" aria-label="Kalm home">kalm<span class="brand-mark" aria-hidden="true"></span></a>
    <kalm-site-nav>${mainNavigation(section)}</kalm-site-nav>
    <kalm-theme-toggle></kalm-theme-toggle>
  </header>
  ${body}
  <footer class="site-footer">
    <a href="https://github.com/TD99/kalm">Made by TD99</a>
    <span>${escape(version)}</span>
  </footer>
</body>
</html>`;
}
export function article(route, body) {
  return `<main id="main" class="page-layout">
    <aside class="sidebar">${sidebar(route)}</aside>
    <article class="article${route.section === 'examples' ? ' example-article' : ''}">
      <header class="article-header"><h1>${escape(route.title)}</h1></header>
      <div class="prose">${body}</div>${lessonNavigation(route)}
    </article>
  </main>`;
}
