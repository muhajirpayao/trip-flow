import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Calendar, Wallet, MapPin, User } from 'lucide-react';

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

      // ignore tiny jitters
      if (Math.abs(diff) < 4) return;

      if (diff > 0 && y > 64) {
        // scrolling down, past the top buffer
        setHidden(true);
      } else {
        // scrolling up (or near top)
        setHidden(false);
      }

      lastY.current = y;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return hidden;
}

export default function DashboardLayout() {
  const hidden = useHideOnScroll();

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-50">
      <main className="flex-1 pb-20 overflow-y-auto no-scrollbar">
        <Outlet />
      </main>

      {/* Bottom navigation */}
<nav
  className={`fixed bottom-4 left-4 right-4 h-14 bg-white rounded-full shadow-lg shadow-slate-200/60 border border-slate-100 flex items-center z-30 px-2 transition-all duration-300 ease-in-out ${
    hidden ? 'translate-y-24 opacity-0' : 'translate-y-0 opacity-100'
  }`}
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
                  isActive ? 'bg-violet-50 text-violet-600' : 'text-slate-400 hover:text-slate-600'
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