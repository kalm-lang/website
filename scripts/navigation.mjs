import { escape } from './code.mjs';
import { routes, sectionLinks } from './routes.mjs';
import { icon } from '../shared/icons.mjs';

export function mainNavigation(section) {
  return `<nav id="site-navigation" class="nav-links" aria-label="Main navigation">${sectionLinks.map(item =>
    `<a href="${item.path}"${section === item.section ? ' aria-current="page"' : ''}>${icon(item.icon)}<span>${item.title}</span></a>`).join('')}</nav>`;
}
export function sidebar(route) {
  const items = routes.filter(item => item.section === route.section);
  const groups = route.section === 'docs' ? ['Handbook', 'Specifications'] : [...new Set(items.map(item => item.group))];
  const names = { docs: 'Docs topics', examples: 'Example topics', learn: 'Learning path' };
  const symbols = { docs: 'book-open', examples: 'code-xml', learn: 'route' };
  return `<details id="section-navigation" class="section-navigation" open>
    <summary class="section-menu" aria-label="${names[route.section]}">${icon(symbols[route.section])}
      <span>Topics</span>
      ${icon('chevron-down')}</summary>
    <nav class="sidebar-inner" aria-label="${escape(route.section)} navigation">
    ${groups.map(group => {
    const groupItems = items.filter(item => item.group === group);
    const link = (item, className = '') => `<a href="${item.path}"${item.path === route.path ? ' aria-current="page"' : ''}${className ? ` class="${className}"` : ''}>${escape(item.title)}</a>`;
    const links = groupItems.filter(item => !item.navSection).map(item => {
      const children = groupItems.filter(child => child.navSection === item.title);
      if (!children.length) return link(item);
      const expanded = item.path === route.path || children.some(child => child.path === route.path);
      return `<div class="nav-branch${expanded ? ' current-branch' : ''}"${expanded ? ' data-expanded' : ''}>
        <div class="nav-branch-header">${link(item, 'nav-parent')}<button class="nav-branch-toggle" type="button" aria-expanded="${expanded}" aria-label="${escape(item.title)} subtopics">${icon('chevron-down')}</button></div>
        <ul class="nav-children" aria-label="${escape(item.title)} topics">${children.map(child => `<li>${link(child, 'nav-child')}</li>`).join('')}</ul>
      </div>`;
    }).join('');
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
