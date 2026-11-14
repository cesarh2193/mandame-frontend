import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCambiarClave } from '../api/hooks';
import { validarClaveNueva, AYUDA_CLAVE } from '../utils/clave';
import { rutaInicio } from '../utils/rutas';
import { useToast } from '../context/ToastContext';
import logoMandame from '../assets/logo-mandame.png';

// Cambiar contraseña desde la sesión. Si entró con una contraseña
// temporal, esta pantalla es obligatoria antes de usar el sistema.
export default function CambiarClave() {
  const { usuario, isAuthenticated, authLoading, marcarClaveCambiada, logout } = useAuth();
  const cambiar = useCambiarClave();
  const navigate = useNavigate();
  const mostrarToast = useToast();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [errorLocal, setErrorLocal] = useState('');

  if (authLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const obligatorio = !!usuario?.debeCambiarClave;

  function onSubmit(e) {
    e.preventDefault();
    let error = validarClaveNueva(nueva, confirmar);
    if (!error && nueva === actual) error = 'La contraseña nueva tiene que ser distinta a la actual.';
    setErrorLocal(error || '');
    if (error) return;
    cambiar.mutate({ actual, nueva }, {
      onSuccess: () => {
        marcarClaveCambiada();
        mostrarToast('Contraseña actualizada.', 'ok');
        navigate(rutaInicio(usuario), { replace: true });
      }
    });
  }

  const errorServidor = cambiar.error?.response?.data?.error;

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="login-logo-wrap">
          <img src={logoMandame} alt="Mandame Guatemala" className="login-logo" />
        </div>
        <h1 style={{ margin: '0 0 6px', fontSize: 18, textAlign: 'center' }}>Cambiar contraseña</h1>
        <p style={{ color: 'var(--text-3)', fontSize: 12.5, marginBottom: 20, textAlign: 'center' }}>
          {obligatorio
            ? 'Entraste con una contraseña temporal. Elige la tuya para continuar.'
            : 'Elige una contraseña nueva para tu cuenta.'}
        </p>

        {(errorLocal || errorServidor) && (
          <div className="status-pill warn" style={{ display: 'block', marginBottom: 14 }}>{errorLocal || errorServidor}</div>
        )}

        <div className="field" style={{ marginBottom: 14 }}>
          <label>{obligatorio ? 'Contraseña temporal' : 'Contraseña actual'}</label>
          <input type="password" value={actual} onChange={(e) => setActual(e.target.value)} autoComplete="current-password" required />
        </div>
        <div className="field" style={{ marginBottom: 14 }}>
          <label>Contraseña nueva</label>
          <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} autoComplete="new-password" required />
          <small style={{ color: 'var(--text-3)' }}>{AYUDA_CLAVE}</small>
        </div>
        <div className="field" style={{ marginBottom: 18 }}>
          <label>Confirmar contraseña nueva</label>
          <input type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} autoComplete="new-password" required />
        </div>

        <button className="btn btn-primary" style={{ width: '100%' }} disabled={cambiar.isPending}>
          {cambiar.isPending ? 'Guardando...' : 'Guardar contraseña'}
        </button>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12.5 }}>
          {obligatorio ? (
            <button type="button" className="btn btn-ghost" onClick={logout}>Cerrar sesión</button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancelar</button>
          )}
        </p>
      </form>
    </div>
  );
}
