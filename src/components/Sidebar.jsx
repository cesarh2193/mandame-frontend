import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SECCIONES = [
  { titulo: 'Operación diaria', items: [
    { to: '/hoy', label: 'Hoy', rolesExcluidos: ['Motorista'] },
    { to: '/monitoreo', label: 'Monitoreo', roles: ['Admin', 'Gerente'] }
  ]},
  { titulo: 'Planificación', items: [
    { to: '/planificacion', label: 'Planificación', rolesExcluidos: ['Gerente', 'Motorista'] }
  ]},
  { titulo: 'Ciclo', items: [
    { to: '/asignaciones', label: 'Asignación y Asistencia', rolesExcluidos: ['Gerente', 'Motorista'] },
    { to: '/cierre-turno', label: 'Cierre y Autorización turno', rolesExcluidos: ['Gerente', 'Motorista'] }
  ]},
  { titulo: 'Informes', items: [
    { to: '/informes/boletas-cierre', label: 'Boletas cierre', rolesExcluidos: ['Motorista'] },
    { to: '/informes/subir-boleta', label: 'Subir boleta', rolesExcluidos: ['Gerente', 'Motorista'] },
    { to: '/informes/subir-boleta', label: 'Boletas cierre', roles: ['Motorista'] },
    { to: '/informes/asistencia', label: 'Informe de asistencia', rolesExcluidos: ['Motorista'] },
    { to: '/informes/asistencia-general', label: 'Asistencia general', rolesExcluidos: ['Motorista'] },
    { to: '/informes/ficha-personal', label: 'Ficha de personal', rolesExcluidos: ['Motorista'] }
  ]},
  { titulo: 'Administración', items: [
    { to: '/catalogos/empresas', label: 'Empresas y sucursales', roles: ['Admin', 'Gerente'] },
    { to: '/catalogos/tarifas', label: 'Tarifas', roles: ['Admin', 'Gerente'] },
    { to: '/catalogos/personal', label: 'Personal', rolesExcluidos: ['Motorista'] },
    { to: '/catalogos/usuarios', label: 'Usuarios y permisos', roles: ['Admin'] }
  ]}
];

export default function Sidebar({ abierto, onCerrar }) {
  const { usuario } = useAuth();
  const [colapsado, setColapsado] = useState(false);
  const [seccionesCerradas, setSeccionesCerradas] = useState({});

  const toggleSeccion = (titulo) =>
    setSeccionesCerradas((prev) => ({ ...prev, [titulo]: !prev[titulo] }));

  const puedeVer = (item) => {
    const rolesUsuario = usuario?.roles ?? [];
    if (item.roles && !rolesUsuario.some((r) => item.roles.includes(r))) return false;
    // rolesExcluidos solo oculta si NINGUNO de los roles del usuario lo salva
    // (ej. alguien con Gerente + Supervisor sigue viendo lo que le toca por Supervisor).
    if (item.rolesExcluidos && rolesUsuario.length > 0 && rolesUsuario.every((r) => item.rolesExcluidos.includes(r))) return false;
    return true;
  };
  const secciones = SECCIONES
    .map((seccion) => ({ ...seccion, items: seccion.items.filter(puedeVer) }))
    .filter((seccion) => seccion.items.length > 0);

  return (
    <aside className={`sidebar${colapsado ? ' collapsed' : ''}${abierto ? ' mobile-open' : ''}`}>
      {secciones.map((seccion) => (
        <div className="nav-section" key={seccion.titulo}>
          <div className="nav-group" onClick={() => toggleSeccion(seccion.titulo)}>
            {seccion.titulo}
            <span>{seccionesCerradas[seccion.titulo] ? '›' : '⌄'}</span>
          </div>
          {!seccionesCerradas[seccion.titulo] && (
            <div className="nav-items">
              {seccion.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onCerrar}
                  className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      ))}
      <button className="btn btn-ghost collapse-btn" style={{ margin: '16px 20px', width: 'calc(100% - 40px)' }} onClick={() => setColapsado((c) => !c)}>
        {colapsado ? '»' : '« Contraer menú'}
      </button>
    </aside>
  );
}
