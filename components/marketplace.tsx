'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import AuthDialog from './auth-dialog';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, ArrowRight, ArrowDown, Heart, Search, X, Plus, Menu, Bike, Laptop, BookOpen, LampDesk, MapPin, MoveUpRight, Recycle, MessageCircle, Camera, LayoutGrid } from 'lucide-react';

const ease = [0.22, 1, 0.36, 1] as const;
function Logo({ light = false }: { light?: boolean }) { return <a href="#home" className={`logo ${light ? 'logo-light' : ''}`} aria-label="Re Market home"><span className="logo-mark"><Recycle size={22} strokeWidth={2.2}/></span><span>re<span className="logo-weight">market</span><span className="logo-dot">.</span></span></a>; }
function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) { const reduced = useReducedMotion(); return <motion.div className={className} initial={{ opacity: 1, y: reduced ? 0 : 22 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: .7, delay, ease }} viewport={{ once: true, amount: .15 }}>{children}</motion.div>; }

export default function Marketplace() {





  const [mobileMenu, setMobileMenu] = useState(false);
  const [authOrigin, setAuthOrigin] = useState<{ x: number; y: number } | null>(null);

  const footerRef = useRef<HTMLElement>(null);
  const bottomPromptShown = useRef(false);
  const authTriggerRef = useRef<HTMLButtonElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!mobileMenu) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileMenu(false); };
    const closeOutside = (event: PointerEvent) => { if (event.target instanceof Element && !event.target.closest('.site-header')) setMobileMenu(false); };
    const desktop = window.matchMedia('(min-width: 901px)');
    const closeOnDesktop = () => { if (desktop.matches) setMobileMenu(false); };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOutside);
    desktop.addEventListener('change', closeOnDesktop);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOutside);
      desktop.removeEventListener('change', closeOnDesktop);
    };
  }, [mobileMenu]);
  useEffect(() => {
    if (authOrigin || bottomPromptShown.current) return;
    const showAtBottom = () => {
      const remaining = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
      if (window.scrollY <= 0 || remaining > 2 || bottomPromptShown.current) return;
      bottomPromptShown.current = true;
      authTriggerRef.current = null;
      footerRef.current?.focus({ preventScroll: true });
      setAuthOrigin({ x: window.innerWidth / 2, y: window.innerHeight - 16 });
    };
    window.addEventListener('scroll', showAtBottom, { passive: true });
    return () => window.removeEventListener('scroll', showAtBottom);
  }, [authOrigin]);
  function openAuth(event: React.MouseEvent<HTMLButtonElement>) { authTriggerRef.current = event.currentTarget; const bounds = event.currentTarget.getBoundingClientRect(); setMobileMenu(false); setAuthOrigin({ x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }); }
  function tilt(event: React.PointerEvent<HTMLDivElement>) { if (reduced || event.pointerType !== 'mouse') return; const bounds = event.currentTarget.getBoundingClientRect(); const x = (event.clientX - bounds.left) / bounds.width - .5; const y = (event.clientY - bounds.top) / bounds.height - .5; heroRef.current?.style.setProperty('--rx', `${-y * 5}deg`); heroRef.current?.style.setProperty('--ry', `${x * 7}deg`); }
  function resetTilt() { heroRef.current?.style.setProperty('--rx', '0deg'); heroRef.current?.style.setProperty('--ry', '0deg'); }
  return <>
    <header className="site-header"><div className="nav-wrap"><Logo/><nav id="main-navigation" className={mobileMenu ? 'main-nav is-open' : 'main-nav'} aria-label="Main navigation"><a href="#explore" onClick={() => setMobileMenu(false)}>The marketplace</a><a href="#how-it-works" onClick={() => setMobileMenu(false)}>How it works</a><a href="#the-re-way" onClick={() => setMobileMenu(false)}>The Re way</a></nav><div className="nav-actions"><button className="button button-small" onClick={openAuth}>Buy &amp; sell <ArrowUpRight size={15}/></button><button className="menu-toggle" onClick={() => setMobileMenu(v => !v)} aria-label="Toggle navigation" aria-controls="main-navigation" aria-expanded={mobileMenu}>{mobileMenu ? <X/> : <Menu/>}</button></div></div></header>
    <main id="home">
      <section className="hero"><div className="hero-grain"/>
        <motion.div className="hero-copy" initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} transition={{duration: .8, ease}}><h1>Good things.<br/><span>Second beginnings.</span></h1><p>Your next campus essential has a past.<br/>And a pretty great future with you.</p><div className="hero-buttons"><button className="button" onClick={openAuth}>Buy &amp; sell <ArrowUpRight size={17}/></button></div></motion.div>
        <motion.div className="hero-stage" initial={{opacity: 0, y: 38}} animate={{opacity: 1, y: 0}} transition={{duration: 1.1, delay: .2, ease}} onPointerMove={tilt} onPointerLeave={resetTilt}>
          <div className="hero-3d" ref={heroRef}><Image className="hero-image" src="/hero-still-life.webp" alt="A mint campus bicycle, silver laptop, headphones, textbooks and blue desk lamp arranged in a floating studio composition" width={1536} height={1024} priority sizes="(max-width: 720px) 100vw, (max-width: 900px) 720px, 800px"/>
          <div className="floating-label label-cycle"><span className="label-icon"><Bike size={17}/></span><div><small>YOUR NEXT CAMPUS CRUISE</small><strong>More rides. Less rupees.</strong></div><span className="label-dot"/></div>
          <div className="floating-label label-laptop"><span className="label-icon blue"><Laptop size={17}/></span><div><small>PRE-LOVED. PROJECT-READY.</small><strong>A smarter start.</strong></div><ArrowUpRight size={15}/></div>
          <div className="hero-sticker"><span>LESS NEW.</span><Recycle size={30}/><span>MORE YOU.</span></div></div><span className="hero-scribble">a little used.<br/><i>a lot to love.</i><span>↴</span></span>
        </motion.div>
        <div className="hero-foot"><span><span className="small-circle">↻</span> Good for your pocket. Better for the planet.</span><a href="#explore">SCROLL TO FIND YOUR THING <ArrowDown size={13}/></a></div>
      </section>
      <div className="campus-strip"><span>FROM ONE KGPian TO ANOTHER</span><span>THE CYCLE BEFORE THE CYCLE</span><span>NEW SEM. SAME GOOD STUFF.</span><span>LESS SPENDING. MORE LIVING.</span></div>
      <section className="explore section-shell" id="explore"><Reveal className="section-top"><div><div className="eyebrow"><span/> THE CAMPUS EDIT</div><h2>The good stuff.<br/><span>For a little less.</span></h2></div><div className="section-aside"><p>From your “need it for next sem”<br/>to your “okay, that’s a steal”.</p><span>Good finds are closer than you think. <MoveUpRight size={15}/></span></div></Reveal>
        <div className="empty-state"><Search size={30}/><h3>Your next campus find is waiting.</h3><p>Sign in to browse stores, search listings, and start selling.</p><button className="button explore-sign-in" onClick={openAuth}>Explore Re Market <ArrowRight size={16}/></button></div>
      </section>
      <section className="re-way section-shell" id="the-re-way"><div className="re-way-grid"><Reveal className="re-way-copy"><div className="eyebrow"><span/> A LITTLE RE-THINK</div><h2>Great things<br/>aren’t always<br/><span>brand new.</span></h2><p>A cycle with a few campus stories. Books with a head start. A desk setup ready for your next big idea.</p><p>There’s a lot of life left in the things around us.<br/>Let’s keep the good going.</p><a className="link-button" href="#how-it-works">Meet the Re way <ArrowUpRight size={17}/></a></Reveal><Reveal className="re-way-art"><div className="orbit-ring ring-1"/><div className="orbit-ring ring-2"/><span className="massive-re">re.</span><div className="re-orbit-icon orbit-bike"><Bike size={35}/></div><div className="re-orbit-icon orbit-book"><BookOpen size={31}/></div><div className="re-orbit-icon orbit-tech"><Laptop size={32}/></div><div className="circle-copy">PRE-LOVED IS<br/>THE NEW LOVED.<Heart size={23}/></div><span className="art-caption">new owner. same potential.</span></Reveal></div></section>
      <section className="how section-shell" id="how-it-works"><Reveal className="section-top"><div><div className="eyebrow"><span/> THE SHORTEST CAMPUS JOURNEY</div><h2>From your room.<br/><span>To their room.</span></h2></div><p className="how-aside">No complicated stuff.<br/>Just a better way to pass it on.</p></Reveal><div className="steps">{[{number:'01',icon:Camera,title:'Give it a little spotlight.',text:'Snap a few honest photos. Add the details and a price that feels right.',note:'Your old favourite, their next find.'},{number:'02',icon:MessageCircle,title:'Find your fellow KGPian.',text:'Discover something you love. Review the photos, condition and pickup details.',note:'A good deal starts with a hello.'},{number:'03',icon:Bike,title:'Meet. Check. Pass it on.',text:'Pick a public spot on campus, check the item, and start its next chapter.',note:'A short ride. A second beginning.'}].map((step,i)=><Reveal key={step.number} delay={i*.08} className="step"><div className="step-top"><span>{step.number} /</span><div className="step-icon"><step.icon size={26} strokeWidth={1.5}/></div></div><h3>{step.title}</h3><p>{step.text}</p><small>{step.note}</small></Reveal>)}</div><p className="roadmap-note">Sign in, explore campus stores, and give your things their next chapter.</p></section>
      <section className="faq section-shell"><Reveal><div className="eyebrow"><span/> A FEW THINGS, BEFORE YOU DIBS</div><h2>Good questions.</h2></Reveal><div className="faq-list">{[{q:'How do I start?',a:'Sign in to browse stores and listings. KGPians with a verified IIT Kharagpur email can create a store.'},{q:'What can I pass on?',a:'Think campus essentials: cycles, electronics, textbooks, desk accessories and room essentials. Describe the condition honestly and avoid sharing sensitive personal information in your listing.'},{q:'How do campus meetups work?',a:'Choose a convenient public campus spot and inspect the item together before paying. Re Market does not process purchases.'}].map(f=><details key={f.q}><summary>{f.q}<Plus size={18}/></summary><p>{f.a}</p></details>)}</div></section>
      <section className="final-cta"><div className="cta-orbit"/><Reveal><div className="eyebrow">LESS CLUTTER. MORE POSSIBILITIES.</div><h2>One KGPian’s “done”.<br/>Another’s <span>“dibs!”</span></h2><p>Your old favourite deserves a new favourite person.</p></Reveal></section>
    </main>
    <footer ref={footerRef} tabIndex={-1} className="section-shell"><div className="footer-top"><Logo/><p>Good things deserve a second story.</p><a href="#home" className="back-top">Back to the top <ArrowUpRight size={14}/></a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Re Market. Made with campus spirit.</span><span>An independent student project. Not affiliated with IIT Kharagpur.</span><span className="footer-location"><MapPin size={11}/> Kharagpur, India</span></div></footer>
    {authOrigin && <AuthDialog origin={authOrigin} onClose={() => { setAuthOrigin(null); requestAnimationFrame(() => (authTriggerRef.current ?? footerRef.current)?.focus({ preventScroll: true })); }}/> }
  </>;
}

