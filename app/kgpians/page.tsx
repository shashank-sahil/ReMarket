import type { Metadata } from 'next';
import KgpianDashboard from '@/components/kgpian-dashboard';
import './dashboard.css';

export const metadata: Metadata = {
  title: 'KGP Space | Re Market',
  description: 'Your store, account, and campus marketplace preview on Re Market.',
};

export default function KgpiansPage() {
  return <KgpianDashboard />;
}
