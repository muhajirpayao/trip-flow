// src/routes/AppRouter.tsx
import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';

const AuthPage  = lazy(() => import('../pages/AuthPage'));
const Home      = lazy(() => import('../pages/Home'));     
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Itinerary = lazy(() => import('../pages/Itinerary'));
const Expenses  = lazy(() => import('../pages/Expenses'));
const Places    = lazy(() => import('../pages/Places'));
const Packing   = lazy(() => import('../pages/Packing'));
const Settings  = lazy(() => import('../pages/Settings'));

const Loader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin" />
  </div>
);

function GuestOnly({ children }: { children: React.ReactNode }) {
  const { isAuthed, loading } = useAuth();
  if (loading) return <Loader />;
  // After login → go to dashboard, not landing
  if (isAuthed) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthed, loading } = useAuth();
  if (loading) return <Loader />;
  if (!isAuthed) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

const router = createBrowserRouter([
  {
    // "/" now redirects: authed → /dashboard, guest → /auth
    path: '/',
    element: <Navigate to="/dashboard" replace />,
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
      { index: true,       element: <Home /> },       // NEW home replaces old Dashboard
      { path: 'trip',      element: <Dashboard /> },  // trip detail view
      { path: 'itinerary', element: <Itinerary /> },
      { path: 'expenses',  element: <Expenses /> },
      { path: 'places',    element: <Places /> },
      { path: 'packing',   element: <Packing /> },
      { path: 'settings',  element: <Settings /> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);

export default function AppRouter() {
  return (
    <Suspense fallback={<Loader />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}