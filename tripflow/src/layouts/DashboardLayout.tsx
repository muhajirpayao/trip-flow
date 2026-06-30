import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Calendar, Wallet, MapPin, Home as HomeIcon, User, History, LogOut } from 'lucide-react';
import { NotificationBell } from '../components/notifications/NotificationBell';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../context/AuthContext';
import { NotificationToast } from '../components/notifications/NotificationToast';

const NAV_ITEMS = [
  { to: '/dashboard/itinerary', icon: Calendar,        label: 'Itinerary' },
  { to: '/dashboard/expenses',  icon: Wallet,          label: 'Expenses'  },
  { to: '/dashboard/home',      icon: HomeIcon,        label: 'Home'      },
  { to: '/dashboard/places',    icon: MapPin,          label: 'Places'    },
  { to: '/dashboard/trip',      icon: LayoutDashboard, label: 'Dashboard' },
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

// ── Exported so pages (Dashboard.tsx, Home.tsx, etc.) can drop this directly
//    into their own header markup instead of it floating as a fixed overlay. ──
export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate('/');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-9 h-9 rounded-full flex items-center justify-center bg-white/20 border-2 border-white/30"
        aria-label="Profile menu"
      >
        <User size={17} className="text-white" strokeWidth={2} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div  
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-11 w-48 bg-white rounded-2xl shadow-xl shadow-black/10 overflow-hidden z-50"
            >
              <button
                onClick={() => { setOpen(false); navigate('/dashboard/profile'); }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <User size={14} className="text-violet-500" />
                Profile
              </button>
              <button
                onClick={() => { setOpen(false); navigate('/dashboard/home'); }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <History size={14} className="text-violet-500" />
                Trip history
              </button>
              <div className="h-px bg-slate-100" />
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-rose-500 hover:bg-rose-50 transition-colors"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Bundled icon pair, exported for pages to place inside their own header.
//    Plain inline-flex, no position:fixed — it scrolls naturally with the page. ──
export function HeaderIcons({ unreadCount }: { unreadCount: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-9 h-9 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center">
        <NotificationBell unreadCount={unreadCount} />
      </div>
      <ProfileMenu />
    </div>
  );
}

export default function DashboardLayout() {
  const hidden = useHideOnScroll();
  const { user } = useAuth();
  const userId = user?.id;
  const { unreadCount, latestNew, dismissToast } = useNotifications(userId);

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-50">
      <NotificationToast notification={latestNew} onDismiss={dismissToast} />

      {/* Pages access unreadCount via Outlet context and render <HeaderIcons /> themselves */}
      <main className="flex-1 pb-20">
        <Outlet context={{ unreadCount }} />
      </main>

      {/* ── Bottom Nav ── */}
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
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end
            aria-label={label}
            className="flex-1 flex items-center justify-center"
          >
            {({ isActive }) => (
              <div
                className={`p-2.5 rounded-xl transition-colors -translate-y-0.5 ${
                  isActive ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white/90'
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