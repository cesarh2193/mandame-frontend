import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../api/client';
import { hoyLocal, formatearFechaDisplay } from '../../utils/fecha';

export default function AsistenciaGeneral() {
  const { usuario } = useAuth();
  const mostrarToast = useToast();
  const hoy = hoyLocal();
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin, setFechaFin] = useState(hoy);
  const [sucursalId, setSucursalId] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [generandoExcel, setGenerandoExcel] = useState(false);
  const [filas, setFilas] = useState(null);

  function rangoValido() {
    if (!fechaInicio || !fechaFin) {
      mostrarToast('Selecciona la fecha de inicio y la fecha final.', 'error');
      return false;
    }
    if (fechaInicio > fechaFin) {
      mostrarToast('La fecha de inicio no puede ser posterior a la fecha final.', 'error');
      return false;
    }
    return true;
  }

  async function buscar() {
    if (!rangoValido()) return;

    setBuscando(true);
    try {
      const res = await api.get('/informes/asistencia-general/preview', {
        params: { fechaInicio, fechaFin, sucursalId: sucursalId || undefined }
      });
      setFilas(res.data ?? []);
    } catch (err) {
      setFilas(null);
      mostrarToast(err?.response?.data?.error || 'No se pudo consultar la asistencia general.', 'error');
    } finally {
      setBuscando(false);
    }
  }

  async function exportarPDF() {
    if (!rangoValido()) return;

    setGenerando(true);
    try {
      const res = await api.get('/informes/asistencia-general', {
        params: { fechaInicio, fechaFin, sucursalId: sucursalId || undefined },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `asistencia-general-${fechaInicio}-a-${fechaFin}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      mostrarToast(err?.response?.data?.error || 'No se pudo generar el PDF.', 'error');
    } finally {
      setGenerando(false);
    }
  }

  async function exportarExcel() {
    if (!rangoValido()) return;

    setGenerandoExcel(true);
    try {
      const res = await api.get('/informes/asistencia-general/excel', {
        params: { fechaInicio, fechaFin, sucursalId: sucursalId || undefined },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `asistencia-general-${fechaInicio}-a-${fechaFin}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      mostrarToast(err?.response?.data?.error || 'No se pudo generar el Excel.', 'error');
    } finally {
      setGenerandoExcel(false);
    }
  }

  const rangoDeVariosDias = fechaInicio !== fechaFin;

  return (
    <div>
      <h1 className="page-title">Asistencia general</h1>
      <p className="page-sub">
        Consulta, para un rango de fechas, los motoristas con asistencia y cierre de turno en los CAD a los
        que tienes acceso (o en uno solo, si lo eliges), y exporta el listado en PDF o Excel.
      </p>

      <div className="card">
        <div className="form-grid-3">
          <div className="field">
            <label>Fecha inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => { setFechaInicio(e.target.value); setFilas(null); }}
            />
          </div>

          <div className="field">
            <label>Fecha final</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => { setFechaFin(e.target.value); setFilas(null); }}
            />
          </div>

          <div className="field">
            <label>CAD (sucursal)</label>
            <select value={sucursalId} onChange={(e) => { setSucursalId(e.target.value); setFilas(null); }}>
              <option value="">Todos los CAD a los que tengo acceso</option>
              {usuario?.sucursales?.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
          <button className="btn btn-submodal" onClick={buscar} disabled={buscando || !fechaInicio || !fechaFin}>
            {buscando ? 'Buscando...' : 'Buscar'}
          </button>
          <button className="btn btn-primary" onClick={exportarPDF} disabled={generando || !fechaInicio || !fechaFin}>
            {generando ? 'Generando...' : 'Exportar PDF'}
          </button>
          <button className="btn btn-secondary" onClick={exportarExcel} disabled={generandoExcel || !fechaInicio || !fechaFin}>
            {generandoExcel ? 'Generando...' : 'Exportar Excel'}
          </button>
        </div>
      </div>

      {filas !== null && (
        <div className="card" style={{ marginTop: 16 }}>
          {filas.length === 0 ? (
            <p className="page-sub">No hay motoristas con asistencia y cierre de turno para este rango de fechas.</p>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    <th className="col-ocultar-movil">CAD</th>
                    {rangoDeVariosDias && <th className="col-ocultar-movil">Fecha</th>}
                    <th className="col-ocultar-movil">Cod</th>
                    <th>Nombre</th>
                    <th>Entrada</th>
                    <th>Salida</th>
                    <th>Repartos</th>
                    <th>Tarifa</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((fila, idx) => (
                    <tr key={`${fila.codigo}-${fila.fecha}-${idx}`}>
                      <td className="col-ocultar-movil">{fila.sucursal}</td>
                      {rangoDeVariosDias && <td className="col-ocultar-movil">{formatearFechaDisplay(fila.fecha)}</td>}
                      <td className="col-ocultar-movil">{fila.codigo}</td>
                      <td>{fila.nombre}</td>
                      <td>{fila.horaIngreso || '—'}</td>
                      <td>{fila.horaSalida || '—'}</td>
                      <td>{fila.cantidadRepartos ?? 0}</td>
                      <td>{fila.tarifa || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>
                Total con asistencia y cierre de turno: {filas.length}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
