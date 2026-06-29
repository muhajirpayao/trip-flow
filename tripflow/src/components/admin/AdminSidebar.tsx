import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Activity, Bell, Megaphone,
  BarChart3, Settings, LogOut, Plane, X,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/admin/dashboard',      icon: LayoutDashboard, label: 'Dashboard'     },
  { to: '/admin/users',          icon: Users,           label: 'Users'          },
  { to: '/admin/activity',       icon: Activity,        label: 'Activity Logs'  },
  { to: '/admin/notifications',  icon: Bell,            label: 'Notifications'  },
  { to: '/admin/announcements',  icon: Megaphone,       label: 'Announcements'  },
  { to: '/admin/analytics',      icon: BarChart3,       label: 'Analytics'      },
  { to: '/admin/settings',       icon: Settings,        label: 'Settings'       },
];

interface AdminSidebarProps {
  open?: boolean;
  onClose?: () => void;
  mobile?: boolean;
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate();
  const handleLogout = () => {
    sessionStorage.removeItem('isAdmin');
    navigate('/', { replace: true });
  };

  return (
    <div className="flex flex-col h-full py-6">
      {/* Logo */}
      <div className="px-5 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-md shadow-violet-200">
            <Plane className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 leading-none">TripFlow</p>
            <p className="text-[10px] text-violet-400 mt-0.5 leading-none">Admin Portal</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors lg:hidden">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-violet-50 text-violet-700 border border-violet-200'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${
                  isActive ? 'text-violet-500' : 'text-gray-400 group-hover:text-gray-600'
                }`} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 group"
        >
          <LogOut className="w-4 h-4 group-hover:text-red-500 transition-colors" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function AdminSidebar({ open = true, onClose, mobile = false }: AdminSidebarProps) {
  if (mobile) {
    return (
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-64 z-50 bg-white border-r border-violet-100 shadow-xl"
            >
              <SidebarContent onClose={onClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 h-screen sticky top-0 bg-white border-r border-violet-100 shadow-sm">
      <SidebarContent />
    </aside>
  );
}