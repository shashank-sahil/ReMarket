'use client';
import { useState, type FormEvent } from 'react';
import { Phone, ShieldCheck } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { runStoreAction } from '@/utils/supabase/store-actions';

export default function PhoneVerification({ demo, verifiedPhone, configurationError, onConfirmed }: {
  demo:{enabled:boolean;phoneVerified:boolean;phone:string}; verifiedPhone?:string; configurationError:string; onConfirmed:()=>Promise<void>;
}) {
  const [number,setNumber]=useState(''),[code,setCode]=useState('');
  const [sent,setSent]=useState(false),[busy,setBusy]=useState(false);
  const [error,setError]=useState(''),[message,setMessage]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy)return;setBusy(true);setError('');setMessage('');
    try {
      if(configurationError)throw new Error(configurationError);
      const phone='+91'+number;
      if(!sent){
        if(!demo.enabled){const {error}=await createClient().auth.updateUser({phone});if(error)throw error;}
        setSent(true);setMessage(demo.enabled?'Enter the test PIN 0000 below. No SMS is sent.':'Enter the SMS code below.');
      }else{
        if(demo.enabled)await runStoreAction({step:'verify-test-phone',phone,pin:code});
        else {const {error}=await createClient().auth.verifyOtp({phone,token:code,type:'phone_change'});if(error)throw error;}
        setSent(false);setCode('');setMessage(demo.enabled?'Test phone confirmed.':'Phone number verified.');
        await onConfirmed();
      }
    }catch(error){setError(error&&typeof error==='object'&&'message' in error?String(error.message):'Could not verify your phone. Please try again.');}
    finally{setBusy(false);}
  }
  return <form className="kgp-phone-verification" onSubmit={submit}>
    <label htmlFor="kgp-phone">Phone number</label><div className="kgp-phone-number"><span>+91</span><input id="kgp-phone" type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} autoComplete="tel-national" required value={number} disabled={sent||busy} onChange={event=>setNumber(event.target.value.replace(/\D/g,''))} placeholder="10-digit phone number"/></div>
    {demo.enabled&&<p className="kgp-inline-message">Demo mode: your phone PIN is 0000. No SMS is sent.</p>}
    {sent&&<div className="kgp-phone-code"><label htmlFor="kgp-phone-code">{demo.enabled?'Test PIN':'Verification code'}</label><input id="kgp-phone-code" required inputMode="numeric" autoComplete="one-time-code" pattern={demo.enabled?'[0-9]{4}':'[0-9]{4,10}'} maxLength={demo.enabled?4:10} value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,''))} placeholder={demo.enabled?'Enter 0000':'Enter SMS code'} autoFocus/><button type="button" className="kgp-phone-change" disabled={busy} onClick={()=>{setSent(false);setCode('');setError('');setMessage('');}}>Change number</button></div>}
    <button type="submit" className="kgp-primary kgp-phone-submit" disabled={busy||Boolean(configurationError)}><Phone size={15}/>{busy?'Please wait…':sent?'Verify phone number':demo.enabled?'Continue with test PIN':'Send verification code'}</button>
    {message&&<p role="status" className="kgp-inline-message">{message}</p>}
    {(error||configurationError)&&<p role="alert" className="kgp-form-error">{error||configurationError}</p>}
    {configurationError&&<button type="button" className="kgp-phone-change" onClick={()=>onConfirmed()}>Retry connection</button>}
    {demo.phoneVerified&&<p className="kgp-inline-message"><ShieldCheck size={14}/> Test phone confirmed: {demo.phone}</p>}
    {verifiedPhone&&<p className="kgp-inline-message"><ShieldCheck size={14}/> Verified phone: +{verifiedPhone}</p>}
  </form>;
}
