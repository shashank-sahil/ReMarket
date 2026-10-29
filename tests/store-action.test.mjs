import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createHandler } from '../supabase/functions/store-action/handler.mjs';

const uid='11111111-1111-4111-8111-111111111111';
const storeId='22222222-2222-4222-8222-222222222222';
const user={id:uid,email:'student@kgpian.iitkgp.ac.in',email_confirmed_at:'2026-01-01',phone:'919876543210',phone_confirmed_at:'2026-01-01'};
const settings={SUPABASE_URL:'https://example.supabase.co',TWILIO_ACCOUNT_SID:'ACtest',TWILIO_AUTH_TOKEN:'test-token',TWILIO_VERIFY_SERVICE_SID:'VA'+'a'.repeat(32),RESEND_API_KEY:'test-key',STORE_OTP_FROM_EMAIL:'Re Market <hello@example.com>',STORE_OTP_HMAC_SECRET:'test-secret-that-is-longer-than-32-characters'};

function harness(overrides={}) {
  let challenge=null, completed=0, checks=0, emailCode='',demo=null,recipient='';
  const admin={
    auth:{getUser:async token=>({data:{user:token==='valid'?user:token==='other'?{...user,id:storeId}:null},error:null})},
    rpc:async (name,args)=>{
      if(name==='start_store_action'){challenge={id:args.p_id,user_id:args.p_user_id,action:args.p_action,payload:args.p_payload,email:args.p_email,phone:args.p_phone,email_code_hash:args.p_email_code_hash,test_phone:args.p_test_phone,attempts:0,used:false};return {data:challenge.id,error:null};}
      if(name==='complete_store_action'){if(!challenge || challenge.used || args.p_user_id!==challenge.user_id)return {error:{message:'already used'}};challenge.used=true;completed++;return {data:storeId,error:null};}
      throw new Error('Unexpected RPC: '+name);
    },
    from:table=>{
      if(table==='store_demo_access')return {select:()=>({eq:()=>({maybeSingle:async()=>({data:demo,error:null})})}),upsert:async data=>{demo=data;return {error:null};}};
      if(table==='stores')return {select:()=>({eq:async()=>({count:0,error:null})})};
      return {update:()=>({eq:()=>({eq:async()=>({error:null})})})};
    },
  };
  const originalRpc=admin.rpc;
  admin.rpc=(name,args)=>name==='reserve_store_action_attempt'?{single:async()=>{if(!challenge||challenge.used||challenge.user_id!==args.p_user_id||challenge.id!==args.p_id||challenge.attempts>=5)return {data:null,error:{message:'expired'}};challenge.attempts++;return {data:challenge,error:null};}}:originalRpc(name,args);
  const fetch=async(url, options)=>{
    if(url.includes('/Verifications'))return new Response(JSON.stringify({status:'pending'}),{status:200});
    if(url.includes('api.resend.com')){const message=JSON.parse(options.body);emailCode=message.text.match(/code is (\d{6})/)[1];recipient=message.to[0];return new Response('{}',{status:200});}
    if(url.includes('/VerificationCheck')){checks++;return new Response(JSON.stringify({status:new URLSearchParams(options.body).get('Code')==='123456'?'approved':'pending'}),{status:200});}
    throw new Error('Unexpected request: '+url);
  };
  const handler=createHandler({admin,env:name=>overrides[name]===null?undefined:(overrides[name]||settings[name]),fetch,crypto:webcrypto});
  async function call(body,token='valid') {const response=await handler(new Request('http://local/store-action',{method:'POST',headers:{authorization:'Bearer '+token,origin:'http://localhost:3000','content-type':'application/json'},body:JSON.stringify(body)}));return {status:response.status,body:await response.json()};}
  return {call,getEmailCode:()=>emailCode,getCompleted:()=>completed,getChecks:()=>checks,getRecipient:()=>recipient};
}

test('both fresh codes are required and a verified challenge cannot be replayed',async()=>{
  const h=harness();
  const started=await h.call({step:'start',action:'delete',payload:{id:storeId}});
  assert.equal(started.status,200);
  const challengeId=started.body.challengeId;
  const incorrectCode=h.getEmailCode()==='999999'?'000000':'999999';
  assert.equal((await h.call({step:'confirm',challengeId,emailCode:incorrectCode,phoneCode:'123456'})).status,400);
  assert.equal(h.getChecks(),0); assert.equal(h.getCompleted(),0);
  assert.equal((await h.call({step:'confirm',challengeId,emailCode:h.getEmailCode(),phoneCode:'000000'})).status,400);
  assert.equal(h.getCompleted(),0);
  assert.equal((await h.call({step:'confirm',challengeId,emailCode:h.getEmailCode(),phoneCode:'123456'})).status,200);
  assert.equal(h.getCompleted(),1);
  assert.equal((await h.call({step:'confirm',challengeId,emailCode:h.getEmailCode(),phoneCode:'123456'})).status,400);
  assert.equal(h.getCompleted(),1);
});

test('unverified sessions and missing provider settings fail closed',async()=>{
  const h=harness({RESEND_API_KEY:null});
  assert.equal((await h.call({step:'start',action:'delete',payload:{id:storeId}},'invalid')).status,401);
  const response=await h.call({step:'start',action:'delete',payload:{id:storeId}});
  assert.equal(response.status,500); assert.match(response.body.error,/not configured/);
  assert.equal(h.getCompleted(),0);
});

test('0000 and demo plans work only for an explicitly allowlisted test account',async()=>{
  const h=harness({STORE_DEMO_MODE:'true',STORE_DEMO_USER_IDS:uid,STORE_DEMO_EMAIL_TO:'demo@example.com',TWILIO_ACCOUNT_SID:null,TWILIO_AUTH_TOKEN:null,TWILIO_VERIFY_SERVICE_SID:null});
  assert.equal((await h.call({step:'verify-test-phone',phone:'+919876543210',pin:'0000'},'other')).status,403);
  assert.equal((await h.call({step:'verify-test-phone',phone:'+919876543210',pin:'1111'})).status,400);
  assert.equal((await h.call({step:'verify-test-phone',phone:'+919876543210',pin:'0000'})).status,200);
  assert.equal((await h.call({step:'demo-plan',storeLimit:5})).status,200);
  const config=await h.call({step:'config'});
  assert.equal(config.body.demoStoreLimit,5);assert.equal(config.body.demoPhoneVerified,true);
  const started=await h.call({step:'start',action:'delete',payload:{id:storeId}});
  assert.equal(started.status,200);assert.equal(started.body.testPhone,true);
  assert.equal(h.getRecipient(),'demo@example.com');
  assert.equal((await h.call({step:'confirm',challengeId:started.body.challengeId,emailCode:h.getEmailCode(),phoneCode:'0000'})).status,200);
  assert.equal(h.getChecks(),0);assert.equal(h.getCompleted(),1);
});

test('a demo email destination is ignored outside the user allowlist',async()=>{
  const h=harness({STORE_DEMO_MODE:'true',STORE_DEMO_USER_IDS:storeId,STORE_DEMO_EMAIL_TO:'demo@example.com'});
  assert.equal((await h.call({step:'start',action:'delete',payload:{id:storeId}})).status,200);
  assert.equal(h.getRecipient(),user.email);
});
