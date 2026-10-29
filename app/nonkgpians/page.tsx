import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Recycle, UsersRound } from 'lucide-react';
import './nonkgpians.css';

export const metadata: Metadata = {
  title: 'Guest Space | Re Market',
  description: 'A preview of the Re Market non-KGPian space.',
};

export default function NonkgpiansPage() {
  return <main id="nonkgpians" className="nonkgp-page"><header className="nonkgp-header"><Link href="/" aria-label="Re Market home" className="nonkgp-logo"><span><Recycle size={19}/></span>re<strong>market</strong><i>.</i></Link><Link href="/" className="nonkgp-back"><ArrowLeft size={16}/> Back to Re Market</Link></header><section className="nonkgp-content"><div className="nonkgp-art" aria-hidden="true"><span className="nonkgp-ring one"/><span className="nonkgp-ring two"/><span className="nonkgp-icon"><UsersRound size={58} strokeWidth={1.3}/></span></div><span className="nonkgp-eyebrow">THE OTHER SIDE OF RE MARKET</span><h1>Good things are<br/><span>coming your way.</span></h1><p>This is the space for people outside IIT Kharagpur. We’re shaping its experience next.</p><Link href="/" className="nonkgp-button">Explore Re Market <ArrowUpRight size={18}/></Link></section><footer>Re Market · Good things deserve a second story.</footer></main>;
}
