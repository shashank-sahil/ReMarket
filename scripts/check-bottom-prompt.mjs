import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  for (const [width, height] of [[1440,900], [390,844], [320,568]]) {
    await page.setViewportSize({ width, height }); await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await expect(page.locator('.campus-badge, .tiny-star, .re-spark, .cta-flower, .auth-mini-star, .auth-bubble-one')).toHaveCount(0);
    await expect(page.getByRole('button', {name:'Make room for something new'})).toHaveCount(0);
    await expect(page.locator('.product-image-button button, button.product-image-button, button.product-info')).toHaveCount(0);
    await expect(page.locator('#main-navigation a').first()).toHaveAttribute('href', '#explore');
    await page.evaluate(() => window.scrollTo({top: document.documentElement.scrollHeight - innerHeight - 40, behavior:'instant'}));
    await page.waitForTimeout(150); await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.evaluate(() => window.scrollTo({top: document.documentElement.scrollHeight, behavior:'instant'}));
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', {name:/Hey, are you/})).toBeVisible();
    await page.getByRole('button', {name:'Close sign in'}).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
    const atBottom = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight - scrollY);
    expect(atBottom).toBeLessThanOrEqual(2);
    await page.evaluate(() => window.scrollBy({top:-150,behavior:'instant'}));
    await page.evaluate(() => window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
    await page.waitForTimeout(250); await expect(page.getByRole('dialog')).toHaveCount(0);
    console.log(`PASS automatic prompt ${width}×${height}`);
  }
  expect(errors).toEqual([]); console.log('PASS removal, preserved anchor navigation, prompt only at bottom, one-time dismissal, scroll position, no runtime errors.');
} finally { await browser.close(); }
