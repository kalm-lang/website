import { escape } from './code.mjs';
import { routes, sectionLinks } from './routes.mjs';
import { icon } from '../shared/icons.mjs';

export function mainNavigation(section) {
  return `<nav id="site-navigation" class="nav-links" aria-label="Main navigation">${sectionLinks.map(item =>
    `<a href="${item.path}"${section === item.section ? ' aria-current="page"' : ''}>${item.title}</a>`).join('')}</nav>`;
}
export function sidebar(route) {
  const items = routes.filter(item => item.section === route.section);
  const groups = route.section === 'docs' ? ['Handbook', 'Specifications'] : [...new Set(items.map(item => item.group))];
  const names = { docs: 'Docs topics', examples: 'Example topics', learn: 'Learning path' };
  const symbols = { docs: 'book-open', examples: 'code-xml', learn: 'route' };
  return `<details class="section-navigation" open>
    <summary class="section-menu">${icon(symbols[route.section])}
      <span><span class="section-menu-label">${names[route.section]}</span><span class="sidebar-current">${escape(route.title)}</span></span>
      ${icon('chevron-down')}</summary>
    <nav class="sidebar-inner" aria-label="${escape(route.section)} navigation">${groups.map(group => {
    const links = items.filter(item => item.group === group).map(item =>
      `<a href="${item.path}"${item.path === route.path ? ' aria-current="page"' : ''}${item.navSection ? ' class="nav-child"' : ''}>${escape(item.title)}</a>`).join('');
    return `<section class="nav-group"><h2>${escape(group === 'learn' ? 'Learning path' : group)}</h2>${links}</section>`;
  }).join('')}</nav></details>`;
}
export function lessonNavigation(route) {
  if (!route.lesson) return '';
  const lessons = routes.filter(item => item.lesson).sort((a, b) => a.lesson - b.lesson);
  const index = lessons.indexOf(route);
  const previous = lessons[index - 1];
  const next = lessons[index + 1];
  return `<nav class="lesson-navigation" aria-label="Learning path">
    <a href="${previous?.path ?? '/learn/'}">${icon('arrow-left')}<span>${escape(previous?.title ?? 'Learning path')}</span></a>
    <a href="${next?.path ?? '/learn/complete/'}"><span>${escape(next?.title ?? 'Finish the path')}</span>${icon('arrow-right')}</a></nav>`;
}
