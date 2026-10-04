import { test, expect } from '@playwright/test';

for (const theme of ['light', 'dark']) {
  test(`${theme} navigation is styled before JavaScript arrives`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem('kalm-theme', value), theme);
    for (const path of ['/', '/docs/quick-start/', '/examples/fix/', '/learn/01-start/']) {
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      const handler = async route => {
        const url = route.request().url();
        if (/\.js(?:\?|$)|\/src\/.*\.ts(?:\?|$)/.test(url)) await gate;
        await route.continue();
      };
      await page.route('**/*', handler);
      try {
        await page.goto(path, { waitUntil: 'commit' });
        await expect(page.locator('h1')).toBeVisible();
        await expect(page.locator('.site-header')).toHaveCSS('display', 'flex');
        await expect(page.locator('body')).toHaveCSS('background-color', theme === 'dark' ? 'rgb(25, 28, 25)' : 'rgb(243, 232, 213)');
        expect(await page.evaluate(() => Boolean(document.querySelector('link[rel="stylesheet"]')?.sheet))).toBe(true);
        expect(await page.evaluate(() => customElements.get('kalm-code-block'))).toBeUndefined();
      } finally {
        release();
        await page.waitForLoadState('load');
        await page.unroute('**/*', handler);
      }
      await expect(page.getByLabel('Color theme')).toHaveValue(theme);
    }
  });
}
