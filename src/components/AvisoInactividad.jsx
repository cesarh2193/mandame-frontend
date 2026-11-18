import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { registrarActividad, marcarActividadAhora, ultimaActividad } from '../utils/actividad';

const EVENTOS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'];
const AVISO_MS = 60 * 1000;   // el aviso aparece 1 minuto antes
const LATIDO_MS = 30 * 1000;  // cada cuánto se le avisa al servidor que sigue activo

/**
 * Cierra la sesión si la persona no usa el sistema durante su límite
 * (10 min Administrador, 15 min el resto: lo define el servidor). Un
 * minuto antes muestra un aviso con "Seguir trabajando". Las pantallas
 * que se actualizan solas no cuentan como actividad.
 */
export default function AvisoInactividad() {
  const { usuario, cerrarPorInactividad } = useAuth();
  const [segundosRestantes, setSegundosRestantes] = useState(null);
  const avisoVisible = useRef(false);
  const ultimoLatido = useRef(Date.now());
  const limiteMs = (usuario?.minutosInactividad || 15) * 60 * 1000;

  useEffect(() => {
    marcarActividadAhora(); // abrir o recargar la página también es usarla

    // Con el aviso en pantalla, mover el mouse no basta: hay que tocar el botón.
    const alUsar = () => { if (!avisoVisible.current) registrarActividad(); };
    EVENTOS.forEach((e) => window.addEventListener(e, alUsar, { passive: true, capture: true }));

    const reloj = setInterval(() => {
      const ahora = Date.now();
      const inactivo = ahora - ultimaActividad();

      if (inactivo >= limiteMs) {
        clearInterval(reloj);
        cerrarPorInactividad();
        return;
      }
      if (inactivo >= limiteMs - AVISO_MS) {
        avisoVisible.current = true;
        setSegundosRestantes(Math.ceil((limiteMs - inactivo) / 1000));
      } else if (avisoVisible.current) {
        avisoVisible.current = false; // siguió trabajando en otra pestaña
        setSegundosRestantes(null);
      }

      // Si usó el sistema desde el último aviso al servidor, se le avisa de
      // nuevo (las peticiones ya llevan el header, esto cubre cuando solo
      // está leyendo o escribiendo sin guardar).
      if (ultimaActividad() > ultimoLatido.current && ahora - ultimoLatido.current >= LATIDO_MS) {
        ultimoLatido.current = ahora;
        api.post('/auth/actividad').catch(() => {});
      }
    }, 1000);

    return () => {
      clearInterval(reloj);
      EVENTOS.forEach((e) => window.removeEventListener(e, alUsar, { capture: true }));
    };
  }, [limiteMs, cerrarPorInactividad]);

  function seguir() {
    avisoVisible.current = false;
    setSegundosRestantes(null);
    marcarActividadAhora();
    ultimoLatido.current = Date.now();
    api.post('/auth/actividad').catch(() => {});
  }

  if (segundosRestantes === null) return null;

  return (
    <div
      role="alertdialog"
      aria-labelledby="titulo-inactividad"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,20,30,.6)', zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
      }}
    >
      <div className="card" style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
        <h3 id="titulo-inactividad" style={{ marginTop: 0 }}>¿Sigue ahí?</h3>
        <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: '0 0 6px' }}>
          Por seguridad, su sesión se cerrará por inactividad en
        </p>
        <p style={{ fontSize: 32, fontWeight: 800, margin: '0 0 16px', color: 'var(--coral-dark)' }}>
          {segundosRestantes} s
        </p>
        <button type="button" className="btn btn-primary" style={{ width: '100%', marginBottom: 8 }} onClick={seguir} autoFocus>
          Seguir trabajando
        </button>
        <button type="button" className="btn btn-ghost" style={{ width: '100%' }} onClick={cerrarPorInactividad}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
