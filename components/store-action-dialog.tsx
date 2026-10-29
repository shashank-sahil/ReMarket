'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Mail, Phone, ShieldCheck, Trash2, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { runStoreAction } from '@/utils/supabase/store-actions';

type Action = 'create' | 'delete';

export default function StoreActionDialog({ action, name, user, preparePayload, onClose, onManageContact, onDone, demoPhoneVerified=false, demoPhone='', demoEmailDestination='' }: {
  action: Action; name: string; user: User; preparePayload: () => Promise<object>;
  onClose: () => void; onManageContact: () => void; onDone: () => Promise<void>;
  demoPhoneVerified?: boolean; demoPhone?: string; demoEmailDestination?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [challengeId, setChallengeId] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const ready = Boolean(user.email && user.email_confirmed_at && ((user.phone && user.phone_confirmed_at) || demoPhoneVerified));

  useEffect(() => { const node = dialog.current; if (node && !node.open) node.showModal(); return () => { if (node?.open) node.close(); }; }, []);

  async function sendCodes() {
    if (!ready || busy) return;
    setBusy(true); setError('');
    try {
      const payload = await preparePayload();
      const data = await runStoreAction({step:'start',action,payload});
      if (!data?.challengeId) throw new Error('Could not start verification. Please try again.');
      setChallengeId(data.challengeId);
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not send verification codes.'); }
    finally { setBusy(false); }
  }
  async function confirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || completed) return;
    setBusy(true); setError('');
    try {
      await runStoreAction({step:'confirm',challengeId,emailCode,phoneCode});
      setCompleted(true);
      try { await onDone(); }
      catch { setError('The store action succeeded, but the page could not refresh. Please reload the page.'); }
    } catch (error) { setError(error instanceof Error ? error.message : 'Verification failed. Please try again.'); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} className="kgp-action-dialog" aria-labelledby="store-action-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="kgp-action-card"><div className="kgp-action-top"><span className={`kgp-action-icon ${action === 'delete' ? 'danger' : ''}`}>{action === 'delete' ? <Trash2 size={23}/> : <ShieldCheck size={24}/>}</span><button type="button" aria-label="Close verification" onClick={onClose} disabled={busy}><X size={20}/></button></div>
      <span className="kgp-eyebrow">ONE LAST STEP</span><h2 id="store-action-title">{action === 'delete' ? 'Delete your store?' : 'Let’s make it official.'}</h2>
      <p>{action === 'delete' ? <>Deleting <strong>{name}</strong> also permanently removes its listings. Verify both contacts to continue.</> : <>Verify your email and phone to create <strong>{name}</strong>.</>}</p>
      <div className="kgp-action-destinations"><div><Mail size={17}/><span><small>{demoEmailDestination ? "DEMO EMAIL" : "REGISTERED EMAIL"}</small><strong>{demoEmailDestination || user.email || "Not available"}</strong></span></div><div><Phone size={17}/><span><small>VERIFIED PHONE</small><strong>{demoPhoneVerified ? `Test phone: ${demoPhone}` : user.phone_confirmed_at && user.phone ? `Phone ending ${user.phone.slice(-4)}` : "Not verified yet"}</strong></span></div></div>
      {demoEmailDestination && <p className="kgp-inline-message">Demo: email codes go to this test inbox rather than your registered email.</p>}
      {!ready ? <div className="kgp-action-help"><p>Both your registered email and phone number need to be verified before you can continue.</p><button type="button" onClick={onManageContact}>Go to personal info <ArrowRight size={15}/></button></div> : !challengeId ? <button type="button" className="kgp-primary kgp-action-main" onClick={sendCodes} disabled={busy}>{busy ? 'Sending codes…' : 'Send verification codes'} <ArrowRight size={16}/></button> : <form className="kgp-action-codes" onSubmit={confirm}><p>{demoPhoneVerified ? 'Enter the email code and test phone PIN 0000.' : 'Enter both codes. They expire after 10 minutes.'}</p><label>Email code<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={emailCode} onChange={event => setEmailCode(event.target.value.replace(/\D/g,''))} placeholder="6-digit email code"/></label><label>Phone code<input required inputMode="numeric" pattern="[0-9]{4,10}" maxLength={10} value={phoneCode} onChange={event => setPhoneCode(event.target.value.replace(/\D/g,''))} placeholder="SMS verification code"/></label><button type="submit" className={`kgp-primary kgp-action-main ${action === 'delete' ? 'danger' : ''}`} disabled={busy || completed}>{completed ? 'Completed' : busy ? 'Verifying…' : action === 'delete' ? 'Verify and delete store' : 'Verify and create store'} <ArrowRight size={16}/></button></form>}
      {error && <p className="kgp-action-error" role="alert">{error}</p>}
      {challengeId && !completed && <button type="button" className="kgp-action-cancel" disabled={busy} onClick={() => { setChallengeId(''); setEmailCode(''); setPhoneCode(''); setError(''); }}>Request new codes</button>}
      <button type="button" className="kgp-action-cancel" onClick={onClose} disabled={busy}>{completed ? 'Close' : 'Cancel'}</button>
    </div>
  </dialog>;
}
