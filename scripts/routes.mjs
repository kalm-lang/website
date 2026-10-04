import { discoverSection, specifications } from './content.mjs';

export const routes = [
  ...discoverSection('docs'), ...specifications(),
  ...discoverSection('examples'), ...discoverSection('learn'),
];
const seen = new Set();
for (const route of routes) {
  if (seen.has(route.path)) throw new Error(`Duplicate route: ${route.path}`);
  seen.add(route.path);
}
export const sectionLinks = [
  { section: 'docs', path: '/docs/quick-start/', title: 'docs', icon: 'book-open' },
  { section: 'examples', path: '/examples/', title: 'examples', icon: 'code-xml' },
  { section: 'learn', path: '/learn/', title: 'learn', icon: 'route' },
];
