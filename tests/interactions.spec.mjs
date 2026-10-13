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
    const button = await page.locator('kalm-theme-toggle .theme-trigger').boundingBox();
    // Locator.click scrolls sticky targets into their original document position.
    // A pointer click exercises the browser interaction without that extra step.
    await page.mouse.click(button.x + button.width / 2, button.y + button.height / 2);
    await expect(page.locator('kalm-theme-toggle .theme-popover')).toBeVisible();
    expect(await page.locator('.site-header-inner').boundingBox()).toEqual(before);
    expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const choice = await page.getByRole('button', { name: 'Dark', exact: true }).boundingBox();
    await page.mouse.click(choice.x + choice.width / 2, choice.y + choice.height / 2);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('kalm-theme-toggle .theme-popover')).toBeHidden();
    expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
  }
  await page.locator('kalm-theme-toggle .theme-trigger').click();
  const toggle = page.getByRole('switch', { name: 'Custom scrollbar' });
  await expect(toggle).toBeChecked();
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await expect(page.locator('.document-scrollbar')).toBeHidden();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-scrollbar-style', 'native');
  await page.locator('kalm-theme-toggle .theme-trigger').click();
  await page.getByRole('switch', { name: 'Custom scrollbar' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-scrollbar-style', 'custom');
  await page.keyboard.press('Escape');
  await expect(page.locator('kalm-theme-toggle .theme-trigger')).toBeFocused();
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
  await page.goto('/examples/fix/');
  const tabs = page.locator('kalm-code-compare [role="tab"]');
  await expect(tabs).toHaveCount(2);
  await tabs.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.comparison-panes > section:visible')).toHaveCount(1);
  await page.keyboard.press('Home');
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  await expect(tabs.first()).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('static content and disclosures work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(new URL('/', test.info().project.use.baseURL).href);
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await page.locator('.feature-trigger').first().click();
  await expect(page).toHaveURL(/\/docs\/language\/layout\//);
  await page.goto(new URL('/examples/java-to-kalm/', test.info().project.use.baseURL).href);
  await expect(page.locator('.comparison-panes [data-language="java"]')).toBeVisible();
  await expect(page.locator('.comparison-panes [data-language="kalm"]').first()).toBeVisible();
  await expect(page.getByRole('tab', {name:'Java',exact:true})).toHaveCount(0);
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

test('homepage greeting lets visitors edit the name and animates the matching output', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const name = page.getByRole('textbox', { name: 'Greeting name' });
  const output = page.locator('[data-greeting-output]');
  await expect(name).toHaveCount(1);
  await expect(page.locator('.greeting-edit-hint')).toHaveCount(0);
  await expect(output).toHaveText(/^Hello, (Mira|Ari|Ava|Lena|Leo|Noah)!$/);

  await name.fill('Nora');
  await expect(page.locator('[data-greeting-loading]')).toBeVisible();
  await expect(output).toBeEmpty();
  await expect(output).toHaveText('Hello, Nora!', { timeout: 3000 });
  await page.getByRole('button', { name: 'Copy code' }).first().click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('sayLine(greeting("Nora"))');

  await name.fill('');
  await expect.poll(() => output.textContent()).toBe('Hello, !');
  await name.fill('   ');
  await expect.poll(() => output.textContent()).toBe('Hello,    !');
});

test('homepage name rotates every twenty seconds until the field is touched', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  const name = page.getByRole('textbox', { name: 'Greeting name' });
  const initial = await name.inputValue();

  await page.clock.runFor(18_000);
  await expect(name).toHaveValue(initial);
  await page.clock.runFor(2_500);
  const rotated = await name.inputValue();
  expect(rotated).not.toBe(initial);

  await name.focus();
  await page.clock.runFor(21_000);
  await expect(name).toHaveValue(rotated);
});
