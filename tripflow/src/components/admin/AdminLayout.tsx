// components/admin/AdminLayout.tsx
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import { motion, AnimatePresence } from 'framer-motion';

const PAGE_META: Record<string, { title: string; subtitle?: string }> = {
  '/admin/dashboard': { title: 'Dashboard', subtitle: 'Platform overview' },
  '/admin/users': { title: 'Users', subtitle: 'Manage all user accounts' },
  '/admin/activity': { title: 'Activity Logs', subtitle: 'Real-time user actions' },
  '/admin/notifications': { title: 'Notifications', subtitle: 'Send and manage notifications' },
  '/admin/announcements': { title: 'Announcements', subtitle: 'Platform announcements' },
  '/admin/analytics': { title: 'Analytics', subtitle: 'Usage insights & metrics' },
  '/admin/settings': { title: 'Settings', subtitle: 'Platform configuration' },
};

export default function AdminLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const meta = PAGE_META[pathname] ?? { title: 'Admin' };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop sidebar */}
      <AdminSidebar />

      {/* Mobile sidebar */}
      <AdminSidebar
        mobile
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar
          title={meta.title}
          subtitle={meta.subtitle}
          onMenuClick={() => setMobileMenuOpen(true)}
        />

        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex-1 p-4 lg:p-6 overflow-auto"
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}