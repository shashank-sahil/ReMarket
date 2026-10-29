import { test, expect } from '@playwright/test';

test.use({ launchOptions: { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' } });
const uid = '11111111-1111-4111-8111-111111111111';
const sid = '22222222-2222-4222-8222-222222222222';
const project = 'https://vuxwvgnuovghohfpjpxn.supabase.co';

// Contract tests use intercepted API responses, not live account credentials.
async function signedIn(page: any, role = 'kgpians') {
  const user = { id:uid, email:role==='kgpians'?'test@iitkgp.ac.in':'test@example.com', aud:'authenticated', role:'authenticated', phone:'919876543210', phone_confirmed_at:'2026-10-29T00:00:00Z', app_metadata:{provider:'google',providers:['google']}, user_metadata:{full_name:'Test User'}, created_at:'2026-10-29T00:00:00Z' };
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = `${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:uid,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.test-signature`;
  const session = { access_token:token, refresh_token:'test-refresh-token', expires_at:Math.floor(Date.now()/1000)+3600, expires_in:3600, token_type:'bearer', user };
  await page.context().addCookies([{name:'sb-vuxwvgnuovghohfpjpxn-auth-token',value:'base64-'+encode(session),domain:'localhost',path:'/'}]);
  await page.route(project+'/auth/v1/**', (route: any) => route.fulfill({json:user}));
  const stores: any[] = [];
  const listings: any[] = [];
  let failSave = true;
  let failItemSave = true;
  await page.route(project+'/rest/v1/**', async (route: any) => {
    const url = new URL(route.request().url()); const table = url.pathname.split('/').pop(); const method = route.request().method();
    if (table === 'profiles') return route.fulfill({json:{id:uid,full_name:'Test User',email:user.email,account_type:role,address:'RK Hall'}});
    if (table === 'entitlements') return route.fulfill({json:{store_limit:1}});
    if (table === 'stores' && method === 'POST') {
      if(failSave){failSave=false;return route.fulfill({status:403,json:{message:'Permission denied by database'}});}
      const store={...route.request().postDataJSON(),id:sid}; stores.push(store);return route.fulfill({json:store});
    }
    if (table === 'stores') return route.fulfill({json:stores});
    if (table === 'listings' && method === 'POST') {
      if (failItemSave) { failItemSave=false; return route.fulfill({status:403,json:{message:'Listing rejected by database'}}); }
      const item={...route.request().postDataJSON(),id:'33333333-3333-4333-8333-333333333333'};
      listings.push(item); return route.fulfill({json:item});
    }
    if (table === 'listings') return route.fulfill({json:listings});
    return route.fulfill({status:404,json:{message:'Unknown table'}});
  });
}

test('store save failure keeps the form and success uses the returned database row', async ({ page }) => {
  await signedIn(page);
  await page.goto('http://localhost:3000/kgpians');
  await page.getByRole('button',{name:'Create store',exact:true}).click();
  await page.getByPlaceholder('e.g. The Campus Closet').fill('Campus Finds');
  await page.locator('select').selectOption('Campus essentials');
  await page.getByPlaceholder('e.g. RK Hall').fill('RK Hall');
  await page.getByRole('button',{name:'Create free store'}).click();
  await expect(page.locator('form .kgp-form-error')).toContainText('Permission denied');
  await expect(page.getByPlaceholder('e.g. The Campus Closet')).toHaveValue('Campus Finds');
  await page.getByRole('button',{name:'Create free store'}).click();
  await expect(page.getByRole('heading',{name:'Campus Finds',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'View store',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Edit store',exact:true}).click();
  await page.getByRole('button',{name:'Add item',exact:true}).click();
  await page.getByPlaceholder('e.g. Study lamp').fill('Campus Lamp');
  await page.getByPlaceholder('e.g. 450').fill('450');
  await page.locator('form').getByRole('button',{name:'Add item',exact:true}).click();
  await expect(page.locator('form').getByRole('alert')).toContainText('Listing rejected');
  await expect(page.getByPlaceholder('e.g. Study lamp')).toHaveValue('Campus Lamp');
  await page.locator('form').getByRole('button',{name:'Add item',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Campus Lamp',exact:true})).toBeVisible();
  await page.getByRole('navigation',{name:'KGPian sections'}).getByRole('button',{name:'Search',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Campus Lamp',exact:true})).toBeVisible();
});

test('community account loads the database profile without store creation controls', async ({page}) => {
  await signedIn(page,'nonkgpians');
  await page.goto('http://localhost:3000/nonkgpians');
  await expect(page.getByRole('heading',{name:'Search.',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'My Store',exact:true})).toHaveCount(0);
  await page.getByRole('navigation',{name:'KGPian sections'}).getByRole('button',{name:'Me',exact:true}).click();
  await expect(page.getByLabel('Full name')).toHaveValue('Test User');
  await expect(page.getByRole('button',{name:'Store info',exact:true})).toBeHidden();
});
