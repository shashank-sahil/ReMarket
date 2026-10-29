import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const [width, height] of [[320,568],[360,800],[390,844],[430,932],[600,900],[768,1024],[900,1100],[1024,768],[1440,1000],[844,390]]) {
    await page.setViewportSize({ width, height });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(250);
    const layout = await page.evaluate(() => {
      const img = document.querySelector('.hero-image').getBoundingClientRect();
      const nav = document.querySelector('.nav-wrap').getBoundingClientRect();
      return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, heroLeft: img.left, heroRight: img.right, navRight: nav.right };
    });
    expect(layout.scrollWidth, `No page overflow at ${width}`).toBeLessThanOrEqual(width);
    if (width <= 900) {
      expect(layout.heroLeft, 'Hero must fit the screen').toBeGreaterThanOrEqual(-1);
      expect(layout.heroRight, 'Hero must fit the screen').toBeLessThanOrEqual(width + 1);
      for (const selector of ['.saved-nav', '.menu-toggle', '.button-small', '.save-button', '.category-tabs button']) {
        for (const button of await page.locator(selector).all()) {
          const bounds = await button.boundingBox();
          expect(bounds.height, `${selector} touch height at ${width}`).toBeGreaterThanOrEqual(44);
          expect(bounds.width, `${selector} touch width at ${width}`).toBeGreaterThanOrEqual(44);
        }
      }
    }
    if ([320,390,768,1440].includes(width)) {
      for (const image of await page.locator('img').all()) await image.scrollIntoViewIfNeeded();
      await expect.poll(() => page.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
      await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}));
      await page.screenshot({ path: `artifacts/responsive-${width}.png`, fullPage: true });
    }
    console.log(`PASS layout ${width}×${height}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  const toggle = page.getByRole('button', { name: 'Toggle navigation' });
  await toggle.tap();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.tap();
  await page.locator('.hero-copy > p').tap();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.tap();
  await page.getByRole('link', { name: 'The marketplace', exact: true }).tap();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await page.locator('.category-tabs button').last().tap();
  await expect(page.locator('.product-card')).toHaveCount(1);
  await page.locator('.save-button').tap();
  await page.getByRole('button', { name: 'View 1 saved finds', exact: true }).tap();
  await expect(page.locator('.product-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Buy & sell', exact: true }).first().tap();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: /No, I’m not/ }).tap();
  await page.getByRole('button', { name: 'Continue with phone number' }).tap();
  expect(await page.getByLabel('Phone number').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  await page.getByRole('button', { name: 'Close sign in' }).tap();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('.hero-sticker').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  expect(errors).toEqual([]);
  console.log('PASS touch targets, unclipped hero, mobile menu Escape/outside/link dismissal, horizontal category scrolling, save/filter, mobile sign-in flow, 16px phone control, reduced motion, no runtime errors.');
} finally { await browser.close(); }


