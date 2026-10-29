import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel:'chrome', headless:true });
const page = await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1});
const errors=[]; page.on('pageerror',e=>errors.push(e.message));
const res=await page.goto('http://localhost:3000',{waitUntil:'networkidle'}); console.log('HTTP',res.status());await page.screenshot({path:'artifacts/desktop.png',fullPage:true});
console.log('title',await page.title());console.log('broken images',await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src)));
await page.setViewportSize({width:390,height:844});await page.reload({waitUntil:'networkidle'});await page.screenshot({path:'artifacts/mobile.png',fullPage:true});console.log('overflow',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));console.log('errors',errors);
await browser.close();
