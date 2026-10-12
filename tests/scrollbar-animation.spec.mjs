import { test, expect } from '@playwright/test';

test('scrollbar slightly shrinks before delayed close and reentry cancels it', async ({ page }) => {
  await page.clock.install();
  await page.goto('/docs/specifications/1.1/');
  const track = page.locator('.document-scrollbar');
  await track.hover();
  await page.clock.runFor(400);
  const open = await track.boundingBox();
  await page.mouse.move(300, 200);
  await expect(track).toHaveAttribute('data-pending-close', '');
  await page.clock.runFor(150);
  const pending = await track.boundingBox();
  expect(pending.height).toBeLessThan(open.height);
  expect(pending.height).toBeGreaterThan(open.height * .94);
  await track.hover();
  await page.clock.runFor(400);
  await expect(track).not.toHaveAttribute('data-pending-close');
  await expect(track).toHaveAttribute('data-open', '');
  await page.mouse.move(300, 200);
  await page.clock.runFor(700);
  await expect(track).not.toHaveAttribute('data-open');
});

test('reduced motion settles immediately while keeping the close grace period', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('.feature-trigger').first().click();
  await expect(page.locator('dialog.feature-dialog').first()).not.toHaveAttribute('data-transition');
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog.feature-dialog').first()).toBeHidden();
  await page.goto('/docs/specifications/1.1/');
  const track = page.locator('.document-scrollbar');
  await track.hover();
  await page.mouse.move(300, 200);
  await expect(track).toHaveAttribute('data-pending-close', '');
  await expect(track).toHaveAttribute('data-open', '');
});
