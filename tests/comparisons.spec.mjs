import { test, expect } from '@playwright/test';

test('dialect persists and comparisons remain local with accurate copying', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/docs/language/functions/');
  const examples = page.locator('kalm-code-compare');
  await examples.first().getByRole('tab', { name: 'Java', exact: true }).click();
  await expect(examples.first().locator('[data-language="java"]')).toBeVisible();
  await expect(examples.nth(1).locator('[data-language="kalm"]')).toBeVisible();
  await page.locator('[data-dialect-choice="kalms"]').click();
  await expect(examples.first().locator('[data-language="java"]')).toBeVisible();
  await expect(examples.nth(1).locator('[data-language="kalms"]')).toBeVisible();
  await examples.first().getByRole('button', { name: 'Side by side' }).click();
  await expect(examples.first().locator('[data-language="kalms"]')).toBeVisible();
  await expect(examples.first().locator('[data-language="java"]')).toBeVisible();
  const java = examples.first().locator('[data-language="java"]');
  await java.getByRole('button', { name: 'Copy code' }).click();
  expect((await page.evaluate(() => navigator.clipboard.readText())).replaceAll('\r\n', '\n')).toBe(await java.locator('code').textContent());
  await page.goto('/examples/fix/');
  await expect(page.locator('html')).toHaveAttribute('data-dialect', 'kalms');
  await expect(page.locator('kalm-code-compare [data-language="kalms"]')).toBeVisible();
});

test('script homepage preserves the edited greeting and excludes Java controls', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: 'Greeting name' });
  await input.fill('Nora');
  await page.locator('[data-dialect-choice="kalms"]').click();
  await expect(input).toHaveValue('Nora');
  await expect(page.locator('[data-language="kalms"] [data-greeting-name]')).toHaveCount(1);
  await expect(page.locator('[data-greeting-output]')).toHaveText('Hello, Nora!');
  await expect(page.getByRole('button', { name: 'Side by side' })).toHaveCount(0);
  await expect(page.locator('[data-language="java"]')).toHaveCount(0);
  await page.locator('[data-dialect-choice="kalm"]').click();
  await expect(input).toHaveValue('Nora');
});

test('script lessons show matching instructions and project-only features explain their limits', async ({ page }) => {
  await page.goto('/learn/07-files/');
  await page.locator('[data-dialect-choice="kalms"]').click();
  await expect(page.getByText('The script host does not forward command-line arguments.', { exact: false })).toBeVisible();
  await expect(page.locator('.dialect-content[data-dialect="kalms"]')).toContainText('kalm shell -f App.kalms');
  await page.goto('/examples/tests/');
  await expect(page.locator('.script-unavailable')).toBeVisible();
  await expect(page.locator('[data-language="kalm"]')).toBeVisible();
});

test('comparison controls fit phones and support keyboard selection', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/examples/fix/');
  const group = page.locator('kalm-code-compare');
  await group.getByRole('tab', { name: 'Kalm', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(group.getByRole('tab', { name: 'Java', exact: true })).toBeFocused();
  await group.getByRole('button', { name: 'Side by side' }).click();
  const left = await group.locator('[data-language="kalm"]').boundingBox();
  const right = await group.locator('[data-language="java"]').boundingBox();
  expect(right.y).toBeGreaterThanOrEqual(left.y + left.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('[data-dialect-choice="kalms"]').click();
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await expect.poll(async () => {
    const slider = await page.locator('.dialect-slider').boundingBox();
    const indicator = await page.locator('.dialect-slider-indicator').boundingBox();
    return indicator.x >= slider.x && indicator.x + indicator.width <= slider.x + slider.width;
  }).toBe(true);
});

test('comparison controls work with blocked storage and static counterparts remain readable', async ({ page, browser }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('Blocked'); } }); });
  await page.goto('/examples/fix/');
  await page.locator('[data-dialect-choice="kalms"]').click();
  await expect(page.locator('[data-language="kalms"]')).toBeVisible();
  const context = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await context.newPage();
  await staticPage.goto('http://127.0.0.1:4173/examples/fix/');
  await expect(staticPage.locator('[data-language="kalm"]')).toBeVisible();
  await expect(staticPage.locator('[data-language="java"]')).toBeVisible();
  await context.close();
});

test('saved script dialect is visible before enhancement and the homepage upgrades correctly', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kalm-dialect', 'kalms'));
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/*.js', async route => { await gate; await route.continue(); });
  try {
    await page.goto('/examples/fix/', { waitUntil: 'commit' });
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-language="kalms"]')).toBeVisible();
    await expect(page.locator('[data-language="kalm"]')).toBeHidden();
    await expect(page.locator('[data-language="java"]')).toBeHidden();
  } finally { release(); await page.waitForLoadState('load'); }
  await page.goto('/');
  await expect(page.locator('[data-language="kalms"] [data-greeting-name]')).toBeVisible();
});
