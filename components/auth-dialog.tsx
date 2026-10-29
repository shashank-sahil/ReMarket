'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, ArrowUpRight, GraduationCap, Heart, Phone, Recycle, UsersRound, X } from 'lucide-react';

type EntryPoint = { x: number; y: number };
type Step = 'choice' | 'kgp' | 'guest' | 'phone';

function GoogleMark() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48"><path fill="#4285f4" d="M43.6 24.5c0-1.3-.1-2.6-.3-3.8H24v7.3h11c-.5 2.4-1.9 4.5-4 5.9v4.8h6.4c3.8-3.5 6.2-8.6 6.2-14.2z"/><path fill="#34a853" d="M24 44.5c5.5 0 10.2-1.8 13.6-4.9l-6.4-4.8c-1.8 1.2-4.1 1.9-7.2 1.9-5.5 0-10.1-3.7-11.8-8.6H5.6V33c3.4 6.8 10.4 11.5 18.4 11.5z"/><path fill="#fbbc05" d="M12.2 28.1a12.3 12.3 0 0 1 0-8.2V15H5.6a20.5 20.5 0 0 0 0 18l6.6-4.9z"/><path fill="#ea4335" d="M24 11.3c3 0 5.6 1 7.7 3l5.8-5.8C34 5.3 29.4 3.5 24 3.5 16 3.5 9 8.2 5.6 15l6.6 4.9c1.7-4.9 6.3-8.6 11.8-8.6z"/></svg>;
}

export default function AuthDialog({ origin, onClose }: { origin: EntryPoint; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>('choice');
  const [notice, setNotice] = useState('');
  const [phone, setPhone] = useState('');
  const reducedMotion = useReducedMotion();
  const [viewport, setViewport] = useState(() => ({ width: typeof window === 'undefined' ? 0 : window.innerWidth, height: typeof window === 'undefined' ? 0 : window.innerHeight }));

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    setViewport({ width: window.innerWidth, height: window.innerHeight });
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, []);

  const bubbleRadius = Math.hypot(Math.max(origin.x, viewport.width - origin.x), Math.max(origin.y, viewport.height - origin.y));
  const circleAtOrigin = `circle(0px at ${origin.x}px ${origin.y}px)`;
  const circleCoveringScreen = `circle(${bubbleRadius + 20}px at ${origin.x}px ${origin.y}px)`;
  const back = () => { setNotice(''); setStep(step === 'phone' ? 'guest' : 'choice'); };
  const continueGoogle = () => setNotice('Google sign-in is coming soon. No account has been created yet.');
  const continuePhone = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice('Phone sign-in is coming soon. No verification message has been sent.');
  };

  return <dialog ref={ref} className="auth-dialog" aria-labelledby="auth-title" aria-describedby="auth-description" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <motion.div aria-hidden="true" className="auth-backdrop" initial={reducedMotion ? { opacity: 0 } : { clipPath: circleAtOrigin }} animate={reducedMotion ? { opacity: 1 } : { clipPath: circleCoveringScreen }} transition={{ duration: reducedMotion ? .15 : .65, ease: [0.22, 1, 0.36, 1] }} onClick={onClose}/>
    <div className="auth-dialog-scroll" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <motion.section className="auth-card" initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: .16, x: origin.x - viewport.width / 2, y: origin.y - viewport.height / 2 }} animate={{ opacity: 1, scale: 1, x: 0, y: 0 }} transition={{ duration: reducedMotion ? .15 : .65, ease: [0.22, 1, 0.36, 1] }}>
        <div className="auth-card-top"><span className="auth-wordmark"><span className="auth-mark"><Recycle size={18} strokeWidth={2.2}/></span><span>re<span className="auth-wordmark-light">market</span><span className="auth-wordmark-dot">.</span></span></span><button type="button" className="auth-close" aria-label="Close sign in" onClick={onClose}><X size={19}/></button></div>
        <AnimatePresence mode="wait" initial={false}>
          {step === 'choice' ? <motion.div key="choice" className="auth-content" initial={{ opacity: 0, y: reducedMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }} transition={{ duration: reducedMotion ? 0 : .2 }}>
            <div className="auth-illustration" aria-hidden="true"><span className="auth-orbit auth-orbit-one"/><span className="auth-orbit auth-orbit-two"/><span className="auth-bubble auth-bubble-two"><Heart size={17}/></span><span className="auth-center"><Recycle size={34} strokeWidth={1.7}/></span></div>
            <div className="auth-kicker"><span/> A GOOD PLACE TO BEGIN</div>
            <h2 id="auth-title">Hey, are you<br/><span>a KGPian?</span></h2>
            <p id="auth-description" className="auth-description">Let’s get you to the good stuff. Do you have an IIT Kharagpur email?</p>
            <div className="auth-choice-list"><button type="button" className="auth-choice" onClick={() => { setNotice(''); setStep('kgp'); }}><span className="auth-choice-icon auth-choice-icon-green"><GraduationCap size={21}/></span><span className="auth-choice-copy"><strong>Yes, I’m a KGPian</strong><small>I have an IIT Kharagpur email</small></span><ArrowUpRight className="auth-choice-arrow" size={18}/></button><button type="button" className="auth-choice" onClick={() => { setNotice(''); setStep('guest'); }}><span className="auth-choice-icon auth-choice-icon-blue"><UsersRound size={20}/></span><span className="auth-choice-copy"><strong>No, I’m not</strong><small>I’d still like to join in</small></span><ArrowUpRight className="auth-choice-arrow" size={18}/></button></div>
            <p className="auth-footnote">Good things are better when they go around.</p>
          </motion.div> : <motion.div key={step} className="auth-content auth-method-content" initial={{ opacity: 0, x: reducedMotion ? 0 : 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reducedMotion ? 0 : -12 }} transition={{ duration: reducedMotion ? 0 : .2 }}>
            <button type="button" className="auth-back" onClick={back}><ArrowLeft size={16}/> Back</button>
            <div className={`auth-method-icon ${step === 'kgp' ? 'is-kgp' : ''}`}>{step === 'kgp' ? <GraduationCap size={28}/> : step === 'phone' ? <Phone size={26}/> : <UsersRound size={27}/>}</div>
            <div className="auth-kicker"><span/> {step === 'kgp' ? 'HELLO, FELLOW KGPIAN' : step === 'phone' ? 'ONE LITTLE DETAIL' : 'THERE’S ROOM FOR YOU'}</div>
            <h2 id="auth-title">{step === 'kgp' ? <>Welcome<br/><span>back to campus.</span></> : step === 'phone' ? <>Your number,<br/><span>please.</span></> : <>Come on in.<br/><span>Good to see you.</span></>}</h2>
            <p id="auth-description" className="auth-description">{step === 'kgp' ? <>Continue with Google using your <strong>@iitkgp.ac.in</strong> email.</> : step === 'phone' ? 'Enter your mobile number to continue when phone sign-in is available.' : 'Sign in or create an account to buy, sell and give good things another go.'}</p>
            {step === 'phone' ? <form className="auth-phone-form" onSubmit={continuePhone}><label htmlFor="auth-phone">Phone number</label><div className="auth-phone-field"><span>+91</span><input id="auth-phone" type="tel" inputMode="numeric" autoComplete="tel-national" pattern="[0-9]{10}" maxLength={10} value={phone} onChange={event => setPhone(event.target.value.replace(/\D/g, ''))} placeholder="Enter 10-digit number" required/></div><p className="auth-input-hint">Enter a 10-digit Indian mobile number.</p><button type="submit" className="auth-primary">Continue <ArrowRight size={18}/></button></form> : <div className="auth-methods"><button type="button" className="auth-method" onClick={continueGoogle}><GoogleMark/><span>Continue with Google</span><ArrowUpRight size={17}/></button>{step === 'guest' && <><div className="auth-divider"><span/>or<span/></div><button type="button" className="auth-method" onClick={() => { setNotice(''); setStep('phone'); }}><Phone size={20}/><span>Continue with phone number</span><ArrowUpRight size={17}/></button></>}</div>}
            <p className="auth-notice" role="status" aria-live="polite">{notice || 'Sign-in options are being set up. This is a preview.'}</p>
          </motion.div>}
        </AnimatePresence>
      </motion.section>
    </div>
  </dialog>;
}

