import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { routes } from './routes.mjs';
import { markdown } from './render.mjs';
import { layout, article } from './layout.mjs';
import { home } from './home.mjs';
import { redirects, redirectPage } from './redirects.mjs';
import { validateContent, validateCatalog } from './validate-content.mjs';

validateContent(routes);
validateCatalog(routes);
rmSync('.generated', { recursive: true, force: true });
rmSync('public/source', { recursive: true, force: true });
function output(path, html) {
  const target = resolve('.generated', `.${path}`, 'index.html');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html);
}
output('/', layout('Kalm', home()));
for (const route of routes) output(route.path, layout(route.title,
  article(route, markdown(route.content, route.source)), route.section));
for (const [path, target] of redirects()) output(path, redirectPage(target));
console.log(`Generated ${routes.length + 1} Markdown pages and ${redirects().length} redirects.`);
