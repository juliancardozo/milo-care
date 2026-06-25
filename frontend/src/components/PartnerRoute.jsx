import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectIsPartnerAdmin } from '../store/authSlice';

// Área del partner_admin (panel de su cohorte). Separada del admin de plataforma.
export default function PartnerRoute() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isPartnerAdmin = useSelector(selectIsPartnerAdmin);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isPartnerAdmin) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
