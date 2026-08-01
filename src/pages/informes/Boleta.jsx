import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../api/client';
import { hoyLocal } from '../../utils/fecha';

export default function Boleta() {
  const { usuario } = useAuth();
  const mostrarToast = useToast();
  const hoy = hoyLocal();
  const [fecha, setFecha] = useState(hoy);
  const [sucursalId, setSucursalId] = useState('');
  const [generando, setGenerando] = useState(false);

  async function generar() {
    setGenerando(true);
    try {
      const res = await api.get('/informes/boleta', { params: { fecha, sucursalId }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `boletas-${fecha}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      mostrarToast(err?.response?.data?.error || 'No se pudo generar la boleta.', 'error');
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Boleta</h1>
      <p className="page-sub">
        Genera la boleta impresa de cada motorista con asistencia y cierre de turno en la fecha elegida
        (dos motoristas por hoja).
      </p>

      <div className="card">
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="field">
            <label>Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="field">
            <label>CAD (sucursal)</label>
            <select value={sucursalId} onChange={(e) => setSucursalId(e.target.value)}>
              <option value="">Todas las que tengo asignadas</option>
              {usuario?.sucursales?.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={generar} disabled={generando}>
          {generando ? 'Generando...' : 'Generar boleta (PDF)'}
        </button>
      </div>
    </div>
  );
}
