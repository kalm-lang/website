import { defineConfig } from 'vite';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

function pages(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? pages(path) : entry.name.endsWith('.html') ? [path] : [];
  });
}

export default defineConfig({
  root: '.generated',
  publicDir: '../public',
  resolve: { alias: { '/src': resolve('src') } },
  server: { fs: { allow: [resolve('..')] } },
  build: { outDir: '../dist', emptyOutDir: true, rollupOptions: { input: pages('.generated') } },
});
