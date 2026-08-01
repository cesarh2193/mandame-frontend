import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoMandame from '../assets/logo-mandame.png';

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const { login, loginPending, loginError } = useAuth();
  const navigate = useNavigate();

  const requiereRestablecer = loginError?.response?.data?.code === 'PASSWORD_RESET_REQUIRED';
  const mensajeError = requiereRestablecer
    ? 'Esta cuenta viene de la migración y no tiene contraseña. Restablécela abajo.'
    : 'Usuario o contraseña incorrectos.';

  async function onSubmit(e) {
    e.preventDefault();
    try {
      await login({ usuario, password });
      navigate('/hoy');
    } catch {
      // loginError ya queda seteado por la mutación; no hace falta nada más aquí
    }
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="login-logo-wrap">
          <img src={logoMandame} alt="Mandame Guatemala" className="login-logo" />
        </div>
        <p style={{ color: 'var(--text-3)', fontSize: 12.5, marginBottom: 20, textAlign: 'center' }}>
          Gestión de repartos · inicia sesión con tu usuario
        </p>

        {loginError && (
          <div className="status-pill warn" style={{ display: 'block', marginBottom: 14 }}>
            {mensajeError}
          </div>
        )}

        <div className="field" style={{ marginBottom: 14 }}>
          <label>Usuario</label>
          <input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" required />
        </div>
        <div className="field" style={{ marginBottom: 18 }}>
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <button className="btn btn-primary" style={{ width: '100%' }} disabled={loginPending}>
          {loginPending ? 'Ingresando...' : 'Iniciar sesión'}
        </button>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12.5 }}>
          <Link to="/restablecer">¿Cuenta migrada sin contraseña? Restablécela aquí</Link>
        </p>
      </form>
    </div>
  );
}
