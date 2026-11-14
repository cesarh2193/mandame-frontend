import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useOlvideClave } from '../api/hooks';
import logoMandame from '../assets/logo-mandame.png';

// "¿Olvidaste tu contraseña?": manda un link al correo registrado. También
// sirve para las cuentas que todavía no tienen contraseña (migradas).
export default function OlvideClave() {
  const [usuario, setUsuario] = useState('');
  const olvide = useOlvideClave();

  function onSubmit(e) {
    e.preventDefault();
    olvide.mutate(usuario.trim());
  }

  const errorServidor = olvide.error?.response?.data?.error;

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="login-logo-wrap">
          <img src={logoMandame} alt="Mandame Guatemala" className="login-logo" />
        </div>
        <h1 style={{ margin: '0 0 6px', fontSize: 18, textAlign: 'center' }}>¿Olvidaste tu contraseña?</h1>
        <p style={{ color: 'var(--text-3)', fontSize: 12.5, marginBottom: 20, textAlign: 'center' }}>
          Escribe tu usuario o tu correo y te enviamos un link para elegir una contraseña nueva.
        </p>

        {olvide.isSuccess ? (
          <div className="status-pill ok" style={{ display: 'block', marginBottom: 14 }}>
            {olvide.data?.mensaje} Revisa también la carpeta de spam. El link vence en 1 hora.
          </div>
        ) : (
          <>
            {errorServidor && (
              <div className="status-pill warn" style={{ display: 'block', marginBottom: 14 }}>{errorServidor}</div>
            )}
            <div className="field" style={{ marginBottom: 18 }}>
              <label>Usuario o correo</label>
              <input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" required />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={olvide.isPending}>
              {olvide.isPending ? 'Enviando...' : 'Enviarme el link'}
            </button>
            <p style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 14, textAlign: 'center' }}>
              Si no tienes correo registrado, pídele a un administrador una contraseña temporal.
            </p>
          </>
        )}

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12.5 }}>
          <Link to="/login">Volver a iniciar sesión</Link>
        </p>
      </form>
    </div>
  );
}
