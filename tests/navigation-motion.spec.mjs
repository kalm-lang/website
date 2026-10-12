import { test, expect } from '@playwright/test';

test('desktop sidebar retains actual position across clicks and browser history', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.goto('/examples/tests/');
  const surface = page.locator('.sidebar');
  await expect.poll(() => surface.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
  const before = await surface.evaluate((e) => e.scrollTop);
  const link = surface.locator('a[href="/examples/guard/"]');
  await expect(link).toBeInViewport();
  await link.click();
  await expect(page).toHaveURL(/examples\/guard\//);
  expect(await surface.evaluate((e) => e.scrollTop)).toBe(before);
  await page.goBack();
  expect(await surface.evaluate((e) => e.scrollTop)).toBe(before);
  await page.goForward();
  expect(await surface.evaluate((e) => e.scrollTop)).toBe(before);
});

test('mobile sidebar restores its own scroll surface without scrolling the article', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/examples/tests/');
  await page.locator('.topic-trigger').click();
  const surface = page.locator('.sidebar-inner');
  await expect(surface.locator('[aria-current="page"]')).toBeInViewport();
  await surface.evaluate((e) => {
    e.scrollTop += 160;
  });
  const before = await surface.evaluate((e) => e.scrollTop);
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(sessionStorage.getItem('kalm-sidebar-examples-mobile')).top),
    )
    .toBe(before);
  await expect(surface.locator('a[href="/examples/guard/"]')).toBeInViewport();
  await surface.locator('a[href="/examples/guard/"]').click();
  await page.locator('.topic-trigger').click();
  expect(await surface.evaluate((e) => e.scrollTop)).toBe(before);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.goBack();
  if ((await page.locator('.topic-trigger').getAttribute('aria-expanded')) === 'false')
    await page.locator('.topic-trigger').click();
  expect(await surface.evaluate((e) => e.scrollTop)).toBe(before);
});

test('only eligible homepage content links request navigation motion', async ({ page }) => {
  await page.addInitScript(() => {
    window.motionRequests = [];
    window.addEventListener('kalm-home-navigation', (e) =>
      window.motionRequests.push(e.detail.url),
    );
  });
  await page.goto('/');
  await page.locator('.feature-trigger').first().click();
  expect(await page.evaluate(() => window.motionRequests.length)).toBe(0);
  await page.keyboard.press('Escape');
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'docs' })
    .click();
  expect(await page.evaluate(() => sessionStorage.getItem('kalm-home-arrival'))).toBeNull();
  await page.goto('/');
  await page
    .locator('[data-home-navigation]')
    .first()
    .click({ modifiers: ['Control'] });
  expect(await page.evaluate(() => window.motionRequests.length)).toBe(0);
  // Observe the source event before the native document navigation takes place.
  await page.evaluate(() =>
    document.addEventListener('click', (e) => {
      if (e.target.closest('a[data-home-navigation]')) e.preventDefault();
    }),
  );
  await page.locator('[data-home-navigation]').first().click();
  expect(await page.evaluate(() => window.motionRequests)).toEqual([
    'http://127.0.0.1:4173/docs/quick-start/',
  ]);
});
