# Kalm website

Static multipage documentation using Lit, TypeScript, and Vite. Requires Node
22.12+; dependencies are pinned to verified latest stable versions.

Run in `website/`:

```sh
npm ci
npm run dev
npm run check
npm run build
npm run preview
npm test
```

Install the test browser once with `npx playwright install chromium`.
Canonical Markdown and examples live in the repository. Build scripts render
ignored `.generated/` pages, reuse the editor's Kalm grammar, and emit static
`dist/`. Lit enhances theme, mobile navigation, source tabs, and code copying.
Reading works without JavaScript. There is no live compiler or deployment.

Restart `npm run dev` after content changes. Every production build regenerates
pages. Source components and styles are handled directly by Vite.
