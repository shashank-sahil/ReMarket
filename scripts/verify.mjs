import { chromium, expect } from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:3000',{waitUntil:'networkidle'});
await expect(page.getByRole('heading',{level:1})).toContainText('Second beginnings.');
await expect(page.locator('.product-card')).toHaveCount(5);
await page.getByRole('button',{name:'Cycles',exact:true}).click();await expect(page.locator('.product-card')).toHaveCount(1);
await page.getByRole('button',{name:'All finds',exact:true}).click();
await page.getByRole('searchbox').fill('focus');await expect(page.locator('.product-card')).toHaveCount(1);
await page.getByRole('searchbox').fill('no-match-123');await expect(page.locator('.empty-state')).toBeVisible();
await page.getByRole('searchbox').fill('');
await page.getByRole('button',{name:'Save Your new focus mode.',exact:true}).click();
await page.reload({waitUntil:'networkidle'});await expect(page.getByRole('button',{name:'Unsave Your new focus mode.',exact:true})).toBeVisible();
await page.getByRole('button',{name:'View 1 saved finds',exact:true}).click();await expect(page.locator('.product-card')).toHaveCount(1);
await page.getByRole('button',{name:'Show all',exact:true}).click();
await expect(page.locator('.product-image-button').first()).not.toHaveAttribute('role','button');
await expect(page.getByRole('button',{name:'Make room for something new'})).toHaveCount(0);
await page.getByRole('button',{name:'Unsave Your new focus mode.',exact:true}).click();
await page.getByText('Is Re Market live yet?',{exact:true}).click();await expect(page.locator('details[open]')).toHaveCount(1);
await page.getByText('Is Re Market live yet?',{exact:true}).click();
for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:width===1440?1000:844});await page.goto('http://localhost:3000',{waitUntil:'networkidle'});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(1000);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await page.locator('img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0))).toBe(true);await page.screenshot({path:`artifacts/width-${width}.png`,fullPage:true});}
await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Toggle navigation'}).click();await expect(page.getByRole('navigation')).toBeVisible();await page.getByRole('link',{name:'How it works',exact:true}).click();await expect(page.getByRole('navigation')).not.toBeVisible();
expect(errors).toEqual([]);console.log('PASS: filtering, search, empty state, saved item persistence, saved filter, static listing cards, FAQ, mobile navigation, image loading, overflow at 1440/768/390/320px, no runtime errors.');
await browser.close();

