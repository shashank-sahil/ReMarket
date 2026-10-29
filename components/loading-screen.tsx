import { Bike, BookOpen, PackageOpen, Recycle } from 'lucide-react';

type LoadingStage = 'sign-in' | 'store' | 'marketplace';

export default function LoadingScreen({ stage }: { stage: LoadingStage }) {
  const message = stage === 'sign-in'
    ? { eyebrow: 'A GOOD PLACE TO BEGIN', title: 'Good to see you', description: 'Signing you in and finding your space.' }
    : stage === 'store'
      ? { eyebrow: 'BACK TO CAMPUS', title: 'Your corner of campus', description: 'Getting your store and account ready.' }
      : { eyebrow: 'GOOD THINGS GO AROUND', title: 'Your next good find', description: 'Getting your marketplace ready.' };

  return <main className="re-loading" aria-busy="true">
    <div className="re-loading-brand" aria-label="Re Market"><span className="re-loading-mark"><Recycle size={18} strokeWidth={2.2}/></span><span>re<span className="re-loading-brand-light">market</span><span className="re-loading-brand-dot">.</span></span></div>
    <section className="re-loading-content" role="status" aria-live="polite">
      <div className="re-loading-art" aria-hidden="true">
        <span className="re-loading-orbit orbit-one"/><span className="re-loading-orbit orbit-two"/>
        <span className="re-loading-tile tile-book"><BookOpen size={20}/></span>
        <span className="re-loading-tile tile-bike"><Bike size={21}/></span>
        <span className="re-loading-center"><PackageOpen size={40} strokeWidth={1.4}/></span>
        <span className="re-loading-dot dot-one"/><span className="re-loading-dot dot-two"/>
      </div>
      <span className="re-loading-eyebrow">{message.eyebrow}</span>
      <h1>{message.title}<span>.</span></h1>
      <p>{message.description}</p>
      <div className="re-loading-track" aria-hidden="true"><span/></div>
      <small>Good things are on their way</small>
    </section>
    <div className="re-loading-footer">A little less new. A lot more you.</div>
  </main>;
}
