import { test, expect } from '@playwright/test';

test.use({ launchOptions: { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' } });
const uid = '11111111-1111-4111-8111-111111111111';
const sid = '22222222-2222-4222-8222-222222222222';
const project = 'https://vuxwvgnuovghohfpjpxn.supabase.co';

// Contract tests use intercepted API responses, not live account credentials.
async function signedIn(page: any, role = 'kgpians', demoEnabled=false) {
  const user = { id:uid, email:role==='kgpians'?'test@iitkgp.ac.in':'test@example.com', email_confirmed_at:'2026-10-29T00:00:00Z', aud:'authenticated', role:'authenticated', phone:'919876543210', phone_confirmed_at:'2026-10-29T00:00:00Z', app_metadata:{provider:'google',providers:['google']}, user_metadata:{full_name:'Test User'}, created_at:'2026-10-29T00:00:00Z' };
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = `${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:uid,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.test-signature`;
  const session = { access_token:token, refresh_token:'test-refresh-token', expires_at:Math.floor(Date.now()/1000)+3600, expires_in:3600, token_type:'bearer', user };
  await page.context().addCookies([{name:'sb-vuxwvgnuovghohfpjpxn-auth-token',value:'base64-'+encode(session),domain:'localhost',path:'/'}]);
  await page.route(project+'/auth/v1/**', (route: any) => route.fulfill({json:user}));
  const stores: any[] = [];
  if(demoEnabled)stores.push({id:sid,owner_id:uid,name:'Campus Finds',store_id:'campus-finds',category:'Campus essentials',hall:'RK Hall',banner:'',tagline:'',description:'',address:''});
  const listings: any[] = [];
  let failSave = true;
  let failItemSave = true;
  let pending: any;
  let demoLimit=1;
  let demoPhoneVerified=false,phoneFailure=true;
  await page.route(project+'/functions/v1/store-action', async (route: any) => {
    const headers = {'Access-Control-Allow-Origin':'http://localhost:3000','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
    if (route.request().method()==='OPTIONS') return route.fulfill({status:204,headers});
    const body=route.request().postDataJSON();
    if(body.step==='config') return route.fulfill({headers,json:{demoEnabled,demoStoreLimit:demoEnabled?demoLimit:null,demoPhoneVerified,demoPhone:demoPhoneVerified?'+919876543210':null}});
    if(body.step==='verify-test-phone'){
      if(body.pin!=='0000')return route.fulfill({status:400,headers,json:{error:'Use PIN 0000'}});
      if(phoneFailure){phoneFailure=false;return route.fulfill({status:500,headers,json:{error:'Temporary verification service failure'}});}
      demoPhoneVerified=true;return route.fulfill({headers,json:{ok:true}});
    }
    if(body.step==='demo-plan'){demoLimit=body.storeLimit;return route.fulfill({headers,json:{ok:true}});}
    if (body.step==='start') { pending=body; return route.fulfill({headers,json:{challengeId:'44444444-4444-4444-8444-444444444444'}}); }
    if (body.emailCode!=='123456' || body.phoneCode!=='654321') return route.fulfill({status:400,headers,json:{error:'Invalid codes'}});
    if (failSave) {failSave=false;return route.fulfill({status:403,headers,json:{error:'Permission denied by database'}});}
    if (pending.action==='create') stores.push({...pending.payload,id:sid,owner_id:uid});
    else {stores.splice(0,stores.length);listings.splice(0,listings.length);}
    return route.fulfill({headers,json:{id:sid}});
  });
  await page.route(project+'/rest/v1/**', async (route: any) => {
    const url = new URL(route.request().url()); const table = url.pathname.split('/').pop(); const method = route.request().method();
    if (table === 'profiles') return route.fulfill({json:{id:uid,full_name:'Test User',email:user.email,account_type:role,address:'RK Hall'}});
    if (table === 'entitlements') return route.fulfill({json:{store_limit:1}});
    if (table === 'stores' && ['POST','DELETE'].includes(method)) return route.fulfill({status:403,json:{message:'Direct store mutation forbidden'}});
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

test('store actions require both codes and rejected writes preserve the form', async ({ page }) => {
  await signedIn(page);
  await page.goto('http://localhost:3000/kgpians');
  await page.getByRole('button',{name:'Create store',exact:true}).click();
  await page.getByPlaceholder('e.g. The Campus Closet').fill('Campus Finds');
  await page.locator('select').selectOption('Campus essentials');
  await page.getByPlaceholder('e.g. RK Hall').fill('RK Hall');
  await page.getByRole('button',{name:'Create free store'}).click();
  await page.getByRole('button',{name:'Send verification codes'}).click();
  await page.getByLabel('Email code').fill('123456');
  await page.getByLabel('Phone code').fill('654321');
  await page.getByRole('button',{name:'Verify and create store'}).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Permission denied');
  await expect(page.getByPlaceholder('e.g. The Campus Closet')).toHaveValue('Campus Finds');
  await page.getByRole('button',{name:'Verify and create store'}).click();
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
  await page.getByRole('navigation',{name:'KGPian sections'}).getByRole('button',{name:'My Store',exact:true}).click();
  await page.getByRole('button',{name:'Delete Campus Finds'}).click();
  await expect(page.getByRole('dialog')).toContainText('permanently removes its listings');
  await page.getByRole('button',{name:'Send verification codes'}).click();
  await page.getByLabel('Email code').fill('123456');
  await page.getByLabel('Phone code').fill('000000');
  await page.getByRole('button',{name:'Verify and delete store'}).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Invalid codes');
  await page.getByLabel('Phone code').fill('654321');
  await page.getByRole('button',{name:'Verify and delete store'}).click();
  await expect(page.getByRole('heading',{name:'Your store starts here.'})).toBeVisible();
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

test('the free-store limit opens demo plans and Pro adds a badge',async({page})=>{
  await signedIn(page,'kgpians',true);
  await page.goto('http://localhost:3000/kgpians');
  await expect(page.getByText('Free plan',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Create another store'}).click();
  await expect(page.getByRole('dialog')).toContainText('Find your fit.');
  await expect(page.getByRole('dialog')).toContainText('No payment is taken.');
  await page.getByRole('button',{name:'Try Pro demo'}).click();
  await expect(page.getByText('Pro plan',{exact:true})).toBeVisible();
  await expect(page.locator('.kgp-sidebar-top .kgp-pro-badge')).toBeVisible();
  await page.getByRole('button',{name:'Create another store'}).click();
  await expect(page.getByRole('heading',{name:'Create your store.'})).toBeVisible();
});

test('phone PIN has an explicit mobile confirmation button and actionable server errors',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await signedIn(page,'kgpians',true);
  await page.goto('http://localhost:3000/kgpians');
  await page.getByRole('navigation',{name:'KGPian mobile navigation'}).getByRole('button',{name:'Me',exact:true}).click();
  await page.getByLabel('Phone number',{exact:true}).fill('9876543210');
  await page.getByRole('button',{name:'Continue with test PIN'}).click();
  await page.getByLabel('Test PIN',{exact:true}).fill('0000');
  await expect(page.getByRole('button',{name:'Verify phone number',exact:true})).toBeVisible();
  await page.getByLabel('Test PIN',{exact:true}).press('Enter');
  await expect(page.getByRole('alert').filter({hasText:'Temporary verification service failure'})).toContainText('(500)');
  await expect(page.getByLabel('Test PIN',{exact:true})).toHaveValue('0000');
  await page.getByRole('button',{name:'Verify phone number',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Test phone confirmed.');
});
