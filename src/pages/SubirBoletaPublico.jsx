import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import logoMandame from '../assets/logo-mandame.png';

// Pantalla pública (sin sesión) a la que llega un motorista desde el
// link que le comparte su supervisor por WhatsApp — no usa Layout ni
// Sidebar, es standalone como Login.jsx. El token trae el CAD y la
// fecha; acá nunca se le pide elegir ninguno de los dos.
export default function SubirBoletaPublico() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [motoristas, setMotoristas] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [codigo, setCodigo] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [verificado, setVerificado] = useState(false);
  const [errorCodigo, setErrorCodigo] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [listo, setListo] = useState(false);
  const inputArchivoRef = useRef(null);

  useEffect(() => {
    if (!token) {
      setError('Este link no es válido: falta el token.');
      setCargando(false);
      return;
    }
    api.get('/boletas/publico/motoristas', { params: { token } })
      .then((res) => setMotoristas(res.data ?? []))
      .catch((err) => setError(err?.response?.data?.error || 'Este link ya no es válido o venció.'))
      .finally(() => setCargando(false));
  }, [token]);

  function elegirMotorista(m) {
    setSeleccionado(m);
    setCodigo('');
    setVerificado(false);
    setErrorCodigo('');
    setListo(false);
  }

  function volverALista() {
    setSeleccionado(null);
    setCodigo('');
    setVerificado(false);
    setErrorCodigo('');
    setListo(false);
  }

  async function confirmarCodigo(e) {
    e.preventDefault();
    setVerificando(true);
    setErrorCodigo('');
    try {
      await api.post('/boletas/publico/verificar', { token, motoristaId: seleccionado.motoristaId, codigo });
      setVerificado(true);
    } catch (err) {
      setErrorCodigo(err?.response?.data?.error || 'El código no coincide.');
    } finally {
      setVerificando(false);
    }
  }

  async function onArchivoSeleccionado(e) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;

    setSubiendo(true);
    setErrorCodigo('');
    try {
      const formData = new FormData();
      formData.append('imagen', archivo);
      formData.append('token', token);
      formData.append('codigo', codigo);
      await api.post(`/boletas/publico/${seleccionado.motoristaId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setListo(true);
    } catch (err) {
      setErrorCodigo(err?.response?.data?.error || 'No se pudo subir la boleta.');
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card" style={{ maxWidth: 440 }}>
        <div className="login-logo-wrap">
          <img src={logoMandame} alt="Mandame Guatemala" className="login-logo" />
        </div>

        {cargando && <p style={{ textAlign: 'center', color: 'var(--text-3)' }}>Cargando...</p>}

        {!cargando && error && (
          <p style={{ color: 'var(--coral-dark)', background: 'var(--coral-light)', padding: '10px 12px', borderRadius: 8, fontSize: 13, textAlign: 'center' }}>
            {error}
          </p>
        )}

        {!cargando && !error && !seleccionado && (
          <>
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>
              Elegí tu nombre para subir tu boleta de hoy.
            </p>
            {motoristas.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                No hay motoristas con cierre de turno registrado todavía para este CAD y fecha.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {motoristas.map((m) => (
                  <button
                    key={m.motoristaId}
                    type="button"
                    className="btn btn-ghost"
                    style={{ textAlign: 'left' }}
                    onClick={() => elegirMotorista(m)}
                  >
                    {m.nombre}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {!cargando && !error && seleccionado && !verificado && (
          <form onSubmit={confirmarCodigo}>
            <p style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{seleccionado.nombre}</p>
            <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--text-2)', marginBottom: 14 }}>
              Escribí tu código de motorista para confirmar que sos vos.
            </p>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Código de motorista</label>
              <input value={codigo} onChange={(e) => setCodigo(e.target.value)} autoFocus required />
            </div>
            {errorCodigo && (
              <p style={{ color: 'var(--coral-dark)', fontSize: 12.5, marginBottom: 12 }}>{errorCodigo}</p>
            )}
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={verificando}>
              {verificando ? 'Verificando...' : 'Confirmar'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%', marginTop: 8 }}
              onClick={volverALista}
            >
              No soy yo, volver a la lista
            </button>
          </form>
        )}

        {!cargando && !error && seleccionado && verificado && !listo && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{seleccionado.nombre}</p>
            <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 16 }}>
              Identidad confirmada. Subí la foto de tu boleta.
            </p>
            <input
              ref={inputArchivoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={onArchivoSeleccionado}
            />
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={subiendo}
              onClick={() => inputArchivoRef.current?.click()}
            >
              {subiendo ? 'Subiendo...' : 'Subir boleta'}
            </button>
            {errorCodigo && (
              <p style={{ color: 'var(--coral-dark)', fontSize: 12.5, marginTop: 12 }}>{errorCodigo}</p>
            )}
          </div>
        )}

        {listo && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--teal-dark)', marginBottom: 8 }}>
              ¡Listo! Tu boleta se subió correctamente.
            </p>
            <button type="button" className="btn btn-ghost" style={{ width: '100%' }} onClick={volverALista}>
              Subir otra
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
