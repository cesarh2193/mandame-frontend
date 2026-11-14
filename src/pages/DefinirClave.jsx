import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInfoLinkClave, useDefinirClave } from '../api/hooks';
import { validarClaveNueva, AYUDA_CLAVE } from '../utils/clave';
import logoMandame from '../assets/logo-mandame.png';

// Pantalla del link que llega por correo: activar una cuenta nueva (o
// migrada) eligiendo la contraseña, o restablecerla si se olvidó.
export default function DefinirClave() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const info = useInfoLinkClave(token);
  const definir = useDefinirClave();
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [errorLocal, setErrorLocal] = useState('');

  function onSubmit(e) {
    e.preventDefault();
    const error = validarClaveNueva(nueva, confirmar);
    setErrorLocal(error || '');
    if (!error) definir.mutate({ token, nueva });
  }

  const esActivacion = info.data?.tipo === 'activar';
  const linkInvalido = !token || info.isError;
  const errorServidor = definir.error?.response?.data?.error;

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="login-logo-wrap">
          <img src={logoMandame} alt="Mandame Guatemala" className="login-logo" />
        </div>

        {info.isLoading && <p style={{ textAlign: 'center' }}>Verificando el link...</p>}

        {linkInvalido && (
          <>
            <div className="status-pill warn" style={{ display: 'block', marginBottom: 14 }}>
              {info.error?.response?.data?.error || 'Este link no es válido.'}
            </div>
            <Link to="/olvide-clave" className="btn btn-primary" style={{ width: '100%', display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              Pedir un link nuevo
            </Link>
          </>
        )}

        {info.data && definir.isSuccess && (
          <>
            <div className="status-pill ok" style={{ display: 'block', marginBottom: 14 }}>
              Listo, tu contraseña quedó guardada. Ya puedes iniciar sesión con el usuario <strong>{definir.data?.usuario}</strong>.
            </div>
            <Link to="/login" className="btn btn-primary" style={{ width: '100%', display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              Ir a iniciar sesión
            </Link>
          </>
        )}

        {info.data && !definir.isSuccess && (
          <>
            <h1 style={{ margin: '0 0 6px', fontSize: 18, textAlign: 'center' }}>
              {esActivacion ? 'Activa tu cuenta' : 'Elige una contraseña nueva'}
            </h1>
            <p style={{ color: 'var(--text-3)', fontSize: 12.5, marginBottom: 20, textAlign: 'center' }}>
              Hola {info.data.nombre}. Tu usuario es <strong>{info.data.usuario}</strong>.
            </p>

            {(errorLocal || errorServidor) && (
              <div className="status-pill warn" style={{ display: 'block', marginBottom: 14 }}>{errorLocal || errorServidor}</div>
            )}

            <div className="field" style={{ marginBottom: 14 }}>
              <label>Contraseña nueva</label>
              <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} autoComplete="new-password" required />
              <small style={{ color: 'var(--text-3)' }}>{AYUDA_CLAVE}</small>
            </div>
            <div className="field" style={{ marginBottom: 18 }}>
              <label>Confirmar contraseña</label>
              <input type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} autoComplete="new-password" required />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={definir.isPending}>
              {definir.isPending ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
