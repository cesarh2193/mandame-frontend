import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../api/client';
import { hoyLocal, formatearFechaDisplay } from '../../utils/fecha';

export default function AsistenciaInforme() {
  const { usuario } = useAuth();
  const mostrarToast = useToast();
  const hoy = hoyLocal();
  const [sucursalId, setSucursalId] = useState(usuario?.sucursales?.[0]?.id ?? '');
  const [motoristas, setMotoristas] = useState([]);
  const [motoristaId, setMotoristaId] = useState('');
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin, setFechaFin] = useState(hoy);
  const [generando, setGenerando] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [filas, setFilas] = useState(null);

  const nombreSeleccionado = useMemo(
    () => motoristas.find((m) => String(m.motoristaId) === String(motoristaId))?.nombre ?? '',
    [motoristas, motoristaId]
  );

  useEffect(() => {
    let activo = true;

    async function cargarMotoristas() {
      if (!sucursalId) {
        if (activo) {
          setMotoristas([]);
          setMotoristaId('');
        }
        return;
      }

      try {
        const res = await api.get('/informes/asistencia/motoristas', { params: { sucursalId } });
        if (!activo) return;
        setMotoristas(res.data ?? []);
        if (!res.data?.length) {
          setMotoristaId('');
        }
      } catch {
        if (activo) {
          setMotoristas([]);
          setMotoristaId('');
        }
      }
    }

    const timer = setTimeout(() => {
      cargarMotoristas();
    }, 200);

    return () => {
      activo = false;
      clearTimeout(timer);
    };
  }, [sucursalId]);

  async function buscarAsistencia() {
    if (!motoristaId || !fechaInicio || !fechaFin) {
      mostrarToast('Selecciona un empleado y un rango de fechas válido.', 'error');
      return;
    }

    setBuscando(true);
    try {
      const res = await api.get('/informes/asistencia/preview', {
        params: { motoristaId, fechaInicio, fechaFin }
      });
      setFilas(res.data ?? []);
    } catch (err) {
      setFilas(null);
      mostrarToast(err?.response?.data?.error || 'No se pudo consultar la asistencia.', 'error');
    } finally {
      setBuscando(false);
    }
  }

  async function generarReporte() {
    if (!motoristaId || !fechaInicio || !fechaFin) {
      mostrarToast('Selecciona un empleado y un rango de fechas válido.', 'error');
      return;
    }

    setGenerando(true);
    try {
      const res = await api.get('/informes/asistencia', {
        params: { motoristaId, fechaInicio, fechaFin },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `informe-asistencia-${fechaInicio}-${fechaFin}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      mostrarToast(err?.response?.data?.error || 'No se pudo generar el informe.', 'error');
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Informe de asistencia</h1>
      <p className="page-sub">
        Selecciona un motorista del CAD y genera el reporte en formato PDF para el rango de fechas solicitado.
      </p>

      <div className="card">
        <div className="form-grid-consulta">
          <div className="field">
            <label>CAD (sucursal)</label>
            <select value={sucursalId} onChange={(e) => { setSucursalId(e.target.value); setMotoristaId(''); setFilas(null); }}>
              <option value="">Selecciona un CAD</option>
              {usuario?.sucursales?.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Motorista</label>
            <select
              value={motoristaId}
              onChange={(e) => { setMotoristaId(e.target.value); setFilas(null); }}
              disabled={!sucursalId}
            >
              <option value="">Selecciona un motorista</option>
              {motoristas.map((m) => (
                <option key={m.motoristaId} value={m.motoristaId}>{m.nombre}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Fecha inicio</label>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          </div>

          <div className="field">
            <label>Fecha final</label>
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
          </div>

          <div className="field" style={{ display: 'flex', alignItems: 'end' }}>
            <button className="btn btn-secondary" onClick={buscarAsistencia} disabled={buscando || !motoristaId || !sucursalId}>
              {buscando ? 'Buscando...' : 'Buscar'}
            </button>
          </div>

          <div className="field" style={{ display: 'flex', alignItems: 'end' }}>
            <button className="btn btn-primary" onClick={generarReporte} disabled={generando || !motoristaId || !sucursalId}>
              {generando ? 'Generando...' : 'Generar reporte'}
            </button>
          </div>
        </div>

        {nombreSeleccionado && (
          <div style={{ marginTop: 14, color: 'var(--text-2)' }}>
            <strong>Motorista seleccionado:</strong> {nombreSeleccionado}
          </div>
        )}
      </div>

      {filas !== null && (
        <div className="card" style={{ marginTop: 16 }}>
          {filas.length === 0 ? (
            <p className="page-sub">No hay datos de asistencia para el rango solicitado.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Día</th>
                  <th>Hora Entrada</th>
                  <th>Hora Salida</th>
                  <th>Total Horas</th>
                  <th>Repartos</th>
                  <th>Controlador</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr key={fila.fecha}>
                    <td>{formatearFechaDisplay(fila.fecha)}</td>
                    <td>{fila.dia}</td>
                    <td>{fila.horaEntrada || '—'}</td>
                    <td>{fila.horaSalida || '—'}</td>
                    <td>{fila.totalHoras ?? '—'}</td>
                    <td>{fila.repartos ?? 0}</td>
                    <td>{fila.controlador || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
