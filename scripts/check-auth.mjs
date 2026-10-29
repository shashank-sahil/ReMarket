import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await expect(page.getByRole('button', { name: 'Buy & sell', exact: true })).toHaveCount(2);
  await expect(page.getByText('Pass something on', { exact: true })).toHaveCount(0);
  for (const index of [0, 1]) {
    const trigger = page.getByRole('button', { name: 'Buy & sell', exact: true }).nth(index);
    await trigger.click();
    const dialog = page.locator('dialog.auth-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Do you have an IIT Kharagpur email?', { exact: false })).toBeVisible();
    await page.waitForTimeout(750);
    if(index===1) await page.screenshot({path:'artifacts/auth-choice-desktop.png'});
    await dialog.getByRole('button', { name: /Yes, I’m a KGPian/ }).click();
    await expect(dialog.getByText('@iitkgp.ac.in')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Continue with phone number' })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Continue with Google' }).click();
    await expect(dialog.getByRole('status')).toContainText('No account has been created');
    await dialog.getByRole('button', { name: 'Back' }).click();
    await dialog.getByRole('button', { name: /No, I’m not/ }).click();
    await expect(dialog.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Continue with phone number' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Continue with phone number' }).click();
    await dialog.getByLabel('Phone number').fill('9876543210');
    await dialog.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(dialog.getByRole('status')).toContainText('No verification message has been sent');
    await dialog.getByRole('button', { name: 'Back' }).click();
    await expect(dialog.getByRole('button', { name: 'Continue with phone number' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
  for (const [width,height] of [[320,568],[390,844],[768,1024],[844,390]]) {
    await page.setViewportSize({ width, height });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.getByRole('button', { name: 'Buy & sell', exact: true }).first().click();
    await page.waitForTimeout(750);
    const card = page.locator('.auth-card');
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    if(width===390) await page.screenshot({path:'artifacts/auth-choice-mobile.png'});
    await page.getByRole('button', { name: /No, I’m not/ }).click();
    await page.getByRole('button', { name: 'Continue with phone number' }).click();
    if(width===390) await page.screenshot({path:'artifacts/auth-phone-mobile.png'});
    await page.getByRole('button', { name: 'Close sign in' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Buy & sell', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('.auth-dialog-scroll').click({ position: { x: 2, y: 2 } });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
  console.log('PASS: both entry buttons, KGP Google-only path, guest Google/phone path, phone UI, preview notices, back navigation, Escape and focus return, outside dismissal, reduced motion, phone/tablet/landscape layouts, no runtime errors.');
} finally { await browser.close(); }

