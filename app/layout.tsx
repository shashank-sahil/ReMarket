import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Re Market — Good things deserve a second story.', description: 'A fresh way for IIT Kharagpur students to buy, sell, and pass on their campus essentials. Less spending. More living.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
