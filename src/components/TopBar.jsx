import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import logoMandame from '../assets/logo-mandame.png';

const DURACION_ACCESOS_MS = 5000;

export default function TopBar({ onAbrirMenu }) {
  const { usuario, logout } = useAuth();
  const [oscuro, setOscuro] = useState(false);
  const [mostrarAccesos, setMostrarAccesos] = useState(false);
  const cierreAutomatico = useRef(null);

  useEffect(() => {
    document.body.classList.toggle('theme-dark', oscuro);
  }, [oscuro]);

  useEffect(() => () => clearTimeout(cierreAutomatico.current), []);

  const iniciales = usuario?.nombre
    ? usuario.nombre.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()
    : '--';

  function toggleAccesos() {
    clearTimeout(cierreAutomatico.current);
    setMostrarAccesos((v) => {
      const siguiente = !v;
      if (siguiente) cierreAutomatico.current = setTimeout(() => setMostrarAccesos(false), DURACION_ACCESOS_MS);
      return siguiente;
    });
  }

  return (
    <div className="topbar">
      <div className="topbar-left">
        <button className="hamburger-btn" onClick={onAbrirMenu} title="Abrir menú" aria-label="Abrir menú">
          <span />
          <span />
          <span />
        </button>
        <div className="brand-badge">
          <img src={logoMandame} alt="Mandame Guatemala" className="brand-logo" />
        </div>
        <div className="user-badge" onClick={toggleAccesos} role="button" tabIndex={0} title="Ver mis accesos">
          <div className="avatar">{iniciales}</div>
          <span>{usuario?.nombre || 'Cargando...'}</span>

          {mostrarAccesos && (
            <div className="accesos-popover" onClick={(e) => e.stopPropagation()}>
              <div className="accesos-popover-titulo">Rol: {usuario?.rolActivo}</div>
              <div className="accesos-popover-sub">Sucursales con acceso</div>
              <div className="accesos-popover-lista">
                {usuario?.sucursales?.length
                  ? usuario.sucursales.map((s) => s.nombre).join(', ')
                  : 'Todas las sucursales'}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="scope">
        <button className="btn btn-ghost" onClick={() => setOscuro((o) => !o)} title="Cambiar tema">
          {oscuro ? 'Modo claro' : 'Modo oscuro'}
        </button>
        <button className="btn btn-ghost" onClick={logout}>Cerrar sesión</button>
      </div>
    </div>
  );
}
