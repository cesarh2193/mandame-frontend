import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import logoMandame from '../assets/logo-mandame.png';

// Si la foto salió horizontal (más ancha que alta — típico de sostener
// el celular acostado sin querer al fotografiar una boleta), la gira
// 90° a vertical antes de subirla. createImageBitmap con
// imageOrientation:'from-image' ya aplica la rotación que traiga el
// EXIF de la cámara, así que el ancho/alto que vemos acá es el real
// "tal como se ve" la foto, no el crudo del sensor.
async function enderezarSiEsHorizontal(archivo) {
  if (!archivo.type.startsWith('image/') || archivo.type === 'image/heic' || archivo.type === 'image/heif') {
    return archivo; // el HEIC se corrige en el servidor; acá solo tocamos lo que el navegador ya sabe decodificar
  }
  try {
    const bitmap = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
    if (bitmap.width <= bitmap.height) return archivo; // ya es vertical o cuadrada, no se toca

    const canvas = document.createElement('canvas');
    canvas.width = bitmap.height;
    canvas.height = bitmap.width;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) return archivo;
    return new File([blob], archivo.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
  } catch {
    return archivo; // si el navegador no soporta algo de esto, se sube la foto tal cual en vez de bloquear
  }
}

// Pantalla pública (sin sesión) a la que llega un motorista desde el
// link que le comparte su supervisor por WhatsApp — no usa Layout ni
// Sidebar, es standalone como Login.jsx. El token trae el CAD y la
// fecha; acá nunca se le pide elegir ninguno de los dos. Se identifica
// solo buscando y tocando su nombre en la lista, sin ningún código.
export default function SubirBoletaPublico() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [motoristas, setMotoristas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const [confirmado, setConfirmado] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [errorSubida, setErrorSubida] = useState('');
  const [listo, setListo] = useState(false);
  const inputCamaraRef = useRef(null);
  const inputGaleriaRef = useRef(null);

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

  const motoristasFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return motoristas;
    return motoristas.filter((m) => m.nombre?.toLowerCase().includes(q));
  }, [motoristas, busqueda]);

  function elegirMotorista(m) {
    setSeleccionado(m);
    setConfirmado(false);
    setErrorSubida('');
    setListo(false);
  }

  function volverALista() {
    setSeleccionado(null);
    setConfirmado(false);
    setBusqueda('');
    setErrorSubida('');
    setListo(false);
  }

  async function subirArchivo(archivoOriginal) {
    setSubiendo(true);
    setErrorSubida('');
    try {
      const archivo = await enderezarSiEsHorizontal(archivoOriginal);
      const formData = new FormData();
      formData.append('imagen', archivo);
      formData.append('token', token);
      await api.post(`/boletas/publico/${seleccionado.motoristaId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setListo(true);
    } catch (err) {
      setErrorSubida(err?.response?.data?.error || 'No se pudo subir la boleta.');
    } finally {
      setSubiendo(false);
    }
  }

  function onArchivoSeleccionado(e) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (archivo) subirArchivo(archivo);
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
              Buscá y tocá tu nombre para subir tu boleta de hoy.
            </p>
            {motoristas.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                No hay motoristas con cierre de turno registrado todavía para este CAD y fecha.
              </p>
            ) : (
              <>
                <div className="field" style={{ marginBottom: 12 }}>
                  <input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Escribí tu nombre..."
                    autoFocus
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                  {motoristasFiltrados.map((m) => (
                    <button
                      key={m.motoristaId}
                      type="button"
                      className="btn btn-ghost"
                      style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
                      onClick={() => elegirMotorista(m)}
                    >
                      <span>{m.nombre}</span>
                      {m.estado === 'CARGADA' && (
                        <span className="status-pill ok" style={{ flexShrink: 0 }}>Ya subida</span>
                      )}
                    </button>
                  ))}
                  {motoristasFiltrados.length === 0 && (
                    <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 12.5 }}>
                      Ningún nombre coincide con esa búsqueda.
                    </p>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {!cargando && !error && seleccionado && !confirmado && !listo && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>Usted ha seleccionado a:</p>
            <p style={{ fontSize: 17, fontWeight: 800, marginBottom: 14 }}>{seleccionado.nombre}</p>
            {seleccionado.estado === 'CARGADA' && (
              <p style={{ fontSize: 12.5, color: 'var(--amber-dark)', background: 'var(--amber-light)', padding: '8px 12px', borderRadius: 8, marginBottom: 14 }}>
                Ya habías subido tu boleta de hoy. Si seguís, la nueva va a reemplazar a la anterior.
              </p>
            )}
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>¿Está seguro? Si es usted, presione Seguir.</p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', marginBottom: 8 }}
              onClick={() => setConfirmado(true)}
            >
              Seguir
            </button>
            <button type="button" className="btn btn-ghost" style={{ width: '100%' }} onClick={volverALista}>
              Retroceder
            </button>
          </div>
        )}

        {!cargando && !error && seleccionado && confirmado && !listo && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{seleccionado.nombre}</p>
            <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 16 }}>
              Tomá o elegí la foto de tu boleta.
            </p>

            <input
              ref={inputCamaraRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={onArchivoSeleccionado}
            />
            <input
              ref={inputGaleriaRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              style={{ display: 'none' }}
              onChange={onArchivoSeleccionado}
            />

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', marginBottom: 8 }}
              disabled={subiendo}
              onClick={() => inputCamaraRef.current?.click()}
            >
              {subiendo ? 'Subiendo...' : '📷 Tomar foto'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%' }}
              disabled={subiendo}
              onClick={() => inputGaleriaRef.current?.click()}
            >
              Elegir de galería
            </button>

            {errorSubida && (
              <p style={{ color: 'var(--coral-dark)', fontSize: 12.5, marginTop: 12 }}>{errorSubida}</p>
            )}
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%', marginTop: 8 }}
              onClick={volverALista}
            >
              No soy yo, volver a la lista
            </button>
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
