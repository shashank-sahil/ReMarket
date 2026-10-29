import KgpianDashboard from '@/components/kgpian-dashboard';
import '../kgpians/dashboard.css';
export const metadata = { title: 'Community | Re Market', description: 'Discover Re Market stores and manage your account.' };
export default function NonkgpiansPage() { return <KgpianDashboard accountType="nonkgpians"/>; }
