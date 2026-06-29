// routes/AdminRouteGuard.tsx
import { useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';

export default function AdminRouteGuard() {
  const navigate = useNavigate();
  const isAdmin = sessionStorage.getItem('isAdmin') === 'true';

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAdmin, navigate]);

  if (!isAdmin) return null;
  return <Outlet />;
}