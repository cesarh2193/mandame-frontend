import { useEffect, useRef, useState } from 'react';
import { analizarFotoBoleta, dibujarFotoBoleta } from '../utils/fotoBoleta';

export const LARGO_MAX_COMENTARIO = 60; // igual que en el backend (boleta.service.js)

// "2026-11-16" → "16.11.2026"
function fechaConPuntos(fecha) {
  const [a, m, d] = String(fecha || '').split('-');
  return d && m && a ? `${d}.${m}.${a}` : '';
}

/**
 * Muestra la boleta ya recortada y vertical antes de subirla, con un
 * comentario opcional que va en el nombre del archivo. La persona puede
 * girarla, ver la foto completa si el recorte no quedó bien, o tomar otra.
 *
 * onSubir(archivo, comentario) recibe la foto ya preparada (JPG) o, si el
 * navegador no pudo abrirla, el archivo original tal cual.
 */
export default function VistaPreviaBoleta({ archivo, nombre, fecha, subiendo, error, onSubir, onOtraFoto, textoOtraFoto = 'Tomar otra foto' }) {
  const [analisis, setAnalisis] = useState(undefined); // undefined = procesando, null = sin vista previa
  const [usarRecorte, setUsarRecorte] = useState(true);
  const [giro, setGiro] = useState(0);
  const [urlVista, setUrlVista] = useState('');
  const [comentario, setComentario] = useState('');
  const blobRef = useRef(null);

  useEffect(() => {
    let vigente = true;
    setAnalisis(undefined);
    analizarFotoBoleta(archivo).then((res) => {
      if (!vigente) return;
      setAnalisis(res);
      setUsarRecorte(true);
      setGiro(res?.giro ?? 0);
    });
    return () => { vigente = false; };
  }, [archivo]);

  useEffect(() => {
    if (!analisis) return undefined;
    let vigente = true;
    let url = '';
    dibujarFotoBoleta(analisis.bitmap, usarRecorte ? analisis.recorte : null, giro)
      .then((blob) => {
        if (!vigente) return;
        blobRef.current = blob;
        url = URL.createObjectURL(blob);
        setUrlVista(url);
      })
      .catch(() => {
        if (vigente) setAnalisis(null);
      });
    return () => {
      vigente = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [analisis, usarRecorte, giro]);

  // Al cambiar de recorte, la foto queda acostada o parada según el nuevo
  // encuadre; se vuelve a elegir el giro que la deja vertical.
  function alternarRecorte() {
    const siguiente = !usarRecorte;
    const r = siguiente && analisis.recorte ? analisis.recorte : { w: analisis.bitmap.width, h: analisis.bitmap.height };
    setUsarRecorte(siguiente);
    setGiro(r.w > r.h ? 90 : 0);
  }

  function subir() {
    const listo = analisis && blobRef.current
      ? new File([blobRef.current], 'boleta.jpg', { type: 'image/jpeg' })
      : archivo;
    onSubir(listo, comentario.trim());
  }

  const procesando = analisis === undefined || (analisis && !urlVista);
  const nota = comentario.trim().replace(/\s+/g, ' ');
  const nombreFinal = [nombre, nota, fechaConPuntos(fecha)].filter(Boolean).join(' ');

  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          background: 'var(--chip-bg)', borderRadius: 10, minHeight: 220, maxHeight: '48vh',
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 10
        }}
      >
        {procesando && <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Preparando la foto...</span>}
        {!procesando && analisis && (
          <img src={urlVista} alt="Vista previa de la boleta" style={{ maxWidth: '100%', maxHeight: '48vh', objectFit: 'contain', display: 'block' }} />
        )}
        {!procesando && !analisis && (
          <span style={{ fontSize: 12.5, color: 'var(--text-3)', padding: 16 }}>
            Este navegador no puede mostrar la vista previa de esta foto. Se subirá tal cual y el sistema la convierte.
          </span>
        )}
      </div>

      {!procesando && analisis && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <button type="button" className="btn btn-ghost" disabled={subiendo} onClick={() => setGiro((g) => (g + 90) % 360)}>
            ↻ Girar
          </button>
          {analisis.recorte && (
            <button type="button" className="btn btn-ghost" disabled={subiendo} onClick={alternarRecorte}>
              {usarRecorte ? 'Ver foto completa' : 'Usar recorte'}
            </button>
          )}
        </div>
      )}

      <div className="field" style={{ textAlign: 'left', marginBottom: 6 }}>
        <label>Comentario (opcional)</label>
        <input
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          maxLength={LARGO_MAX_COMENTARIO}
          placeholder="Ej.: 4 horas, plaza fija, cubre plaza de Juan Pérez"
          disabled={subiendo}
        />
      </div>
      {nombre && (
        <p style={{ fontSize: 11.5, color: 'var(--text-3)', textAlign: 'left', margin: '0 0 14px', wordBreak: 'break-word' }}>
          Se guardará como: <strong>{nombreFinal}</strong>
        </p>
      )}

      {error && <p style={{ color: 'var(--coral-dark)', fontSize: 12.5, margin: '0 0 10px' }}>{error}</p>}

      <button type="button" className="btn btn-primary" style={{ width: '100%', marginBottom: 8 }} disabled={subiendo || procesando} onClick={subir}>
        {subiendo ? 'Subiendo...' : 'Subir boleta'}
      </button>
      <button type="button" className="btn btn-ghost" style={{ width: '100%' }} disabled={subiendo} onClick={onOtraFoto}>
        {textoOtraFoto}
      </button>
    </div>
  );
}
