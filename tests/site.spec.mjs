import { test, expect } from '@playwright/test';
import { routes } from '../scripts/routes.mjs';

async function chooseTheme(page, theme) {
  await page.locator('.theme-trigger').click();
  await page.locator(`[data-theme-choice="${theme}"]`).click();
}

test('every Markdown page loads without runtime errors', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const route of [{ path: '/' }, ...routes]) {
    await page.goto(route.path);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByLabel('Color theme')).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('each section has isolated navigation and correct active state', async ({ page }) => {
  for (const [path, section] of [['/docs/java/', 'docs'], ['/examples/nullable/', 'examples'], ['/learn/03-arguments/', 'learn']]) {
    await page.goto(path);
    await expect(page.locator('.nav-links [aria-current="page"]')).toHaveText(section);
    await expect(page.locator('.sidebar [aria-current="page"]')).toHaveAttribute('href', path);
    const links = await page.locator('.sidebar a').evaluateAll(elements => elements.map(element => element.getAttribute('href')));
    expect(links.every(href => href.startsWith(`/${section}/`))).toBe(true);
    expect(await page.locator('.sidebar [aria-current="page"]').evaluate(element => {
      const bounds = element.closest('nav').getBoundingClientRect();
      const item = element.getBoundingClientRect();
      return item.top >= bounds.top && item.bottom <= bounds.bottom;
    })).toBe(true);
  }
  await page.goto('/docs/quick-start/');
  await expect(page.locator('.nav-group h2')).toHaveText(['Handbook', 'Specifications']);
  await expect(page.locator('.sidebar a[href^="/docs/specifications/"]')).toHaveCount(routes.filter(route => route.specification).length);
  await expect(page.locator('.article-header')).not.toContainText('/docs/');
});

test('theme persists across navigation and code copy preserves the source', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await chooseTheme(page, 'dark');
  await page.getByRole('link', { name: 'Start writing' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.theme-trigger')).toHaveAttribute('aria-label', 'Color theme: dark');
  await chooseTheme(page, 'light');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(243, 232, 213)');
  await page.goto('/');
  await page.getByRole('button', { name: 'Copy code' }).first().click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('pub fun greeting');
  await chooseTheme(page, 'system');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(25, 28, 25)');
});

test('learning navigation reaches completion and legacy URLs redirect', async ({ page }) => {
  await page.goto('/learn/01-start/');
  for (let lesson = 1; lesson < 8; lesson++) {
    await page.locator('.lesson-navigation a').last().click();
    await expect(page.locator('h1')).toContainText(`${lesson + 1}.`);
  }
  await page.locator('.lesson-navigation a').last().click();
  await expect(page).toHaveURL(/\/learn\/complete\//);
  for (const [from, to] of [['/tutorial/', '/learn/'], ['/tutorial/06-report/', '/learn/08-tests/'], ['/docs/specification/', '/docs/specifications/1.1/']]) {
    await page.goto(from);
    await expect(page).toHaveURL(new RegExp(`${to}$`));
  }
});
