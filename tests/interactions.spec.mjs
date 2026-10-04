import { test, expect } from '@playwright/test';

test('appearance popover preserves the header and page position and saves scrollbar preferences', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [320, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page).toHaveTitle('Kalm');
    await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'instant' }));
    const before = await page.locator('.site-header-inner').boundingBox();
    const scroll = await page.evaluate(() => window.scrollY);
    const button = await page.locator('.theme-trigger').boundingBox();
    // Locator.click scrolls sticky targets into their original document position.
    // A pointer click exercises the browser interaction without that extra step.
    await page.mouse.click(button.x + button.width / 2, button.y + button.height / 2);
    await expect(page.locator('.theme-popover')).toBeVisible();
    expect(await page.locator('.site-header-inner').boundingBox()).toEqual(before);
    expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const choice = await page.getByRole('button', { name: 'Dark', exact: true }).boundingBox();
    await page.mouse.click(choice.x + choice.width / 2, choice.y + choice.height / 2);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('.theme-popover')).toHaveCount(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
  }
  await page.locator('.theme-trigger').click();
  const toggle = page.getByRole('switch', { name: 'Custom scrollbar' });
  await expect(toggle).toBeChecked();
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await expect(page.locator('.document-scrollbar')).toBeHidden();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-scrollbar-style', 'native');
  await page.locator('.theme-trigger').click();
  await page.getByRole('switch', { name: 'Custom scrollbar' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-scrollbar-style', 'custom');
  await page.keyboard.press('Escape');
  await expect(page.locator('.theme-trigger')).toBeFocused();
  expect(errors).toEqual([]);
});

test('custom document scrollbar supports dragging without replacing the document scroll surface', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/docs/specifications/1.1/');
  const track = page.locator('.document-scrollbar');
  await expect(track).toBeVisible();
  await track.hover();
  await expect.poll(async () => (await track.boundingBox()).height).toBeGreaterThan(400);
  await expect.poll(async () => (await track.boundingBox()).height).toBeLessThan(600);
  const thumb = await page.locator('.document-scrollbar-thumb').boundingBox();
  const bounds = await track.boundingBox();
  await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height - 10, { steps: 6 });
  await page.mouse.up();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
  expect(await page.evaluate(() => document.scrollingElement === document.documentElement)).toBe(true);
});

test('language note dialogs keep the page still and restore focus when closed', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const cards = page.locator('.feature');
  await expect(cards).toHaveCount(6);
  await expect(cards.locator('.feature-preview')).toHaveCount(0);
  await expect(cards.first().locator('pre').first()).toBeHidden();
  const trigger = cards.first().locator('.feature-trigger');
  await trigger.focus();
  const scroll = await page.evaluate(() => window.scrollY);
  await page.keyboard.press('Enter');
  await expect(cards.first().locator('dialog')).toHaveAttribute('open', '');
  await expect(cards.first().locator('pre').first()).toBeVisible();
  await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden');
  expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
  await expect(page.locator('.document-scrollbar')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(page.locator('html')).not.toHaveAttribute('data-dialog-open', '');
  await trigger.click();
  await cards.first().getByRole('link', { name: 'Read the full guide' }).click();
  await expect(page).toHaveURL(/\/docs\/language\/layout\//);
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
  await page.locator('.feature-trigger').first().click();
  await expect(page).toHaveURL(/\/docs\/language\/layout\//);
  await page.goto('http://127.0.0.1:4173/examples/java-to-kalm/');
  await expect(page.locator('kalm-code-tabs pre')).toHaveCount(2);
  await expect(page.locator('kalm-code-tabs pre').nth(1)).toBeVisible();
  await context.close();
});

test('page content appears without entrance animation and remains readable with enlarged text', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/', '/examples/layout/', '/learn/07-files/']) {
    await page.goto(path);
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.goto('/');
  await expect(page.locator('[data-reveal]')).toHaveCount(0);
});
