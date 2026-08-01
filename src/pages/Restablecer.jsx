import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRestablecer } from '../api/hooks';

export default function Restablecer() {
  const [usuario, setUsuario] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [errorLocal, setErrorLocal] = useState('');
  const restablecer = useRestablecer();

  async function onSubmit(e) {
    e.preventDefault();
    setErrorLocal('');

    if (passwordNueva.length < 8) {
      setErrorLocal('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (passwordNueva !== confirmar) {
      setErrorLocal('Las contraseñas no coinciden.');
      return;
    }

    restablecer.mutate({ usuario, passwordNueva });
  }

  const errorServidor = restablecer.error?.response?.data?.error;

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={onSubmit}>
        <h1 style={{ margin: 0, fontSize: 19 }}>Restablecer contraseña</h1>
        <p style={{ color: 'var(--text-3)', fontSize: 12.5, marginBottom: 20 }}>
          Solo para cuentas migradas que todavía no tienen contraseña propia.
        </p>

        {restablecer.isSuccess ? (
          <>
            <div className="status-pill ok" style={{ display: 'block', marginBottom: 14 }}>
              Contraseña establecida. Ya puedes iniciar sesión.
            </div>
            <Link to="/login" className="btn btn-primary" style={{ width: '100%', display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              Ir a iniciar sesión
            </Link>
          </>
        ) : (
          <>
            {(errorLocal || errorServidor) && (
              <div className="status-pill warn" style={{ display: 'block', marginBottom: 14 }}>
                {errorLocal || errorServidor}
              </div>
            )}

            <div className="field" style={{ marginBottom: 14 }}>
              <label>Usuario</label>
              <input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" required />
            </div>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>Contraseña nueva</label>
              <input
                type="password"
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="field" style={{ marginBottom: 18 }}>
              <label>Confirmar contraseña</label>
              <input
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <button className="btn btn-primary" style={{ width: '100%' }} disabled={restablecer.isPending}>
              {restablecer.isPending ? 'Guardando...' : 'Establecer contraseña'}
            </button>

            <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12.5 }}>
              <Link to="/login">Volver a iniciar sesión</Link>
            </p>
          </>
        )}
      </form>
    </div>
  );
}
