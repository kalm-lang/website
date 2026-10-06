# Kalm website

Static multipage documentation built with Lit, TypeScript, Markdown-it, and Vite.
Requires Node 22.12 or newer.

Run in `website/`:

```sh
npm ci
npm run dev
npm run check
npm run test:content
npm run build
npm test
npm run verify:code
```

Install Chromium once with `npx playwright install chromium`. `verify:code`
requires a full JDK 25+ and locally built compiler/runtime/standard-library JARs.
It compiles all example and homepage snippets, exercises each cumulative lesson,
and checks native tests plus the completed CLI's counts and failure behavior.
Temporary compilation outputs are removed afterward.
Set `KALM_TEST_BROWSER_CHANNEL=msedge` to run browser checks with an installed
Microsoft Edge when bundled Chromium is unavailable.

## Production deployment

The **Kalm website** workflow builds and tests only `website/` on branch pushes,
pull requests, and manual runs. Push a `website-<SemVer>` tag (for example,
`website-1.2.3` or `website-1.2.3-rc.1+build.7`) to deploy that tag's site.
Malformed `website-*` tags fail before dependency installation. Website tags skip
the language/distribution workflow. Type, content, build/link, browser, or deployment
errors stop the release; the fiddle is not built or deployed.

After the build passes, the deployment job uses the `website-prod` GitHub environment
and its `DESTINATION_FTP_HOST`, `DESTINATION_FTP_PASSWORD`, `DESTINATION_FTP_PORT`,
and `DESTINATION_FTP_USER` secrets. Deployments share a concurrency group so active
FTP uploads cannot overlap or be cancelled by a newer release.

The destination is the FTP account's `/`, using passive FTP. The server must support
`MLSD` directory listings, including dotfiles. Before any remote deletion or upload,
the script requires a readable regular file `/.github_deployment_root.txt`, validates
the build, and inventories the destination. Missing markers, unsupported entry types,
or failed listings abort before changes. Create the marker on the server yourself;
deployment never creates it.

Deployment removes the previous site and uploads `website/dist/`. It preserves root
`/_imports/` recursively, the marker, `.ht*` entries (including `.htaccess`,
`.htpasswd`, `.htgroups`, and their backups), and `.user.ini` at every depth.
Parent directories containing preserved files
also remain. These paths are excluded from uploads, so build files cannot overwrite
them. All other files, including other dotfiles, are eligible for removal.
Cleanup and upload are sequential; the site can be temporarily incomplete during
deployment, and a failed transfer requires rerunning the release job.

Run the deployment safety checks locally from the repository root:

```sh
python3 -m unittest discover -s scripts -p 'test_deploy_website.py'
```

## Content

- `content/docs/`: Handbook articles.
- `content/examples/`: short syntax topics; `topics.json` records catalog coverage.
- `content/learn/`: the ordered text-statistics learning path and completion page.
- `content/home/`: greeting, learning preview, and expandable language-note snippets.
- `specifications/Kalm-Language-Specification-v*.md`: canonical specification versions.

Pages and navigation are discovered from Markdown. A filename determines its URL;
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
The footer version comes from the root Maven project.

Homepage notes also declare an `icon` from the curated Lucide set in
`shared/icons.mjs` and a `doc` website URL. Icons and code headers render at build
time; browser controls enhance that HTML. On mobile, a Topics button in the sticky
header opens searchable navigation with collapsible subtopics. Native topic
disclosures leave navigation available without JavaScript.

Use fenced code with its language and optional filename. Ordinary examples have
one block. For alternatives or Java counterparts, use two or three tabs:

````markdown
:::tabs
```kalm Indentation
pub fun hello() -> Unit:
    sayLine("Hello")
```
```kalm Braces
pub fun hello() -> Unit {
    sayLine("Hello");
}
```
:::
````

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

Restart `npm run dev` after content changes. Production builds regenerate all
pages. To run the navigation first-paint checks against Vite development mode:

```sh
KALM_TEST_SERVER=dev npm test -- tests/first-paint.spec.mjs
```
