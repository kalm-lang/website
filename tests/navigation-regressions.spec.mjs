import { test, expect } from '@playwright/test';

test('mobile topics are closed before enhancement and appearance has no scrollbar setting', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const handler = async route => {
    if (/\.js(?:\?|$)|\/src\/.*\.ts(?:\?|$)/.test(route.request().url())) await gate;
    await route.continue();
  };
  await page.route('**/*', handler);
  try {
    await page.goto('/docs/quick-start/', { waitUntil: 'commit' });
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.topic-trigger')).toBeVisible();
    await expect(page.locator('.sidebar-inner')).toBeHidden();
  } finally {
    release();
    await page.waitForLoadState('load');
    await page.unroute('**/*', handler);
  }
  await page.locator('kalm-theme-toggle .theme-trigger').click();
  await expect(page.getByRole('switch', { name: 'Custom scrollbar' })).toHaveCount(0);
  await expect(page.locator('.document-scrollbar')).toBeHidden();
});

test('scrollbar has visible travel and stays inside the visible viewport under zoom', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/docs/specifications/1.1/');
  const track = page.locator('.document-scrollbar');
  await expect(track).toBeVisible();
  await expect(track).toHaveCSS('box-shadow', 'none');
  await expect(page.locator('.document-scrollbar-thumb')).toHaveCSS('box-shadow', 'none');
  const metrics = () => page.evaluate(() => {
    const viewport = window.visualViewport;
    const track = document.querySelector('.document-scrollbar').getBoundingClientRect();
    const thumb = document.querySelector('.document-scrollbar-thumb').getBoundingClientRect();
    return {
      travel: track.height - thumb.height - 6,
      fits: track.left >= viewport.offsetLeft && track.right <= viewport.offsetLeft + viewport.width &&
        track.top >= viewport.offsetTop && track.bottom <= viewport.offsetTop + viewport.height &&
        thumb.top >= track.top && thumb.bottom <= track.bottom,
    };
  });
  expect((await metrics()).travel).toBeGreaterThan(80);
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  const session = await page.context().newCDPSession(page);
  for (const pageScaleFactor of [2, 4, 1]) {
    await session.send('Emulation.setPageScaleFactor', { pageScaleFactor });
    await expect.poll(async () => (await metrics()).fits).toBe(true);
    expect((await metrics()).travel).toBeGreaterThan(8);
  }
  await session.detach();
});

test('main focus is outlined only through Tab or the skip link', async ({ page }) => {
  await page.goto('/docs/quick-start/');
  const main = page.locator('#main');
  await page.evaluate(() => document.getElementById('main').focus());
  await expect(main).toBeFocused();
  await expect(main).not.toHaveAttribute('data-main-focus', '');
  await expect(main).toHaveCSS('outline-style', 'none');
  await page.locator('kalm-theme-toggle .theme-trigger').focus();
  await page.keyboard.press('Tab');
  await expect(main).toBeFocused();
  await expect(main).toHaveAttribute('data-main-focus', '');
  await page.locator('.skip-link').focus();
  await page.keyboard.press('Enter');
  await expect(main).toBeFocused();
  await expect(main).toHaveAttribute('data-main-focus', '');
  await page.locator('h1').click();
  await expect(main).not.toHaveAttribute('data-main-focus', '');
});

test('main text can be selected with the mouse', async ({ page }) => {
  await page.goto('/docs/quick-start/');
  const bounds = await page.evaluate(() => {
    const paragraph = document.querySelector('#main .prose p');
    const text = paragraph.firstChild;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, Math.min(12, text.textContent.length));
    return { paragraph: paragraph.getBoundingClientRect().toJSON(), text: range.getBoundingClientRect().toJSON() };
  });
  const startX = bounds.text.x + 1;
  const endX = Math.min(startX + 160, bounds.paragraph.right - 4);
  const y = bounds.text.y + bounds.text.height / 2;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(endX, y, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => getSelection()?.toString() ?? '')).not.toBe('');
});

test('mobile home sections have equal space between them', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const gaps = await page.evaluate(() => {
    const hero = document.querySelector('.hero').getBoundingClientRect();
    const notes = document.querySelector('.notes-section').getBoundingClientRect();
    const learning = document.querySelector('.start-box').getBoundingClientRect();
    return [notes.top - hero.bottom, learning.top - notes.bottom];
  });
  expect(Math.abs(gaps[0] - gaps[1])).toBeLessThan(1);
});
