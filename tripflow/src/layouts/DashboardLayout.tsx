import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Calendar, Wallet, MapPin, CheckSquare } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home', end: true },
  { to: '/dashboard/itinerary', icon: Calendar, label: 'Itinerary' },
  { to: '/dashboard/expenses', icon: Wallet, label: 'Expenses' },
  { to: '/dashboard/places', icon: MapPin, label: 'Places' },
  { to: '/dashboard/packing', icon: CheckSquare, label: 'Packing' },
];

export default function DashboardLayout() {
  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-50">
      <main className="flex-1 pb-20 overflow-y-auto no-scrollbar">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 w-full h-16 bg-white border-t border-slate-100 flex items-center z-30 px-2">
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`
            }>
            {({ isActive }) => (
              <>
                <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-indigo-50' : ''}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className="text-[10px] font-semibold">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
