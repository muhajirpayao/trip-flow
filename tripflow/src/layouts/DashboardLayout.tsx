import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Calendar, Wallet, MapPin, User } from 'lucide-react';
import { NotificationBell } from '../components/notifications/NotificationBell';
import { NotificationToast } from '../components/notifications/NotificationToast';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard',           icon: LayoutDashboard, label: 'Home',      end: true },
  { to: '/dashboard/itinerary', icon: Calendar,        label: 'Itinerary'            },
  { to: '/dashboard/expenses',  icon: Wallet,          label: 'Expenses'             },
  { to: '/dashboard/places',    icon: MapPin,          label: 'Places'               },
  { to: '/dashboard/profile',   icon: User,            label: 'Profile'              },
];

function useHideOnScroll() {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      const diff = y - lastY.current;
      if (Math.abs(diff) < 4) return;
      setHidden(diff > 0 && y > 64);
      lastY.current = y;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return hidden;
}

export default function DashboardLayout() {
  const hidden = useHideOnScroll();

  const { user } = useAuth();          // ← real auth user
  const userId = user?.id;             // ← real UUID that matches your DB

  const { unreadCount, latestNew, dismissToast } = useNotifications(userId);

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-50">
      {/* ── Global toast — sits above everything ── */}
      <NotificationToast notification={latestNew} onDismiss={dismissToast} />

      {/* ── Top-right bell (fixed, always reachable) ── */}
      <div className="fixed top-4 right-4 z-40">
        <NotificationBell unreadCount={unreadCount} />
      </div>

      <main className="flex-1 pb-20 overflow-y-auto no-scrollbar">
        <Outlet />
      </main>

      {/* ── Bottom navigation ── */}
      <nav
        className={`
          fixed bottom-4 left-4 right-4 h-14
          rounded-full shadow-lg shadow-violet-900/20
          flex items-center z-30 px-2
          transition-all duration-300 ease-in-out
          ${hidden ? 'translate-y-24 opacity-0' : 'translate-y-0 opacity-100'}
        `}
        style={{ background: 'linear-gradient(135deg, #7C5CFF 0%, #8B5CF6 100%)' }}
      >
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={label}
            className="flex-1 flex items-center justify-center"
          >
            {({ isActive }) => (
              <div
                className={`p-2.5 rounded-xl transition-colors -translate-y-0.5 ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-white/60 hover:text-white/90'
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}