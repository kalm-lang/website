import {expect, test} from '@playwright/test';
import {markdown} from '../scripts/render.mjs';

async function olderContent(page, capabilities, languages) {
  const sources = { kalm: 'pub fun main() -> Unit: sayLine("Hello")', kalms: 'sayLine("Hello")', java: 'class App {}' };
  const group = ':::compare\n' + languages.map(language => '```' + language + '\n' + sources[language] + '\n```\n').join('') + ':::\n';
  const content = markdown(group, 'content/examples/fix.md');
  await page.route('**/examples/fix/', async route => {
    const response = await route.fetch();
    const body = (await response.text())
      .replace(/data-code-capabilities="[^"]*"/, 'data-code-capabilities="' + JSON.stringify(capabilities).replaceAll('"', '&quot;') + '"')
      .replace(/<article class="article[^\"]*">[\s\S]*?<\/article>/, '<article class="article example-article"><h1>Compatibility example</h1><div class="prose">' + content + '</div></article>');
    await route.fulfill({ response, body });
  });
}

test('older content hides unsupported controls and applies safe saved-preference fallbacks', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kalm-code-preferences', JSON.stringify({ version: 1, dialect: 'kalms', style: 'braces' })));
  await olderContent(page, { dialect: false, style: false, environment: false }, ['kalm']);
  await page.goto('/examples/fix/');
  await expect(page.locator('kalm-code-compare')).toHaveAttribute('data-ready', '');
  await expect(page.getByRole('button', { name: 'Code preferences', exact: true })).toHaveCount(0);
  await expect(page.getByRole('tab')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Compare side by side' })).toHaveCount(0);
  await expect(page.locator('[data-language="kalm"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy code' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-dialect', 'kalm');
  await expect(page.locator('html')).toHaveAttribute('data-code-style', 'indentation');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('kalm-code-preferences')))).toMatchObject({ dialect: 'kalms', style: 'braces' });
});

test('partial content keeps available preferences and Java comparison working', async ({ page }) => {
  await olderContent(page, { dialect: true, style: false, environment: false }, ['kalm', 'kalms', 'java']);
  await page.goto('/examples/fix/');
  await page.getByRole('button', { name: 'Code preferences', exact: true }).click();
  await expect(page.locator('[data-setting="dialect"]')).toBeVisible();
  await expect(page.locator('[data-setting="style"]')).toBeHidden();
  await expect(page.locator('.preference-environment')).toBeHidden();
  await page.locator('[data-preference="dialect"][data-value="kalms"]').click();
  await page.getByRole('button', { name: 'Code preferences', exact: true }).click();
  await expect(page.locator('[data-language="kalms"]')).toBeVisible();
  await page.getByRole('tab', { name: 'Java', exact: true }).click();
  await expect(page.locator('[data-language="java"]')).toBeVisible();
  await page.getByRole('button', { name: 'Compare side by side' }).click();
  await expect(page.locator('[data-language="kalms"]')).toBeVisible();
  await expect(page.locator('[data-language="java"]')).toBeVisible();
});

test('a Java-only group remains visible without language or comparison controls', async ({ page }) => {
  await olderContent(page, { dialect: false, style: false, environment: false }, ['java']);
  await page.goto('/examples/fix/');
  await expect(page.locator('[data-language="java"]')).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Compare side by side' })).toHaveCount(0);
});
