// src/routes/AppRouter.tsx
import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import LandingPage from '../pages/LandingPage';
import { useAuth } from '../context/AuthContext';

const AuthPage  = lazy(() => import('../pages/AuthPage'));
const Home      = lazy(() => import('../pages/Home'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Itinerary = lazy(() => import('../pages/Itinerary'));
const Expenses  = lazy(() => import('../pages/Expenses'));
const Places    = lazy(() => import('../pages/Places'));
const Profile   = lazy(() => import('../pages/Profile'));   // ← replaces Packing
const Settings  = lazy(() => import('../pages/Settings'));

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

const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
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
      { index: true,       element: <Home /> },
      { path: 'trip',      element: <Dashboard /> },
      { path: 'itinerary', element: <Itinerary /> },
      { path: 'expenses',  element: <Expenses /> },
      { path: 'places',    element: <Places /> },
      { path: 'profile',   element: <Profile /> },    // ← was 'packing'
      { path: 'settings',  element: <Settings /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export default function AppRouter() {
  return (
    <Suspense fallback={<Loader />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}