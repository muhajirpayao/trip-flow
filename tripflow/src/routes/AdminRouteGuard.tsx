import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/admin/AdminLayout';

export default function AdminRouteGuard() {
  const navigate = useNavigate();
  const isAdmin = sessionStorage.getItem('isAdmin') === 'true';

  useEffect(() => {
    if (!isAdmin) navigate('/admin', { replace: true });
  }, [isAdmin, navigate]);

  if (!isAdmin) return null;
  return <AdminLayout />;  // ← wraps all admin pages with sidebar + topbar
}