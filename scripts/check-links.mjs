import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

function htmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(path) : entry.name.endsWith('.html') ? [path] : [];
  });
}
const errors = [];
for (const file of htmlFiles('dist')) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const href = match[1];
    if (/^(https?:|data:|mailto:)/.test(href)) continue;
    const [url, fragment] = href.split('#');
    let target = !url ? file : url.startsWith('/') ? resolve('dist', `.${url}`) : resolve(dirname(file), url);
    if (existsSync(target) && statSync(target).isDirectory()) target = resolve(target, 'index.html');
    if (!existsSync(target)) { errors.push(`${file}: missing ${href}`); continue; }
    if (fragment && target.endsWith('.html')) {
      const body = readFileSync(target, 'utf8');
      if (!body.includes(`id="${decodeURIComponent(fragment)}"`)) errors.push(`${file}: missing anchor ${href}`);
    }
  }
}
if (errors.length) throw new Error(errors.join('\n'));
console.log('All internal pages, assets, and heading anchors resolve.');
