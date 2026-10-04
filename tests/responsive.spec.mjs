import { test, expect } from '@playwright/test';

const paths = ['/', '/docs/quick-start/', '/docs/specifications/1.1/', '/examples/layout/', '/learn/07-files/'];
const fitsViewport = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test('phone, tablet, and desktop layouts keep content within the viewport', async ({ page }) => {
  test.setTimeout(120_000);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of paths) {
      await page.goto(path);
      await expect(page.getByLabel('Color theme')).toBeVisible();
      if (path === '/') {
        for (const summary of await page.locator('.feature summary').all()) await summary.click();
      }
      expect(await fitsViewport(page), `${path} at ${width}px`).toBe(true);
      const blocks = await page.locator('kalm-code-block:visible').evaluateAll(elements => elements.map(element => {
        const header = element.querySelector('.code-header').getBoundingClientRect();
        const pre = element.querySelector('pre').getBoundingClientRect();
        return header.bottom <= pre.top + 1;
      }));
      expect(blocks.every(Boolean), 'code controls must stay above the source').toBe(true);
    }
  }
});

test('mobile topic menus keep the article close and the selected topic reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/examples/nullable/');
  const navigation = page.getByRole('navigation', { name: 'examples navigation' });
  await expect(navigation).toBeHidden();
  expect(await page.locator('h1').evaluate(element => element.getBoundingClientRect().top)).toBeLessThan(300);
  await page.locator('.section-menu').click();
  await expect(navigation).toBeVisible();
  await expect(navigation.locator('[aria-current="page"]')).toBeInViewport();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(navigation).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(navigation).toBeHidden();
});

test('small screens remain usable with enlarged text and touch sized controls', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  for (const path of ['/', '/examples/layout/', '/learn/07-files/']) {
    await page.goto(path);
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    expect(await fitsViewport(page), `${path} with enlarged text`).toBe(true);
  }
  await page.goto('/');
  for (const selector of ['.menu-button', '.theme-label select', '.copy-button']) {
    const target = page.locator(selector).first();
    await expect(target).toBeVisible();
    expect((await target.boundingBox()).height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await page.mouse.click(4, 250);
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
});
