import { readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { routes } from './routes.mjs';
import { repository, markdown, sourceLink, code } from './render.mjs';
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
  const pieces = source.split(/\{\{source:([^}]+)\}\}/);
  const rendered = pieces.map((piece, index) => index % 2 === 0 ? markdown(piece, route.source)
    : code(readFileSync(resolve(repository, piece), 'utf8'), piece.endsWith('.java') ? 'java' : 'kalm')).join('');
  const lessons = routes.filter(item => item.lesson);
  const previous = lessons.find(item => item.lesson === route.lesson - 1);
  const next = lessons.find(item => item.lesson === route.lesson + 1);
  const navigation = route.lesson ? `<nav class="lesson-navigation" aria-label="Tutorial lessons">
    <a href="${previous?.path ?? '/tutorial/'}">← ${previous?.title ?? 'Learning path'}</a>
    <a href="${next?.path ?? '/examples/task-report/'}">${next?.title ?? 'Explore the source'} →</a></nav>` : '';
  const target = resolve('.generated', `.${route.path}`, 'index.html');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, layout(route.title, article(route, rendered + (route.project ? exampleSources(route.project) : ''), navigation)));
}
console.log(`Generated ${routes.length + 1} pages from repository sources.`);
