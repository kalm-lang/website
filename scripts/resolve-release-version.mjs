import { readFile } from 'node:fs/promises';

function fail(message) {
  if (process.env.GITHUB_ACTIONS === 'true') {
    const annotation = message.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
    console.error(`::error title=Website release selection failed::${annotation}`);
  }
  throw new Error(message);
}

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const statusPattern = /^[a-z][a-z0-9-]*$/;
const eventName = process.env.EVENT_NAME;
const tagName = process.env.WEBSITE_TAG ?? '';
let version;
let status;

if (eventName === 'push') {
  const match = /^v((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))(?:-([a-z][a-z0-9-]*))?$/.exec(tagName);
  if (!match) fail(`Tag ${tagName || '(empty)'} must use vX.Y.Z with an optional -status suffix`);
  version = match[1];
  status = match[2] ?? 'final';
  if (status === 'final') fail('Final releases omit the -final tag suffix');
} else {
  const defaultVersion = String(packageJson.kalmVersion ?? '').split(/[+-]/, 1)[0];
  version = process.env.INPUT_VERSION?.trim() || defaultVersion;
  if (!versionPattern.test(version)) {
    fail(`Website release version must use X.Y.Z; received: ${version || '(empty)'}`);
  }
  status = (process.env.INPUT_STATUS?.trim() ?? '').replace(/^-/, '') || 'final';
  if (!statusPattern.test(status)) fail(`Invalid release status: ${status}`);
  if (status === 'final' && process.env.INPUT_STATUS?.trim().startsWith('-')) {
    fail('Final releases omit the -final status suffix');
  }
}

const releaseVersion = `${version}${status === 'final' ? '' : `-${status}`}`;
const tag = `v${releaseVersion}`;
if (eventName === 'push' && tagName !== tag) fail(`Tag ${tagName} does not match resolved website version ${tag}`);

console.log(`version=${version}`);
console.log(`status=${status}`);
console.log(`release_version=${releaseVersion}`);
console.log(`prerelease=${status === 'final' ? 'false' : 'true'}`);
console.log(`tag=${tag}`);
