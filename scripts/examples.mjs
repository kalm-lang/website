import { readdirSync, readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { code, escape, repository, sourceLink } from './render.mjs';

function sources(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? sources(path) : /\.(kalm|java)$/.test(entry.name) ? [path] : [];
  });
}
export function exampleSources(project) {
  const root = resolve(repository, 'examples', project);
  const files = sources(resolve(root, 'src')).sort();
  return `<h2 id="source-files">Read the source</h2><p>These files come directly from the runnable project. Choose a file, copy it, or open its plain source.</p>
<kalm-source-tabs>${files.map((file, i) => {
    const name = relative(root, file);
    const repoPath = relative(repository, file);
    return `<section id="source-${i}" data-file="${escape(name)}"><p style="padding:0 1rem"><a href="${sourceLink(repoPath)}">${escape(name)} ↗</a></p>${code(readFileSync(file, 'utf8'), file.endsWith('.java') ? 'java' : 'kalm')}</section>`;
  }).join('')}</kalm-source-tabs>`;
}
