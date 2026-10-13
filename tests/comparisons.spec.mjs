import { test, expect } from '@playwright/test';
const choose = async (page, values) => {
  await page.getByRole('button', { name: 'Code preferences', exact: true }).click();
  const keys = { Language: 'dialect', Blocks: 'style', 'Operating system': 'os', Shell: 'shell' };
  for (const [name, value] of Object.entries(values)) {
    if (['Operating system', 'Shell'].includes(name) && !await page.locator('.preferences-popover details').evaluate(e => e.open))
      await page.locator('.preferences-popover summary').click();
    await page.locator(`.preferences-popover [data-preference="${keys[name]}"][data-value="${value}"]`).click();
  }
  await page.getByRole('button', { name: 'Code preferences', exact: true }).click();
};
const pane = (group, language) => group.locator('[data-language="' + language + '"]:visible');

test('preferences persist while Java and comparison state stay local and copying stays accurate', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/docs/language/functions/');
  const groups = page.locator('kalm-code-compare');
  await groups.first().getByRole('tab', { name: 'Java', exact: true }).click();
  await expect(pane(groups.first(), 'java')).toBeVisible();
  await choose(page, { Language: 'kalms', Blocks: 'braces' });
  await expect(pane(groups.first(), 'java')).toBeVisible();
  await expect(pane(groups.nth(1), 'kalms')).toHaveAttribute('data-style', 'braces');
  await groups.first().getByRole('button', { name: 'Compare side by side' }).click();
  await expect(pane(groups.first(), 'kalms')).toBeVisible();
  const java = pane(groups.first(), 'java');
  await java.getByRole('button', { name: 'Copy code' }).click();
  expect((await page.evaluate(() => navigator.clipboard.readText())).replaceAll('\r\n', '\n')).toBe(
    await java.locator('code').textContent(),
  );
  await expect(java.locator('.copy-button')).toContainText('Copied');
  await page.goto('/examples/fix/');
  await expect(pane(page.locator('kalm-code-compare'), 'kalms')).toHaveAttribute(
    'data-style',
    'braces',
  );
  await page.goBack();
  await expect(pane(groups.first(), 'java')).toHaveCount(0);
  await expect(
    groups.first().getByRole('button', { name: 'Compare side by side' }),
  ).toHaveAttribute('aria-pressed', 'false');
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('kalm-code-preferences'))),
  ).toMatchObject({ version: 1, dialect: 'kalms', style: 'braces', spaces: 4 });
});

test('greeting frame touches output and retains its name at the selected source natural height', async ({
  page,
}) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: 'Greeting name' });
  await input.fill('Nora');
  await expect(page.locator('[data-greeting-output]')).toHaveText('Hello, Nora!');
  for (const Language of ['kalms', 'kalm'])
    for (const Blocks of ['braces', 'indentation']) {
      await choose(page, { Language, Blocks });
      await expect(input).toHaveValue('Nora');
      await expect(input).toBeVisible();
      await expect.poll(() => page.locator('kalm-greeting-demo .comparison-panes').evaluate(e => getComputedStyle(e).height === 'auto' || !e.style.height)).toBe(true);
      const edges = await page
        .locator('kalm-greeting-demo')
        .evaluate((e) => ({
          code: e.querySelector('kalm-code-compare').getBoundingClientRect().bottom,
          output: e.querySelector('.greeting-output').getBoundingClientRect().top,
          pane: e.querySelector('.comparison-panes > section:not([hidden])').getBoundingClientRect().height,
          frame: e.querySelector('.comparison-panes').getBoundingClientRect().height,
        }));
      expect(Math.abs(edges.code - edges.output)).toBeLessThan(1);
      expect(Math.abs(edges.pane - edges.frame)).toBeLessThan(1);
    }
  await expect(page.locator('.feature-number')).toHaveCount(0);
  await expect(page.locator('kalm-greeting-demo [data-language="java"]')).toHaveCount(0);
});

test('environment commands and quick-start instructions match preferences', async ({ page }) => {
  await page.goto('/docs/quick-start/');
  await choose(page, { Language: 'kalms', 'Operating system': 'windows', Shell: 'cmd' });
  await expect(page.locator('.prose')).toContainText('save App.kalms directly inside it');
  await expect(page.locator('[data-shell="cmd"]:visible').first()).toContainText('set "PATH=%CD%');
  await expect(page.locator('[data-shell="cmd"]:visible').last()).toContainText(
    'kalm.bat shell -f App.kalms',
  );
  for (const [os, shell] of [
    ['windows', 'powershell'],
    ['macos', 'zsh'],
    ['linux', 'bash'],
  ]) {
    await choose(page, { 'Operating system': os, Shell: 'auto' });
    await expect(page.locator('html')).toHaveAttribute('data-code-shell', shell);
    await expect(
      page.locator('[data-shell="' + shell + '"][data-os="' + os + '"]:visible').first(),
    ).toBeVisible();
  }
});

test('independent showcase locks preserve styles and cooperating source sets without language tabs', async ({
  page,
}) => {
  await page.goto('/examples/layout/');
  const group = page.locator('kalm-code-compare');
  await expect(group.getByRole('tab')).toHaveCount(0);
  await choose(page, { Language: 'kalms', Blocks: 'braces' });
  await expect(pane(group, 'kalms')).toHaveCount(2);
  await expect(pane(group, 'kalm')).toHaveCount(0);
  await expect(pane(group, 'kalms').nth(0)).toHaveAttribute('data-style', 'indentation');
  await expect(pane(group, 'kalms').nth(1)).toHaveAttribute('data-style', 'braces');
  await page.goto('/examples/java-to-kalm/');
  await expect(group.getByRole('tab')).toHaveCount(0);
  await expect(pane(group, 'kalm')).toHaveAttribute('data-style', 'braces');
  await expect(pane(group, 'java')).toContainText('GreetingKalm.greeting');
  await choose(page, { Blocks: 'indentation' });
  await expect(pane(group, 'kalm')).toHaveAttribute('data-style', 'indentation');
});

test('fallback is prominent only while a Kalm fallback is visible', async ({ page }) => {
  await page.goto('/examples/tests/');
  await choose(page, { Language: 'kalms' });
  await expect(page.locator('.script-unavailable strong')).toHaveText(
    'Kalm Script unavailable — showing Kalm',
  );
  await expect(page.locator('.script-unavailable')).not.toContainText(
    'The Kalm project example is shown.',
  );
  await page.getByRole('tab', { name: 'Java', exact: true }).click();
  await expect(page.locator('.script-unavailable')).toBeHidden();
  await page.getByRole('button', { name: 'Compare side by side' }).click();
  await expect(page.locator('.script-unavailable')).toBeVisible();
});

test('comparison widens without moving prose and stacks below two readable columns', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/examples/fix/');
  const group = page.locator('kalm-code-compare'),
    before = await group.boundingBox();
  const sidebar = await page.locator('.sidebar').boundingBox();
  const paragraph = await page.locator('.prose > p').first().boundingBox();
  await group.getByRole('button', { name: 'Compare side by side' }).click();
  await expect.poll(async () => (await group.boundingBox()).width).toBeGreaterThan(before.width);
  await expect(group).toHaveAttribute('data-stacked', 'false');
  expect((await group.boundingBox()).x).toBe(before.x);
  expect(await page.locator('.sidebar').boundingBox()).toEqual(sidebar);
  expect(await page.locator('.prose > p').first().boundingBox()).toEqual(paragraph);
  for (const width of [768, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(group).toHaveAttribute('data-stacked', 'true');
    const left = await pane(group, 'kalm').boundingBox(),
      right = await pane(group, 'java').boundingBox();
    expect(right.y).toBeGreaterThanOrEqual(left.y + left.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test('blocked storage and rapid changes remain usable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('Blocked');
      },
    });
  });
  await page.goto('/examples/fix/');
  await choose(page, { Language: 'kalms', Blocks: 'braces' });
  const group = page.locator('kalm-code-compare');
  await group.getByRole('tab', { name: 'Java', exact: true }).click();
  await group.getByRole('tab', { name: 'Kalm Script', exact: true }).click();
  await expect(pane(group, 'kalms')).toHaveAttribute('data-style', 'braces');
  await expect
    .poll(() => group.locator('.comparison-panes').evaluate((e) => getComputedStyle(e).opacity))
    .toBe('1');
});

test('migration and source selection happen before enhancement', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kalm-dialect', 'kalms'));
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route('**/*.js', async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto('/examples/fix/', { waitUntil: 'commit' });
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-language="kalms"][data-style="indentation"]')).toBeVisible();
    await expect(page.locator('[data-language="kalm"][data-style="indentation"]')).toBeHidden();
    expect(
      await page.evaluate(() => JSON.parse(localStorage.getItem('kalm-code-preferences'))),
    ).toMatchObject({ version: 1, dialect: 'kalms', style: 'indentation' });
  } finally {
    release();
    await page.waitForLoadState('load');
  }
});
