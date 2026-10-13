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

test('the right edge keeps its safe space while window exit and blur collapse the scrollbar',async({page})=>{
  await page.goto('/docs/specifications/1.1.0/');
  const track=page.locator('.document-scrollbar');
  await track.hover();await expect(track).toHaveAttribute('data-open','');
  let bounds=await track.boundingBox();
  await page.mouse.move(bounds.x+bounds.width-.5,bounds.y+bounds.height/2);
  await expect(track).toHaveAttribute('data-open','');await expect(track).not.toHaveAttribute('data-pending-close');
  await track.hover();await page.evaluate(()=>document.dispatchEvent(new PointerEvent('pointerleave',{relatedTarget:null})));
  await expect(track).not.toHaveAttribute('data-open');
  await track.hover();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await expect(track).not.toHaveAttribute('data-open');
});

test('scrollbar suppression is present in the card trigger frame',async({page})=>{
  await page.goto('/');
  const result=await page.locator('.feature-trigger').first().evaluate(element=>{
    element.click();
    return {root:document.documentElement.hasAttribute('data-dialog-open'),track:getComputedStyle(document.querySelector('.document-scrollbar')).display,document:getComputedStyle(document.documentElement).scrollbarWidth,gutters:[...document.querySelectorAll('dialog[open] pre')].map(e=>getComputedStyle(e).scrollbarColor)};
  });
  expect(result).toMatchObject({root:true,track:'none',document:'none'});
  expect(result.gutters.every(value=>value==='rgba(0, 0, 0, 0) rgba(0, 0, 0, 0)')).toBe(true);
  await page.keyboard.press('Escape');
});
