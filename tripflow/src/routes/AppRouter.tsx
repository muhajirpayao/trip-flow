import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';

const LandingPage  = lazy(() => import('../pages/LandingPage'));
const Dashboard    = lazy(() => import('../pages/Dashboard'));
const Itinerary    = lazy(() => import('../pages/Itinerary'));
const Expenses     = lazy(() => import('../pages/Expenses'));
const Places       = lazy(() => import('../pages/Places'));
const Packing      = lazy(() => import('../pages/Packing'));
const Settings     = lazy(() => import('../pages/Settings'));

const Loader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin" />
  </div>
);

const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  {
    path: '/dashboard',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'itinerary', element: <Itinerary /> },
      { path: 'expenses',  element: <Expenses /> },
      { path: 'places',    element: <Places /> },
      { path: 'packing',   element: <Packing /> },
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
