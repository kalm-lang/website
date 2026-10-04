import { routes } from './routes.mjs';
import { escape } from './code.mjs';
import { layout } from './layout.mjs';

export function redirects() {
  const specification = routes.find(route => route.specification);
  const lesson = number => routes.find(route => route.lesson === number)?.path ?? '/learn/';
  return [
    ['/docs/', '/docs/quick-start/'], ['/docs/specification/', specification.path],
    ['/docs/audit/', '/docs/status/'], ['/tutorial/', '/learn/'],
    ...['01-hello', '02-values', '03-models', '04-interop', '05-tasks', '06-report'].map((slug, index) =>
      [`/tutorial/${slug}/`, lesson([1, 2, 6, 7, 8, 8][index])]),
    ['/examples/hello/', '/examples/functions/'], ['/examples/mixed/', '/examples/java-calls/'],
    ['/examples/task-report/', '/learn/'],
  ].filter(([, target]) => routes.some(route => route.path === target));
}
export function redirectPage(target) {
  return layout('Continue to Kalm', `<main id="main" class="redirect"><h1>This page has moved</h1>
    <p><a href="${escape(target)}">Continue →</a></p></main>`)
    .replace('<head>', `<head><meta http-equiv="refresh" content="0;url=${escape(target)}">`);
}
