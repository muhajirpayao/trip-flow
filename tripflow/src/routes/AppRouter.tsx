import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import LandingPage from '../pages/LandingPage';
import UnderDevelopment from '../pages/UnderDevelopment';
import { useAuth } from '../context/AuthContext';
import NotificationsPage from '../pages/NotificationsPage';
import PlaceholderPage from '../components/common/PlaceholderPage';

// ADMIN IMPORTS
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminAccessScreen from '../components/admin/AdminAccessScreen';
import AdminRouteGuard from './AdminRouteGuard';
import AdminNotificationsPage from '../pages/admin/AdminNotifications';
import Gallery from "../pages/Gallery";
const AuthPage = lazy(() => import('../pages/AuthPage'));
const Home = lazy(() => import('../pages/Home'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Itinerary = lazy(() => import('../pages/Itinerary'));
const Expenses = lazy(() => import('../pages/Expenses'));
const Places = lazy(() => import('../pages/Places'));
const Profile = lazy(() => import('../pages/Profile'));
const Settings = lazy(() => import('../pages/Settings'));

const UNDER_DEVELOPMENT = false;

const Loader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="w-8 h-8 rounded-full border-4 border-violet-200 border-t-violet-500 animate-spin" />
  </div>
);

function GuestOnly({ children }: { children: React.ReactNode }) {
  const { isAuthed, loading } = useAuth();
  if (loading) return <Loader />;
  if (isAuthed) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthed, loading } = useAuth();
  if (loading) return <Loader />;
  if (!isAuthed) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

const router = UNDER_DEVELOPMENT
  ? createBrowserRouter([{ path: '*', element: <UnderDevelopment /> }])
  : createBrowserRouter([
      {
        path: '/',
        element: <LandingPage />,
      },

      // ADMIN LOGIN SCREEN
      {
        path: '/admin',
        element: <AdminAccessScreen />,
      },

      // ADMIN PROTECTED ROUTES (all wrapped in AdminLayout via AdminRouteGuard)
      {
        path: '/admin',
        element: <AdminRouteGuard />,
        children: [
          { path: 'dashboard',     element: <AdminDashboard /> },
          { path: 'notifications', element: <AdminNotificationsPage /> },
          { path: 'users',         element: <PlaceholderPage title="Users" icon={''} description={''} accent={''} /> },
          { path: 'activity',      element: <PlaceholderPage title="Activity Logs" icon={''} description={''} accent={''} /> },
          { path: 'announcements', element: <PlaceholderPage title="Announcements" icon={''} description={''} accent={''} /> },
          { path: 'analytics',     element: <PlaceholderPage title="Analytics" icon={''} description={''} accent={''} /> },
          { path: 'settings',      element: <PlaceholderPage title="Settings" icon={''} description={''} accent={''} /> },
        ],
      },

      {
        path: '/auth',
        element: (
          <GuestOnly>
            <AuthPage />
          </GuestOnly>
        ),
      },

      {
        path: '/dashboard',
        element: (
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        ),
        children: [
          { index: true,               element: <Dashboard /> },
          { path: 'home',              element: <Home /> },
          { path: 'trip',              element: <Dashboard /> },
          { path: 'itinerary',         element: <Itinerary /> },
          { path: 'expenses',          element: <Expenses /> },
          { path: 'places',            element: <Places /> },
          { path: 'profile',           element: <Profile /> },
          { path: 'settings',          element: <Settings /> },
          { path: 'notifications',     element: <NotificationsPage /> },
          {path: 'gallery', element: <Gallery/>},
        ],
      },

      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ]);

export default function AppRouter() {
  return (
    <Suspense fallback={<Loader />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}