import { test, expect } from '@playwright/test';

test('card turns into a modal and closing restores layout and focus', async ({ page }) => {
  await page.goto('/');
  const trigger = page.locator('.feature-trigger').first();
  await trigger.scrollIntoViewIfNeeded();
  const before = await trigger.boundingBox();
  await trigger.click();
  const dialog = page.locator('dialog.feature-dialog').first();
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toHaveAttribute('data-transition');
  await expect(dialog.getByRole('button', { name: /Close .* example/ })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await trigger.boundingBox()).toEqual(before);
});

test('card opening can be interrupted and resize settles the modal', async ({ page }) => {
  await page.goto('/');
  const trigger = page.locator('.feature-trigger').first();
  const dialog = page.locator('dialog.feature-dialog').first();
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await trigger.click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toHaveAttribute('data-transition');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

