import {expect, test} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {capabilities} from '../scripts/content.mjs';

const settled = async (page) => expect.poll(() => page.locator('dialog[open]').evaluateAll(elements => elements.every(e => !e.hasAttribute('data-transition')))).toBe(true);

test('both settings menus share appearance, toggle behavior and viewport-safe mobile layout', async ({ page }) => {
  test.skip(!capabilities.environment, 'Installed documentation has no environment preferences.');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    const preferences = page.getByRole('button', { name: 'Code preferences', exact: true });
    const theme = page.locator('kalm-theme-toggle .theme-trigger');
    const alignment = await preferences.evaluate(e => {
      const b = e.getBoundingClientRect(), title = document.querySelector('.brand').getBoundingClientRect();
      return { gap: b.left - title.right, centers: Math.abs(b.top + b.height / 2 - title.top - title.height / 2) };
    });
    expect(alignment.gap).toBeGreaterThanOrEqual(0);
    expect(alignment.gap).toBeLessThan(16);
    expect(alignment.centers).toBeLessThan(1);
    await preferences.click();
    const panel = page.locator('.preferences-popover');
    await expect(panel).toBeVisible();
    await expect(panel.locator('details')).not.toHaveAttribute('open', '');
    await expect(panel.locator('select')).toHaveCount(0);
    const appearance = await panel.evaluate(e => {
      const s = getComputedStyle(e); return [s.padding, s.borderRadius, s.borderColor, s.backgroundColor, s.boxShadow];
    });
    const box = await panel.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(845);
    if (width >= 768) expect(box.x).toBeGreaterThanOrEqual((await preferences.boundingBox()).x - 1);
    await preferences.click();
    await expect(panel).toBeHidden();
    await theme.click();
    await expect(page.locator('kalm-theme-toggle .theme-popover')).toBeVisible();
    expect(await page.locator('kalm-theme-toggle .theme-popover').evaluate(e => {
      const s = getComputedStyle(e); return [s.padding, s.borderRadius, s.borderColor, s.backgroundColor, s.boxShadow];
    })).toEqual(appearance);
    await theme.click();
    await expect(page.locator('kalm-theme-toggle .theme-popover')).toBeHidden();
    await preferences.click();
    await panel.locator('summary').click();
    await expect(panel.locator('[data-preference="os"][data-value="windows"]')).toBeVisible();
    await panel.locator('summary').click();
    await panel.locator('summary').click();
    await expect.poll(() => panel.locator('.environment-fields').evaluate(e => e.style.height)).toBe('');
    await expect(panel.locator('details')).toHaveAttribute('open', '');
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(preferences).toBeFocused();
  }
});

test('cards keep their content layout during the turn and return to the actual tile outline', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.locator('.feature-trigger').first().scrollIntoViewIfNeeded();
  const card = page.locator('.feature').first();
  const before = await card.boundingBox();
  const frames = await page.evaluate(async () => {
    const dialog = document.querySelector('.feature-dialog'), card = document.querySelector('.feature');
    card.querySelector('.feature-trigger').click();
    const start = performance.now(), samples = [];
    while (performance.now() - start < 450) {
      const content = dialog.querySelector('.card-turn-content');
      samples.push({
        t: performance.now() - start, width: content.offsetWidth,
        font: getComputedStyle(content).fontSize,
        scrollbar: getComputedStyle(document.querySelector('.document-scrollbar')).display,
        alpha: parseFloat(getComputedStyle(dialog).getPropertyValue('--backdrop-alpha')),
      });
      await new Promise(requestAnimationFrame);
    }
    return samples;
  });
  expect(new Set(frames.map(f => f.width)).size).toBe(1);
  expect(new Set(frames.map(f => f.font)).size).toBe(1);
  expect(frames.every(f => f.scrollbar === 'none')).toBe(true);
  expect(frames.some(f => f.alpha > .05 && f.alpha < .57)).toBe(true);
  expect(frames.at(-1).alpha).toBeCloseTo(.62);
  expect(await card.boundingBox()).toEqual(before);
  await expect(card).toHaveCSS('border-top-style', 'dashed');
  const closing = await page.evaluate(async () => {
    const dialog = document.querySelector('.feature-dialog');
    dialog.querySelector('.feature-close').click();
    const samples = [];
    while (dialog.open) {
      const r = dialog.getBoundingClientRect();
      samples.push({ x: r.x, y: r.y, width: r.width, height: r.height, t: performance.now() });
      await new Promise(requestAnimationFrame);
    }
    return samples;
  });
  const last = closing.at(-1);
  for (const property of ['x', 'y', 'width', 'height']) expect(Math.abs(last[property] - before[property])).toBeLessThan(8);
  await expect(card).toHaveCSS('border-top-style', 'solid');
  expect(await card.boundingBox()).toEqual(before);
});

test('modal comparisons keep the dialog width, separate panes and stack on phones without nested borders', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.locator('.feature-trigger').nth(1).click();
  await settled(page);
  const dialog = page.locator('dialog[open]'), group = dialog.locator('kalm-code-compare');
  test.skip(!await group.count(), 'Installed homepage note has no language comparisons.');
  const before = await dialog.boundingBox();
  await group.getByRole('button', { name: 'Compare side by side' }).click();
  await expect(group).toHaveAttribute('data-layout', 'split');
  await expect(group).toHaveAttribute('data-stacked', 'false');
  await expect.poll(() => group.locator('.comparison-panes').evaluate(e => e.style.height)).toBe('');
  expect((await dialog.boundingBox()).width).toBeCloseTo(before.width);
  expect((await group.boundingBox()).width).toBeLessThan(before.width);
  const panes = await group.locator('.comparison-panes > section:not([hidden])').evaluateAll(elements => elements.map(e => {
    const r = e.getBoundingClientRect(); return { x: r.x, right: r.right, y: r.y };
  }));
  expect(Math.abs(panes[0].y - panes[1].y)).toBeLessThan(1);
  expect(panes[1].x - panes[0].right).toBeGreaterThanOrEqual(10);
  await expect(group).toHaveCSS('border-top-width', '0px');
  for (const block of await group.locator('section:not([hidden]) kalm-code-block').all()) await expect(block).toHaveCSS('border-top-width', '1px');
  for (const toolbar of await group.locator('.source-tab-bar,.comparison-controls').all()) await expect(toolbar).toHaveCSS('border-bottom-width', '0px');
  mkdirSync('build/review', { recursive: true });
  await page.screenshot({ path: 'build/review/desktop-modal-comparison.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(group).toHaveAttribute('data-stacked', 'true');
  expect((await group.boundingBox()).width).toBeLessThan(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'build/review/phone-modal-comparison.png' });
});

test('scrollbar expands promptly, keeps a symmetric safe zone and settles after the closing grace period', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const track = page.locator('.document-scrollbar');
  await track.hover();
  await page.waitForTimeout(250);
  const expanded = await track.boundingBox();
  expect(expanded.height).toBeGreaterThan(550);
  await page.mouse.move(1439, expanded.y + expanded.height / 2);
  await page.waitForTimeout(380);
  expect((await track.boundingBox()).height).toBeCloseTo(expanded.height, 0);
  await page.mouse.move(expanded.x - 30, expanded.y + expanded.height / 2);
  await page.waitForTimeout(200);
  const pending = await track.boundingBox();
  expect(pending.height).toBeLessThan(expanded.height);
  expect(pending.height).toBeGreaterThan(expanded.height * .9);
  await page.waitForTimeout(450);
  expect((await track.boundingBox()).height).toBeLessThanOrEqual(161);
});
