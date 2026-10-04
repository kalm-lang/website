import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';

export const repository = resolve(import.meta.dirname, '../..');
export const contentRoot = resolve(repository, 'website/content');
export function readDocument(file) {
  const source = readFileSync(file, 'utf8');
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) throw new Error(`Missing JSON front matter: ${file}`);
  const metadata = JSON.parse(match[1]);
  if (typeof metadata.title !== 'string' || !metadata.title.trim() || !Number.isFinite(metadata.order)) {
    throw new Error(`Document needs a title and numeric order: ${file}`);
  }
  return { ...metadata, content: source.slice(match[0].length), source: relative(repository, file).replaceAll('\\', '/') };
}
function documents(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = resolve(directory, entry.name);
    return entry.isDirectory() ? documents(file) : entry.name.endsWith('.md') ? [file] : [];
  });
}
export function discoverSection(section) {
  return documents(resolve(contentRoot, section)).map(file => {
    const document = readDocument(file);
    const slug = relative(resolve(contentRoot, section), file).replaceAll('\\', '/').replace(/\.md$/, '').replace(/\/index$/, '');
    const path = `/${section}/${slug === 'index' ? '' : `${slug}/`}`;
    return { ...document, path, section, group: section === 'docs' ? 'Handbook' : document.group ?? section };
  }).sort((a, b) => a.order - b.order || a.path.localeCompare(b.path));
}
export function specifications() {
  const directories = [repository, resolve(repository, 'specifications')].filter(existsSync);
  return directories.flatMap(directory => readdirSync(directory).flatMap(file => {
    const match = file.match(/^Kalm-Language-Specification-v(\d+(?:\.\d+)*)(-draft)?\.md$/);
    if (!match) return [];
    const source = relative(repository, resolve(directory, file)).replaceAll('\\', '/');
    return [{ title: `${match[1]}${match[2] ? ' draft' : ''}`, version: match[1], order: 0,
      path: `/docs/specifications/${match[1]}/`, source,
      content: readFileSync(resolve(repository, source), 'utf8').replace(/^# [^\n]+\n/, ''),
      section: 'docs', group: 'Specifications', specification: true }];
  })).sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
}
