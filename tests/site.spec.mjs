import { test, expect } from '@playwright/test';
import { routes } from '../scripts/routes.mjs';

test('every page loads without runtime errors', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const route of [{ path: '/' }, ...routes]) {
    await page.goto(route.path);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByLabel('Color theme')).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('theme persists and code copy uses the source', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.getByLabel('Color theme').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.getByLabel('Color theme')).toHaveValue('dark');
  await page.getByRole('button', { name: 'Copy code' }).first().click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('pub fun greeting');
  await page.getByLabel('Color theme').selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('mobile navigation and source tabs work with the keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: '[+] menu', exact: true }).click();
  await expect(page.locator('#site-navigation')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#site-navigation')).toBeHidden();
  await page.goto('/examples/task-report/');
  const tabs = page.getByRole('tab');
  await tabs.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('tutorial navigation follows the complete learning path', async ({ page }) => {
  await page.goto('/tutorial/01-hello/');
  for (let lesson = 1; lesson < 6; lesson++) {
    await page.locator('.lesson-navigation a').last().click();
    await expect(page.locator('h1')).toContainText(`${lesson + 1}.`);
  }
  await page.locator('.lesson-navigation a').last().click();
  await expect(page).toHaveURL(/\/examples\/task-report\//);
});

test('static content stays usable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/examples/hello/');
  await expect(page.locator('h1')).toHaveText('Hello, Kalm');
  await expect(page.locator('pre').first()).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await context.close();
});

test('reduced motion and enlarged text remain readable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.locator('[data-reveal]').first().evaluate(el => getComputedStyle(el).animationName)).toBe('none');
});
