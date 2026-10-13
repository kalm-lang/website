import {expect, test} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {capabilities} from '../scripts/content.mjs';

test('review light and dark frames at phone, tablet, desktop and enlarged text',async({page})=>{
  test.skip(!Object.values(capabilities).every(Boolean), 'Installed documentation omits the reviewed code preferences and comparisons.');
  test.setTimeout(120000);
  const root=resolve('build/review');mkdirSync(root,{recursive:true});
  for(const theme of ['light','dark']) for(const [name,width] of [['phone',390],['tablet',768],['desktop',1600]]) {
    await page.setViewportSize({width,height:900});await page.goto('/');
    await page.locator('kalm-theme-toggle .theme-trigger').click();await page.locator('[data-theme-choice="'+theme+'"]').click();
    await expect(page.locator('[data-greeting-output]')).toHaveText(/^Hello, .+!$/);
    await page.screenshot({path:resolve(root,name+'-'+theme+'-home.png')});
    await page.getByRole('button',{name:'Code preferences',exact:true}).click();
    await expect(page.locator('.preferences-popover')).toBeInViewport();
    await expect.poll(()=>page.locator('.preferences-popover').evaluate(e=>getComputedStyle(e).opacity)).toBe('1');
    await page.screenshot({path:resolve(root,name+'-'+theme+'-preferences.png')});
    await page.getByRole('button',{name:'Code preferences',exact:true}).click();
    await page.goto('/examples/fix/');await page.getByRole('button',{name:'Compare side by side'}).click();
    await expect(page.locator('kalm-code-compare')).toHaveAttribute('data-layout','split');
    await expect.poll(()=>page.locator('.comparison-panes').evaluate(e=>getComputedStyle(e).opacity)).toBe('1');
    await page.screenshot({path:resolve(root,name+'-'+theme+'-comparison.png')});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.evaluate(()=>document.documentElement.style.fontSize='200%');
    await page.getByRole('button',{name:'Code preferences',exact:true}).click();
    await expect.poll(()=>page.locator('.preferences-popover').evaluate(e=>getComputedStyle(e).opacity)).toBe('1');
    await page.screenshot({path:resolve(root,name+'-'+theme+'-large-text.png')});
    expect(await page.locator('.preferences-popover').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  }
});
