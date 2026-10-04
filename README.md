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

## Content

- `content/docs/`: Handbook articles.
- `content/examples/`: short syntax topics; `topics.json` records catalog coverage.
- `content/learn/`: the ordered text-statistics learning path and completion page.
- `content/home/`: greeting and expandable language-note snippets.
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
consecutive `lesson` number. Optional `navSection` indents a Handbook child.
The footer version comes from the root Maven project.

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
Styles load directly in each page's head. Lit enhances copying, code tabs, and
theme selection; the mobile menu preserves its generated navigation links.
Articles, code, and native disclosure cards remain readable without JavaScript.

Restart `npm run dev` after content changes. Production builds regenerate all
pages. To run the navigation first-paint checks against Vite development mode:

```sh
KALM_TEST_SERVER=dev npm test -- tests/first-paint.spec.mjs
```
