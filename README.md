# Kalm website

Static multipage documentation built with Lit, TypeScript, Markdown-it, and Vite.
Requires Node 22.12 or newer.

Run in `website/`:

```sh
npm install --no-package-lock
npm run dev
npm run check
npm run test:content
npm run build
npm test
npm run verify:code
```

Install Chromium once with `npx playwright install chromium`. `verify:code`
requires a full JDK 25+ and published compiler/runtime/standard-library JARs, resolved by Maven.
It compiles all example and homepage snippets, exercises each cumulative lesson,
and checks native tests plus the completed CLI's counts and failure behavior.
Temporary compilation outputs are removed afterward.
Set `KALM_TEST_BROWSER_CHANNEL=msedge` to run browser checks with an installed
Microsoft Edge when bundled Chromium is unavailable.

## Production deployment

The **Website checks** workflow runs the full site gates on branch pushes and pull requests, and can also be started manually. The **Release website** workflow runs the same gates for version tags before deploying. Push a `v<SemVer>` tag (for example,
`v1.2.3` or `v1.2.3-rc.1+build.7`) to deploy that tag's site.
Malformed version tags fail before dependency installation. Type, content, build/link, browser, or deployment errors stop the release; the fiddle is not built or deployed.

After the build passes, the deployment job uses the `prod` GitHub environment
and its `DESTINATION_FTP_HOST`, `DESTINATION_FTP_PASSWORD`, `DESTINATION_FTP_PORT`,
and `DESTINATION_FTP_USER` secrets. Deployments share a concurrency group so active
FTP uploads cannot overlap or be cancelled by a newer release.

The destination is the FTP account's `/`, using passive FTP. The server must support
`MLSD` directory listings, including dotfiles. Before any remote deletion or upload,
the script requires a readable regular file `/.github_deployment_root`, validates
the build, and inventories the destination. Missing markers or an unreadable marker
abort before touching the staging directory. Create the marker on the server yourself;
deployment never creates it.

After verifying the marker, deployment deletes and recreates `/.deployment`, then
uploads the complete website there. If a staging transfer fails, the live site stays
untouched and the partial staging directory is cleared by the next attempt. Once all
files are staged, deployment inventories the live site, removes its old files, moves
the staged files into `/`, and removes `/.deployment`. A build entry named
`.deployment` is excluded from deployment so it cannot overwrite the staging area.

It preserves root `/_imports/` recursively, the marker, `.ht*` entries (including
`.htaccess`, `.htpasswd`, `.htgroups`, and their backups), and `.user.ini` at every
depth. Parent directories containing preserved files also remain. These paths are
excluded from uploads, so build files cannot overwrite them. All other files,
including other dotfiles, are eligible for removal. Cleanup and promotion are
sequential, so the site can be briefly incomplete after the new build is staged; an
error during cleanup or promotion may require rerunning the release job.

Run the deployment safety checks locally from the repository root:

```sh
python3 -m unittest discover -s scripts -p 'test_deploy_website.py'
```

## Content

- `@kalm-lang/documentation`: the canonical handbook, examples, lessons, homepage Markdown, and supporting catalog/grammar.
- Logical `content/docs/`: Handbook articles.
- `content/examples/`: short syntax topics; `topics.json` records catalog coverage.
- `content/learn/`: the ordered text-statistics learning path and completion page.
- `content/home/`: greeting, learning preview, and expandable language-note snippets.
- `@kalm-lang/specification`: canonical final/non-final specification editions.

Pages and navigation are discovered from the installed package APIs. This repository contains no canonical documentation Markdown. A filename determines its URL;
`index.md` represents the section root. Front matter uses JSON, a YAML-compatible
subset, so metadata needs no additional parser dependency:

```markdown
---
{
  "title": "Nullable types",
  "order": 9,
  "group": "Values"
}
---

A nullable value can be absent.
```

`title` and numeric `order` are required. Example `group` values organize the
sidebar; Docs always uses Handbook and Specifications. Learn lessons also have a
consecutive `lesson` number. Optional `navSection` groups articles under their Handbook parent.
The footer version comes from the pinned `kalmVersion` in package.json.

Homepage notes also declare an `icon` from the curated Lucide set in
`shared/icons.mjs` and a `doc` website URL. Icons and code headers render at build
time; browser controls enhance that HTML. On mobile, a Topics button in the sticky
header opens navigation with collapsible subtopics. Native topic
disclosures leave navigation available without JavaScript.

Use fenced code with its language and optional filename. Programming examples use
comparison groups described below. File tabs hold cooperating files; syntax and
language demonstrations use fixed, labeled showcase panes.

Example verification treats tabs as one source set by default. Set
`"verify": "alternatives"` for independently compiled variants, or
`"verify": "test"` for native test snippets. Use filenames such as
`Greeting.kalm` and `Caller.java` for joint compilation and public type declarations.
Lesson fences require filenames; successive lessons replace or add those files.

Build checks reject broken website links, source-file fallbacks, articles over
800 prose words or six main sections, and examples with more than 80 explanatory
words or 40 lines per snippet. Specifications are exempt from article limits.
Raw repository-file browsing and publishing are not part of this website.

## Architecture

`scripts/` separates discovery, rendering, navigation, page layouts, validation,
and redirects. Generated pages go into ignored `.generated/`; Vite emits `dist/`.
Styles load directly in each page's head. Browser components enhance code copying,
tabs, and appearance controls; the mobile menu preserves its generated navigation links.
The custom document scrollbar keeps native document scrolling and is enabled by
default on desktop layouts. Phone layouts use the native scrollbar and omit its
appearance setting. The desktop switch saves a device-local preference;
dialogs and navigation menus retain platform scrollbars.
Main content receives focus only through an explicit Tab or skip-link action.
Articles, code, and native disclosure cards remain readable without JavaScript.

Update the pinned documentation package to consume content changes, then restart `npm run dev`. Production builds regenerate all
pages. To run the navigation first-paint checks against Vite development mode:

```sh
KALM_TEST_SERVER=dev npm test -- tests/first-paint.spec.mjs
```

Configure [GitHub Packages authentication](https://github.com/kalm-lang/tools/blob/main/docs/bootstrap.md) before installing packages. The initial package versions must be published first. For unpublished local changes, use the [optional workspace](https://github.com/kalm-lang/tools/blob/main/docs/workspace.md), which installs tarballs without changing the dependency manifest.

Code rendering uses `@kalm-lang/syntax-highlighting`, independently of documentation assets. Configure `KALM_PACKAGES_READ_TOKEN` to read this package and the documentation/specification packages. The optional tools workspace installs local tarballs before registry bootstrap. The shared API also works in browsers for future fiddle development.

Older `@kalm-lang/*` releases are supported through their core package APIs
(`documents`, specification `versions`, and `createKalmHighlighter`). Package
versions can differ. Optional documentation assets and specification drafts may
be absent. Plain fences and file tabs remain valid; comparison groups may omit
Java or Kalm Script. Java/Kalm tabs and side-by-side comparison appear only when
the group supplies both languages. Code preferences hide unavailable script,
block-style, and environment choices based on the installed content. Saved
preferences fall back to supported choices without losing the stored selection.
Unsupported highlighting languages render as escaped plain text.

`npm run test:content` includes isolated build and link checks for legacy package
APIs and content without the newer optional variants. New package APIs or content
formats should extend these compatibility fixtures when necessary.

## Code preferences and authored variants

The navbar's native Code preferences popover uses Floating UI positioning. The
versioned local record `kalm-code-preferences` stores dialect, block style, OS,
and shell; the head bootstrap migrates the former dialect record before paint.
Java choices, file tabs, and comparison layout reset on navigation and pageshow.
The greeting reserves every variant's height and shares its frame with output.

Author variants inside `compare` containers. Fence metadata follows the filename:

~~~~markdown
::::compare {"presentation":"adaptive"}
```kalm App.kalm {"style":"indentation"}
pub fun main() -> Unit:
    sayLine("Hello")
```
```kalm App.kalm {"style":"braces"}
pub fun main() -> Unit {
    sayLine("Hello")
}
```
```kalms App.kalms {"style":"indentation"}
sayLine("Hello")
```
```kalms App.kalms {"style":"braces"}
sayLine("Hello")
```
```java App.java
void main() {
    System.out.println("Hello");
}
```
::::
~~~~

Use `presentation: "showcase"` with independent boolean `locks` for dialect,
style, OS, and shell. A fence's `pane` labels its fixed pane. A style showcase
locks style and authors each dialect in each pane; a dialect showcase locks
dialect and authors each style in each pane. Interop showcases retain their
cooperating Kalm and Java files. They have no language controls.

Terminal variants declare `os` and `shell`; Bash/zsh, PowerShell, and Batch
have their own highlighted source. Use `dialect kalm` / `dialect kalms`
containers for instructions. Nest longer container delimiters outside shorter
ones. Historical specification excerpts keep their authored presentation.

Omit unavailable scripts and supply a specific `scriptUnavailable` reason.
The callout is displayed only when that Kalm fallback is actually visible.
Source variants are authored Markdown, never rewritten by browser regexes.
Use the existing Kalm formatter and Prettier's Java plugin, with four spaces and
multiline bodies. Standalone Java 25 programs use compact main methods; packaged
sources, reusable APIs, and class demonstrations retain explicit classes.

GSAP/Flip animates card turns and code changes; InertiaPlugin preserves velocity
through interrupted scrollbar changes. Reduced motion preserves the 350 ms
closing grace period while bypassing movement. Homepage content links use native
cross-document View Transitions with a GSAP fallback. Sidebar scroll positions
are stored per section and mobile/desktop surface in session storage.

Code checks compile the displayed sources directly, including both Kalm styles,
Java compact programs, cooperating source sets, native tests, script variants,
and cumulative lessons. Set `KALM_JAVA_COMMAND` and `KALM_JAVAC_COMMAND` to
JDK 25+ executables when needed. Local unpublished documentation is consumed via
its tarball without changing the pinned package version.
