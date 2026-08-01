import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// roles: si se pasa, la ruta además exige que el usuario tenga al
// menos uno de esos roles (ej. ['Admin']); si no los tiene, se
// manda a /hoy en vez de mostrar una pantalla sin datos.
// rolesExcluidos: bloquea la ruta solo si TODOS los roles del
// usuario están en esa lista (ej. alguien con Gerente + Supervisor
// sigue entrando por Supervisor).
export default function ProtectedRoute({ children, roles, rolesExcluidos }) {
  const { isAuthenticated, authLoading, usuario } = useAuth();
  if (authLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const rolesUsuario = usuario?.roles ?? [];
  if (roles && !rolesUsuario.some((r) => roles.includes(r))) return <Navigate to="/hoy" replace />;
  if (rolesExcluidos && rolesUsuario.length > 0 && rolesUsuario.every((r) => rolesExcluidos.includes(r))) {
    return <Navigate to="/hoy" replace />;
  }
  return children;
}
