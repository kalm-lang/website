import {installHomeNavigation} from '../shared/home-navigation.mjs';
import {restoreSidebar} from '../shared/sidebar.mjs';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {capabilities, repository} from './content.mjs';
import {escape} from './code.mjs';
import {lessonNavigation, mainNavigation, sidebar} from './navigation.mjs';
import {icon} from '../shared/icons.mjs';
import {applyPreferences} from '../shared/preferences.mjs';
import {setupWizard} from './setup-wizard.mjs';

const version = JSON.parse(readFileSync(resolve(repository, 'package.json'), 'utf8')).kalmVersion;
export function layout(title, body, section = '') {
  return `<!doctype html>
<html lang="en" data-code-capabilities="${escape(JSON.stringify(capabilities))}">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title === 'Kalm' ? 'Kalm' : `${escape(title)} · Kalm`}</title>
  <meta name="description" content="Write Kalm. Explore small syntax examples, read the handbook, or follow a guided learning path.">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <script>document.documentElement.dataset.jsEnhanced='';try{const p=sessionStorage.getItem('kalm-home-to-section');sessionStorage.removeItem('kalm-home-to-section');if(p===location.pathname){document.documentElement.dataset.homeToSection='';addEventListener('pagehide',()=>delete document.documentElement.dataset.homeToSection,{once:true})}}catch{}if(location.pathname==='/'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.dataset.homeIntro='';document.documentElement.dataset.homeScrollbarFade=''}(${applyPreferences.toString()})();(${installHomeNavigation.toString()})();try{const t=localStorage.getItem('kalm-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;document.documentElement.dataset.scrollbarStyle=localStorage.getItem('kalm-scrollbar')==='native'?'native':'custom'}catch{}</script>
  <style>:root{background:#f3e8d5;color:#30271f;color-scheme:light}:root[data-theme=dark]{background:#191c19;color:#ece5d7;color-scheme:dark}@media(prefers-color-scheme:dark){:root:not([data-theme=light]):not([data-theme=dark]){background:#191c19;color:#ece5d7;color-scheme:dark}}html[data-home-intro] .setup-wizard,html[data-home-intro] .home .hero h1,html[data-home-intro] .home .hero-description,html[data-home-intro] .home .hero .actions .button,html[data-home-intro] .home .hero-sample,html[data-home-intro] .home .notes-section .section-heading,html[data-home-intro] .home .feature,html[data-home-intro] .home .start-box .section-heading,html[data-home-intro] .home .start-content>*{visibility:hidden}</style>
  <link rel="stylesheet" href="/src/styles/global.css">
  <script type="module" src="/src/main.ts"></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="site-header-inner">
    <a class="brand" href="/" aria-label="Kalm home">kalm</a>
    ${section ? `<button class="topic-trigger" type="button" aria-label="Browse ${section} topics" title="Browse ${section} topics" aria-expanded="false" aria-controls="section-navigation">${icon({ docs: 'book-open', examples: 'code-xml', learn: 'route' }[section])}</button>` : ''}
    <kalm-site-nav><button class="menu-button" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="site-navigation">${icon('menu')}<span>Menu</span></button>${mainNavigation(section)}</kalm-site-nav>
    <kalm-settings-menu><button class="settings-trigger" type="button" aria-label="Settings"
      title="Settings" aria-expanded="false" aria-controls="settings-popover">${icon('settings')}</button></kalm-settings-menu>
    </div>
  </header>
  ${setupWizard()}
  ${body}
  <footer class="site-footer">
    <a href="https://github.com/kalm-lang">kalm-lang</a>
    <span>${escape(version)}</span>
  </footer>
  <div class="document-scrollbar" aria-hidden="true"><div class="document-scrollbar-thumb"></div></div>
</body>
</html>`;
}
export function article(route, body) {
  return `<main id="main" tabindex="0" class="page-layout">
    <aside class="sidebar" data-section="${route.section}">${sidebar(route)}</aside><script>(${restoreSidebar.toString()})(${JSON.stringify(route.section)},true)</script>
    <article class="article${route.section === 'examples' ? ' example-article' : ''}">
      <header class="article-header"><h1>${escape(route.title)}</h1></header>
      <div class="prose">${body}</div>${lessonNavigation(route)}
    </article>
  </main>`;
}
