import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
function htmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(path) : entry.name.endsWith('.html') ? [path] : [];
  });
}
const errors = [];
for (const file of htmlFiles('dist')) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(/(?:href|src)="([^"#]+)(?:#[^"]*)?"/g)) {
    const url = match[1].split('#')[0];
    if (/^(https?:|data:|mailto:)/.test(url)) continue;
    if (!existsSync(resolve('dist', `.${url}`))) errors.push(`${file}: missing ${url}`);
  }
}
if (errors.length) throw new Error(errors.join('\n'));
console.log('All generated internal links and assets resolve.');
