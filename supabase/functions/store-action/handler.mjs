const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const encoder = new TextEncoder();

export function createHandler({ admin, env, fetch: request, crypto }) {
  const allowedOrigins = new Set((env('STORE_ACTION_ALLOWED_ORIGINS') || 'http://localhost:3000,https://re-market-kgp.saud182184.chatgpt.site').split(',').map(x => x.trim()));
  const configured = name => { const value = env(name); if (!value) throw new Error('Store verification is not configured yet.'); return value; };
  function headers(origin) {
    return { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : '', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin', 'Cache-Control': 'no-store' };
  }
  const reply = (origin, status, data) => new Response(JSON.stringify(data), { status, headers: headers(origin) });
  async function signature(challengeId, code) {
    const secret = configured('STORE_OTP_HMAC_SECRET');
    if (secret.length < 32) throw new Error('Store verification is not configured yet.');
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
    const result = await crypto.subtle.sign('HMAC', key, encoder.encode(`${challengeId}:${code}`));
    return Array.from(new Uint8Array(result), byte => byte.toString(16).padStart(2,'0')).join('');
  }
  function sameHash(a,b) {
    if (a.length !== b.length) return false;
    let difference = 0;
    for (let i=0; i<a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return difference === 0;
  }
  function code() {
    const numbers = new Uint32Array(1);
    do { crypto.getRandomValues(numbers); } while (numbers[0] >= 4294000000);
    return String(numbers[0] % 1000000).padStart(6,'0');
  }
  async function twilio(resource, params) {
    const sid = configured('TWILIO_ACCOUNT_SID');
    const token = configured('TWILIO_AUTH_TOKEN');
    const service = configured('TWILIO_VERIFY_SERVICE_SID');
    if (!/^VA[0-9a-f]{32}$/i.test(service)) throw new Error('Store verification is not configured yet.');
    const response = await request(`https://verify.twilio.com/v2/Services/${service}/${resource}`, {
      method:'POST', headers: { Authorization:`Basic ${btoa(`${sid}:${token}`)}`, 'Content-Type':'application/x-www-form-urlencoded' },
      body:new URLSearchParams(params),
    });
    if (!response.ok) throw new Error('Could not verify your phone. Please try again later.');
    return await response.json();
  }
  async function sendEmail(email, emailCode, action, testPhone=false) {
    const key = configured('RESEND_API_KEY'); const from = configured('STORE_OTP_FROM_EMAIL');
    const response = await request('https://api.resend.com/emails', {
      method:'POST', headers: { Authorization:`Bearer ${key}`, 'Content-Type':'application/json' },
      body: JSON.stringify({ from, to:[email], subject:`Re Market: confirm store ${action === 'create' ? 'creation' : 'deletion'}`,
        text:`Your email verification code is ${emailCode}. It expires in 10 minutes. Enter it in Re Market along with ${testPhone ? 'the test phone PIN 0000 (no SMS is sent)' : 'the SMS code'} to confirm your store ${action === 'create' ? 'creation' : 'deletion'}. If you did not request this, ignore this email.` }),
    });
    if (!response.ok) throw new Error('Could not send the email code. Please try again later.');
  }
  return async req => {
    const origin = req.headers.get('origin') || '';
    if (req.method === 'OPTIONS') return new Response(null, { status:204, headers:headers(origin) });
    if (req.method !== 'POST') return reply(origin,405,{error:'Method not allowed.'});
    try {
      const bearer = req.headers.get('authorization') || '';
      if (!bearer.startsWith('Bearer ')) return reply(origin,401,{error:'Please sign in again.'});
      const { data: { user }, error: authError } = await admin.auth.getUser(bearer.slice(7));
      if (authError || !user) return reply(origin,401,{error:'Please sign in again.'});
      if (!user.email || !user.email_confirmed_at) return reply(origin,400,{error:'Verify your registered email first.'});
      const rawBody = await req.text();
      if (rawBody.length > 16384) return reply(origin,413,{error:'Request is too large.'});
      let body;
      try { body = JSON.parse(rawBody); } catch { return reply(origin,400,{error:'Invalid request.'}); }
      const demoEnabled = env('STORE_DEMO_MODE') === 'true' && (env('STORE_DEMO_USER_IDS') || '').split(',').map(x => x.trim()).includes(user.id);
      const demoEmail = demoEnabled ? env('STORE_DEMO_EMAIL_TO')?.trim() : undefined;
      let demo=null;
      if (demoEnabled) {
        const result=await admin.from('store_demo_access').select('*').eq('user_id',user.id).maybeSingle();
        if (result.error) return reply(origin,503,{error:'Store verification database setup is required.'});
        demo=result.data && Date.parse(result.data.expires_at)>Date.now() ? result.data : null;
      }
      const demoPhone = Boolean(demoEnabled && demo?.phone_verified);
      if (body.step === 'config') return reply(origin,200,{demoEnabled,demoPhoneVerified:demoPhone,demoPhone:demoPhone?demo.phone:null,demoStoreLimit:demo?.plan_limit ?? null,demoEmailDestination:demoEmail || null});
      if (body.step === 'verify-test-phone' || body.step === 'demo-plan') {
        if (!demoEnabled) return reply(origin,403,{error:'Demo access is not enabled for this account.'});
        if (body.step === 'verify-test-phone' && (body.pin !== '0000' || !/^\+[1-9]\d{7,14}$/.test(body.phone || ''))) return reply(origin,400,{error:'Enter a valid phone number and the test PIN 0000.'});
        if (body.step === 'demo-plan' && ![1,5].includes(body.storeLimit)) return reply(origin,400,{error:'Invalid demo plan.'});
        if (body.step === 'demo-plan' && body.storeLimit === 1) {
          const {count,error}=await admin.from('stores').select('id',{count:'exact',head:true}).eq('owner_id',user.id);
          if (error) throw error;
          if (count>1) return reply(origin,400,{error:'Delete extra stores before switching to Free.'});
        }
        const data={user_id:user.id,phone:demo?.phone ?? null,phone_verified:demo?.phone_verified ?? false,plan_limit:demo?.plan_limit ?? null,expires_at:new Date(Date.now()+86400000).toISOString()};
        if(body.step==='verify-test-phone'){data.phone=body.phone;data.phone_verified=true;}else data.plan_limit=body.storeLimit;
        const {error}=await admin.from('store_demo_access').upsert(data);
        if(error) throw error;
        return reply(origin,200,{ok:true});
      }
      if (!demoPhone && (!user.phone || !user.phone_confirmed_at)) return reply(origin,400,{error:'Verify your phone in Personal info first.'});
      const email=user.email, registeredPhone=demoPhone?demo.phone:user.phone;
      const phone=registeredPhone.startsWith('+')?registeredPhone:`+${registeredPhone}`;
      if (body.step === 'start') {
        if (!['create','delete'].includes(body.action) || !body.payload || typeof body.payload !== 'object') return reply(origin,400,{error:'Invalid store action.'});
        const action = body.action;
        let payload;
        if (action === 'delete') {
          if (!UUID.test(body.payload.id || '')) return reply(origin,400,{error:'Invalid store.'});
          payload = {id:body.payload.id};
        } else {
          const p=body.payload;
          if (typeof p.name !== 'string' || !p.name.trim() || p.name.trim().length > 60 || typeof p.store_id !== 'string' || !/^[a-z0-9-]{3,30}$/.test(p.store_id) || typeof p.category !== 'string' || !p.category || p.category.length > 80 || typeof p.hall !== 'string' || !p.hall.trim() || p.hall.length > 80 || typeof p.tagline !== 'string' || p.tagline.length > 100 || typeof p.description !== 'string' || p.description.length > 500 || typeof p.address !== 'string' || p.address.length > 160 || typeof p.banner !== 'string' || p.banner.length > 2000) return reply(origin,400,{error:'Please check your store details.'});
          payload = {name:p.name.trim(),store_id:p.store_id,category:p.category,hall:p.hall.trim(),tagline:p.tagline,description:p.description,address:p.address,banner:p.banner};
        }
        // Check all provider settings before creating a challenge or sending anything.
        for (const name of ['RESEND_API_KEY','STORE_OTP_FROM_EMAIL','STORE_OTP_HMAC_SECRET',...(!demoPhone?['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_VERIFY_SERVICE_SID']:[])]) configured(name);
        const id=crypto.randomUUID(); const emailCode=code(); const hash=await signature(id,emailCode);
        const {error} = await admin.rpc('start_store_action',{p_id:id,p_user_id:user.id,p_action:action,p_payload:payload,p_email:email,p_phone:registeredPhone,p_email_code_hash:hash,p_test_phone:demoPhone});
        if (error) return reply(origin,400,{error:error.message});
        try {
          if (!demoPhone) await twilio('Verifications',{To:phone,Channel:'sms'});
          await sendEmail(demoEmail || email,emailCode,action,demoPhone);
        } catch (error) {
          await admin.from('store_action_challenges').update({consumed_at:new Date().toISOString()}).eq('id',id).eq('user_id',user.id);
          throw error;
        }
        return reply(origin,200,{challengeId:id,testPhone:demoPhone});
      }
      if (body.step === 'confirm') {
        if (!UUID.test(body.challengeId || '') || !/^\d{6}$/.test(body.emailCode || '') || !/^\d{4,10}$/.test(body.phoneCode || '')) return reply(origin,400,{error:'Enter both verification codes.'});
        const {data:challenge,error} = await admin.rpc('reserve_store_action_attempt',{p_id:body.challengeId,p_user_id:user.id}).single();
        if (error || !challenge) return reply(origin,400,{error:'Verification expired or too many attempts. Request new codes.'});
        if (challenge.email !== email || challenge.phone !== registeredPhone || !sameHash(await signature(challenge.id,body.emailCode),challenge.email_code_hash)) return reply(origin,400,{error:'The codes could not be verified. Please try again.'});
        if(challenge.test_phone){
          if(!demoPhone || body.phoneCode!=='0000') return reply(origin,400,{error:'Use the test phone PIN 0000.'});
        }else{
          const check=await twilio('VerificationCheck',{To:phone,Code:body.phoneCode});
          if(check.status!=='approved') return reply(origin,400,{error:'The codes could not be verified. Please try again.'});
        }
        const result=await admin.rpc('complete_store_action',{p_id:challenge.id,p_user_id:user.id});
        if (result.error) return reply(origin,400,{error:result.error.message});
        return reply(origin,200,{id:result.data});
      }
      return reply(origin,400,{error:'Invalid request.'});
    } catch (error) {
      return reply(origin,500,{error:error instanceof Error ? error.message : 'Verification could not be completed.'});
    }
  };
}
