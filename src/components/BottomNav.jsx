import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { puedeVerItem } from '../utils/permisos';
import { IconoHoy, IconoPlanifica, IconoAsistencia, IconoCierre, IconoMas } from './Iconos';

// Accesos directos a los 4 pasos del ciclo diario (Planificar > Asignar/
// Asistencia > Cerrar turno), más "Más" para el menú completo — mismas
// rutas y mismas reglas de rol que ya usa Sidebar.jsx, solo con
// etiquetas cortas para cada botón.
const ITEMS_BARRA = [
  { to: '/hoy', label: 'Hoy', Icono: IconoHoy, rolesExcluidos: ['Motorista'] },
  { to: '/planificacion', label: 'Planifica', Icono: IconoPlanifica, rolesExcluidos: ['Gerente', 'Motorista'] },
  { to: '/asignaciones', label: 'Asistencia', Icono: IconoAsistencia, rolesExcluidos: ['Gerente', 'Motorista'] },
  { to: '/cierre-turno', label: 'Cierre', Icono: IconoCierre, rolesExcluidos: ['Gerente', 'Motorista'] }
];

export default function BottomNav({ onAbrirMenu }) {
  const { usuario } = useAuth();
  const rolesUsuario = usuario?.roles ?? [];
  const items = ITEMS_BARRA.filter((item) => puedeVerItem(item, rolesUsuario));

  // Si a este rol no le queda ninguno de los 4 (caso Motorista, que solo
  // tiene su única pantalla de boleta), no tiene sentido mostrar la
  // barra nada más para el botón "Más".
  if (items.length === 0) return null;

  return (
    <nav className="bottom-nav">
      {items.map(({ to, label, Icono }) => (
        <NavLink key={to} to={to} className={({ isActive }) => 'bottom-nav-item' + (isActive ? ' active' : '')}>
          <Icono />
          <span>{label}</span>
        </NavLink>
      ))}
      <button type="button" className="bottom-nav-item" onClick={onAbrirMenu}>
        <IconoMas />
        <span>Más</span>
      </button>
    </nav>
  );
}
