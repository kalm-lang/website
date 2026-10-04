import { escape } from './code.mjs';
import { routes, sectionLinks } from './routes.mjs';

export function mainNavigation(section) {
  return `<nav id="site-navigation" class="nav-links" aria-label="Main navigation">${sectionLinks.map(item =>
    `<a href="${item.path}"${section === item.section ? ' aria-current="page"' : ''}>${item.title}</a>`).join('')}</nav>`;
}
export function sidebar(route) {
  const items = routes.filter(item => item.section === route.section);
  const groups = route.section === 'docs' ? ['Handbook', 'Specifications'] : [...new Set(items.map(item => item.group))];
  return `<nav class="sidebar-inner" aria-label="${escape(route.section)} navigation">${groups.map(group => {
    const links = items.filter(item => item.group === group).map(item =>
      `<a href="${item.path}"${item.path === route.path ? ' aria-current="page"' : ''}${item.navSection ? ' class="nav-child"' : ''}>${escape(item.title)}</a>`).join('');
    return `<section class="nav-group"><h2>${escape(group === 'learn' ? 'Learning path' : group)}</h2>${links}</section>`;
  }).join('')}</nav>`;
}
export function lessonNavigation(route) {
  if (!route.lesson) return '';
  const lessons = routes.filter(item => item.lesson).sort((a, b) => a.lesson - b.lesson);
  const index = lessons.indexOf(route);
  const previous = lessons[index - 1];
  const next = lessons[index + 1];
  return `<nav class="lesson-navigation" aria-label="Learning path">
    <a href="${previous?.path ?? '/learn/'}">← ${escape(previous?.title ?? 'Learning path')}</a>
    <a href="${next?.path ?? '/learn/complete/'}">${escape(next?.title ?? 'Finish the path')} →</a></nav>`;
}
