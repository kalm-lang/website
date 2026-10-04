import { readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { routes } from './routes.mjs';
import { repository, markdown, sourceLink } from './render.mjs';
import { layout, article } from './layout.mjs';
import { home } from './home.mjs';
import { exampleSources } from './examples.mjs';
rmSync('.generated', { recursive: true, force: true });
rmSync('public/source', { recursive: true, force: true });
mkdirSync('.generated', { recursive: true });
sourceLink('LICENSE');
writeFileSync('.generated/index.html', layout('A compact language for the JVM', home()));
for (const route of routes) {
  const source = readFileSync(resolve(repository, route.source), 'utf8');
  const target = resolve('.generated', `.${route.path}`, 'index.html');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, layout(route.title, article(route, markdown(source, route.source) + (route.project ? exampleSources(route.project) : ''))));
}
console.log(`Generated ${routes.length + 1} pages from repository sources.`);
