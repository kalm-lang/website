import { test, expect } from '@playwright/test';

test('language notes open independently with real examples and Handbook links', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('details.feature');
  await expect(cards).toHaveCount(6);
  await expect(cards.first().locator('pre')).toBeHidden();
  await cards.first().locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(cards.first()).toHaveAttribute('open', '');
  await expect(cards.first().locator('pre')).toBeVisible();
  await cards.nth(1).locator('summary').click();
  await expect(cards.first()).toHaveAttribute('open', '');
  await expect(cards.nth(1)).toHaveAttribute('open', '');
  await cards.first().getByRole('link', { name: 'Learn more' }).click();
  await expect(page).toHaveURL(/\/docs\/language\/values\//);
});

test('mobile navigation and code tabs work with the keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  await expect(page.locator('#site-navigation')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#site-navigation')).toBeHidden();
  await page.goto('/examples/layout/');
  const tabs = page.getByRole('tab');
  await expect(tabs).toHaveCount(2);
  await tabs.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
  await page.keyboard.press('Home');
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  await expect(tabs.first()).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('static content and disclosures work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await page.locator('details summary').first().click();
  await expect(page.locator('details pre').first()).toBeVisible();
  await page.goto('http://127.0.0.1:4173/examples/java-to-kalm/');
  await expect(page.locator('kalm-code-tabs pre')).toHaveCount(2);
  await expect(page.locator('kalm-code-tabs pre').nth(1)).toBeVisible();
  await context.close();
});

test('reduced motion and enlarged text remain readable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/', '/examples/layout/', '/learn/07-files/']) {
    await page.goto(path);
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.goto('/');
  expect(await page.locator('[data-reveal]').first().evaluate(element => getComputedStyle(element).animationName)).toBe('none');
});
