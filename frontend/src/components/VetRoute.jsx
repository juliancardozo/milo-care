import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectIsVet } from '../store/authSlice';

// Sólo para vets dueños de clínica (rol 'vet'). Protege el panel del vet.
export default function VetRoute() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isVet = useSelector(selectIsVet);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isVet) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
