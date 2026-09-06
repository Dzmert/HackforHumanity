import { Link } from 'react-router-dom';
import { LayoutDashboard, BadgeDollarSign, CalendarDays, Package, Files, Users, DoorOpen, ClipboardCheck, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const LOGO_URL = 'https://media.base44.com/images/public/6a9b9db35bdcc83e446e2c2e/c9125136a_Screenshot2026-09-06at93610AM.png';

const items = [
  ['dashboard', 'Overview', LayoutDashboard], ['signin', 'Sign-in desk', DoorOpen], ['clients', 'Client profiles', Users], ['grants', 'Grants', BadgeDollarSign],
  ['roster', 'Roster', CalendarDays], ['supply', 'Supply & donors', Package], ['documents', 'Documentation', Files]
];
export default function AppShell({ active, onChange, children, role }) {
  const { isAuthenticated, logout, navigateToLogin } = useAuth();
  const canReview = role === 'project_services_manager' || role === 'admin';
  return <div className="min-h-screen bg-[#F8F1E8] text-[#3D342F] lg:flex">
    <aside className="bg-[#7D4037] text-white p-5 lg:w-64 lg:min-h-screen"><div className="flex items-center gap-3 mb-8"><img src={LOGO_URL} alt="Lou's Place" className="h-14 w-auto rounded-lg bg-white p-1" /><p className="text-xs text-white/70">Operations hub</p></div>
      <nav className="grid grid-cols-2 gap-2 lg:grid-cols-1">{items.filter(([id]) => id !== 'grants' || role !== 'volunteer').map(([id,label,Icon]) => <button key={id} onClick={() => onChange(id)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${active===id?'bg-white text-[#7D4037]':'text-white/80 hover:bg-white/10'}`}><Icon size={18}/>{label}</button>)}
        {canReview && <Link to="/psm-review" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/80 hover:bg-white/10"><ClipboardCheck size={18}/>Case note review</Link>}</nav>
      <p className="mt-8 hidden text-xs text-white/60 lg:block">Signed in as {role === 'volunteer' ? 'Volunteer' : 'Paid caseworker'}</p>
    </aside><main className="flex-1 p-4 md:p-8">
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => (isAuthenticated ? logout() : navigateToLogin())}
          className="flex items-center gap-2 rounded-xl border border-[#E5D6C8] bg-white px-4 py-2 text-sm font-medium text-[#7D4037] hover:bg-[#F8F1E8]"
        >
          {isAuthenticated ? <><LogOut size={16} /> Log out</> : <><LogIn size={16} /> Log in</>}
        </button>
      </div>
      {children}
    </main>
  </div>;
}