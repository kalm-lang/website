import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { latestVersion } from '@kalm-lang/specification';
import { version as documentationVersion } from '@kalm-lang/documentation';
import { routes } from './routes.mjs';
import { validateCatalog, validateContent } from './validate-content.mjs';
import { redirects } from './redirects.mjs';

validateContent(routes);
validateCatalog(routes);
const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
assert.equal(latestVersion, manifest.kalmVersion, 'website must use the matching final specification');
assert.equal(documentationVersion, manifest.kalmVersion, 'website must use matching documentation');
assert.ok(routes.some(route => route.specification && route.status === 'final' && route.version === latestVersion));
assert.ok(routes.some(route => route.path === '/examples/match/'));
assert.ok(redirects().some(([from, to]) => from === '/examples/choose/' && to === '/examples/match/'));
console.log(`Validated ${routes.length} content routes for Kalm ${latestVersion}`);

assert(routes.some(route => route.path === `/docs/specifications/${latestVersion}/changes/`));
