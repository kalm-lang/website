import * as documentation from '@kalm-lang/documentation';
import * as specification from '@kalm-lang/specification';
import {resolve} from 'node:path';
import {contentCapabilities} from './capabilities.mjs';

const { documents, assets = {} } = documentation;
const { versions = {}, drafts = {} } = specification;
export const capabilities = contentCapabilities(documents);

// Logical package paths are stable across installations and support authored relative links.
export const repository = resolve(import.meta.dirname, '..');
export const contentRoot = 'content';
export function readDocument(file) {
  const key = file.replaceAll('\\', '/');
  const record = documents[key];
  if (!record) throw new Error(`Missing packaged documentation: ${key}`);
  return { ...record.metadata, content: record.content, source: record.file };
}
export function contentFiles(section) {
  return Object.keys(documents).filter(file => file.startsWith(`content/${section}/`));
}
export function catalog() { return assets['content/examples/topics.json']; }
export function discoverSection(section) {
  return contentFiles(section).map(file => {
    const document = readDocument(file);
    const slug = file.slice(`content/${section}/`.length).replace(/\.md$/, '').replace(/\/index$/, '');
    return { ...document, path: `/${section}/${slug === 'index' ? '' : `${slug}/`}`, section,
      group: section === 'docs' ? 'Handbook' : document.group ?? section };
  }).sort((a, b) => a.order - b.order || a.path.localeCompare(b.path));
}
export const specificationAliases = [];
export function specifications() {
  specificationAliases.length = 0;
  const finalVersions = new Set(Object.values(versions).map(record => record.metadata.version));
  const all = [...Object.values(versions), ...Object.values(drafts)];
  const routes = all.map(record => {
    const { version, status } = record.metadata;
    const final = status === 'final';
    const path = `/docs/specifications/${version}${final ? '' : '-' + status}/`;
    const short = version.replace(/\.0$/, '');
    if (final || !finalVersions.has(version)) specificationAliases.push([`/docs/specifications/${short}/`, path]);
    return { title: `${version}${final ? '' : ' ' + status}`, version, status, order: 0, path,
      source: `specification/${record.file}`, content: record.markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').replace(/^\s*# [^\n]+\r?\n/, ''),
      section: 'docs', group: 'Specifications', specification: true };
  });
  return routes.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }) || (a.status === 'final' ? -1 : b.status === 'final' ? 1 : a.status.localeCompare(b.status)));
}
