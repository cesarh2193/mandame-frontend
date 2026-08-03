import { useEffect, useState } from 'react';
import { api } from '../api/client';

// Muestra la foto de una persona. Si se pasa `archivoLocal` (un File
// recién elegido, aún no subido), se previsualiza directo desde el
// navegador. Si no, y la persona ya tiene foto guardada, se pide al
// backend con axios (no un <img src> plano) porque esa ruta exige el
// token de sesión igual que el resto de la API.
export default function FotoPersonal({ personaId, tieneFoto, archivoLocal, tamano = 96 }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (archivoLocal) {
      const objectUrl = URL.createObjectURL(archivoLocal);
      setUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }

    if (!personaId || !tieneFoto) {
      setUrl(null);
      return;
    }

    let activo = true;
    let objectUrl = null;
    api.get(`/personal/${personaId}/foto`, { responseType: 'blob' })
      .then((res) => {
        if (!activo) return;
        objectUrl = URL.createObjectURL(res.data);
        setUrl(objectUrl);
      })
      .catch(() => { if (activo) setUrl(null); });

    return () => {
      activo = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [personaId, tieneFoto, archivoLocal]);

  const estilo = {
    width: tamano, height: tamano, borderRadius: '50%', objectFit: 'cover',
    border: '1px solid var(--line)', background: 'var(--card)'
  };

  if (!url) {
    return (
      <div
        style={{
          ...estilo, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-3)', fontSize: tamano * 0.35
        }}
      >
        —
      </div>
    );
  }

  return <img src={url} alt="Foto" style={estilo} />;
}
