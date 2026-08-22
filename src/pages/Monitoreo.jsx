import { useMemo, useState } from 'react';
import { useMonitoreo } from '../api/hooks';
import { api } from '../api/client';
import { hoyLocal } from '../utils/fecha';

export default function Monitoreo() {
  const hoy = hoyLocal();
  const [fecha] = useState(hoy);
  const { data: filas } = useMonitoreo(fecha);

  async function descargarPDF() {
    // El backend genera el PDF (ver endpoint /monitoreo/pdf en el
    // README del backend) y lo devuelve como binario; aquí solo se
    // dispara la descarga en el navegador.
    const res = await api.get('/monitoreo/pdf', { params: { fecha }, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `monitoreo-${fecha}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Un CAD "sin movimiento" es el que hoy no tiene ni planificación
  // ni asistencia registrada — no importa cuántos motoristas fijos o
  // de turno tenga en su plantilla, el punto es que nadie ha usado el
  // sistema ahí hoy. Separarlos es justo lo que permite detectar de
  // un vistazo qué CAD todavía no arrancan turno.
  const { conMovimiento, sinMovimiento } = useMemo(() => {
    const con = [];
    const sin = [];
    (filas ?? []).forEach((f) => {
      const tieneMovimiento = Number(f.plan) > 0 || Number(f.asistencia) > 0;
      (tieneMovimiento ? con : sin).push(f);
    });
    return { conMovimiento: con, sinMovimiento: sin };
  }, [filas]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <h1 className="page-title">Monitoreo</h1>
          <p className="page-sub">Cuadre de planificación vs. asistencia por CAD</p>
        </div>
        <button className="btn btn-primary" onClick={descargarPDF} style={{ flexShrink: 0 }}>
          Descargar PDF
        </button>
      </div>

      <div className="card">
        <h2>CAD con planificación o asignación hoy ({conMovimiento.length})</h2>
        {conMovimiento.length > 0 ? (
          <TablaMonitoreo filas={conMovimiento} />
        ) : (
          <p style={{ color: 'var(--text-3)', fontSize: 12.5 }}>Ningún CAD tiene movimiento registrado todavía hoy.</p>
        )}
      </div>

      <div className="card">
        <h2>CAD sin movimiento hoy ({sinMovimiento.length})</h2>
        <p className="page-sub" style={{ marginBottom: 12 }}>
          Sin planificación ni asignación registrada — todavía no han hecho uso del sistema para turnos.
        </p>
        {sinMovimiento.length > 0 ? (
          <TablaMonitoreo filas={sinMovimiento} />
        ) : (
          <p style={{ color: 'var(--text-3)', fontSize: 12.5 }}>Todos los CAD tienen movimiento registrado hoy.</p>
        )}
      </div>
    </div>
  );
}

function TablaMonitoreo({ filas }) {
  return (
    <div className="tabla-sticky">
      <table>
        <thead>
          <tr>
            <th>CAD</th>
            <th className="col-ocultar-movil">Fijo</th>
            <th className="col-ocultar-movil">Turno</th>
            <th>Plan.</th><th>Asis.</th><th>%</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const porcentaje = Number(f.porcentaje);
            return (
              <tr key={f.sucursalId}>
                <td>{f.sucursal}</td>
                <td className="col-ocultar-movil">{f.fijo}</td>
                <td className="col-ocultar-movil">{f.turno}</td>
                <td>{f.plan}</td>
                <td>{f.asistencia}</td>
                <td>
                  <span className={`status-pill ${porcentaje === 0 ? 'warn' : porcentaje >= 100 ? 'ok' : 'pending'}`}>
                    {porcentaje}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
