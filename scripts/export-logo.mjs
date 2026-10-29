import { chromium } from '@playwright/test';
import sharp from 'sharp';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 8 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    const logo = document.querySelector('.site-header .logo');
    if (!logo) throw new Error('The Re Market logo was not found.');
    const wrapper = document.createElement('div');
    wrapper.id = 'logo-export';
    wrapper.append(logo.cloneNode(true));
    document.body.replaceChildren(wrapper);
    const style = document.createElement('style');
    style.textContent = 'html,body{background:transparent!important;margin:0!important;padding:0!important;}#logo-export{display:inline-flex;align-items:center;padding:14px 16px;width:max-content;}#logo-export .logo{font-size:24px;line-height:32px;}';
    document.head.append(style);
  });
  await page.locator('#logo-export').screenshot({ path: 'public/remarket-logo.png', omitBackground: true, animations: 'disabled' });
  const metadata = await sharp('public/remarket-logo.png').metadata();
  const corner = await sharp('public/remarket-logo.png').extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer();
  if (!metadata.hasAlpha || corner[3] !== 0) throw new Error('Transparent background verification failed.');
  console.log(JSON.stringify({ file: 'public/remarket-logo.png', width: metadata.width, height: metadata.height, transparent: true }));
} finally {
  await browser.close();
}
