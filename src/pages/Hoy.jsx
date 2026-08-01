import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useResumenHoy, useCuadreCads } from '../api/hooks';

const MAX_CADS_EN_GRAFICA = 10;

export default function Hoy() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rolActivo === 'Admin';
  // Vacío = todas las CADs a las que el usuario tiene acceso (el
  // backend agrega). Si solo tiene una sucursal, no hace falta elegir.
  const [sucursalId, setSucursalId] = useState('');

  const { data: resumen, isLoading } = useResumenHoy(sucursalId);
  const { data: cuadreCads } = useCuadreCads(); // el backend ya filtra: solo trae datos si el rol es Administrador

  if (isLoading) return <p>Cargando...</p>;

  // Con 30-40 CADs, meter todos en una sola gráfica la vuelve
  // ilegible y obliga a hacer scroll. Aquí se prioriza lo accionable:
  // solo CADs con planificación hoy, ordenados por menor cumplimiento
  // primero (los que más necesitan atención), topados a un tamaño
  // fijo que se ve completo sin scroll. El detalle completo de todos
  // los CAD ya vive en la pantalla de Monitoreo.
  const cuadreConPlan = (cuadreCads ?? [])
    .filter((c) => c.plan > 0)
    .map((c) => ({ ...c, porcentaje: c.plan > 0 ? Math.round((c.asistieron / c.plan) * 100) : 0 }))
    .sort((a, b) => a.porcentaje - b.porcentaje);
  const cuadreVisible = cuadreConPlan.slice(0, MAX_CADS_EN_GRAFICA);
  const hayMasCads = cuadreConPlan.length > cuadreVisible.length;

  // Cuántos motoristas siguen "en turno" (sin cerrar) por CAD — para
  // que el Administrador vea de un vistazo dónde falta cerrar, sin
  // tener que leer la lista completa fila por fila.
  const pendientesPorCad = Object.values(
    (resumen?.listaPendientes ?? []).reduce((acc, m) => {
      acc[m.sucursal] = acc[m.sucursal] || { sucursal: m.sucursal, pendientes: 0 };
      acc[m.sucursal].pendientes += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.pendientes - a.pendientes);
  const pendientesVisibles = pendientesPorCad.slice(0, MAX_CADS_EN_GRAFICA);

  return (
    <div>
      <h1 className="page-title">Hoy</h1>
      <p className="page-sub">{new Date().toLocaleDateString('es-GT')}</p>

      {usuario?.sucursales?.length > 1 && (
        <div className="field" style={{ maxWidth: 320, marginBottom: 14 }}>
          <label>CAD (sucursal)</label>
          <select value={sucursalId} onChange={(e) => setSucursalId(e.target.value)}>
            <option value="">Todas las CADs</option>
            {usuario.sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
      )}

      <div className="grid-kpi">
        <Kpi label="Motoristas planificados" value={resumen?.planificados ?? '—'} />
        <Kpi label="En turno" value={resumen?.enTurno ?? '—'} />
        <Kpi label="Pendientes de cierre" value={resumen?.pendientesCierre ?? '—'} nota="requiere acción" tono="warn" />
        <Kpi label="Cerrados" value={resumen?.cerrados ?? '—'} nota="listos para autorizar" tono="ok" />
      </div>

      {esAdmin && cuadreVisible.length > 0 && (
        <div className="card">
          <h2>Planificación vs. asistencia por CAD</h2>
          <p className="page-sub" style={{ marginBottom: 12 }}>
            Los {cuadreVisible.length} CAD con menor cumplimiento hoy (de {cuadreConPlan.length} con planificación)
          </p>
          <ResponsiveContainer width="100%" height={Math.max(220, cuadreVisible.length * 38)}>
            <BarChart data={cuadreVisible} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="sucursal" width={120} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v, k) => [v, k === 'plan' ? 'Planificados' : 'Asistieron']} />
              <Bar dataKey="plan" fill="var(--chip-bg, #EEF0F3)" barSize={14} radius={4} />
              <Bar dataKey="asistieron" fill="var(--teal, #12806B)" barSize={14} radius={4} />
            </BarChart>
          </ResponsiveContainer>
          {hayMasCads && (
            <p style={{ fontSize: 12.5, marginTop: 10 }}>
              <Link to="/monitoreo">Ver el cuadre completo de los {cuadreConPlan.length} CAD en Monitoreo →</Link>
            </p>
          )}
        </div>
      )}

      {esAdmin && pendientesVisibles.length > 0 && (
        <div className="card">
          <h2>Motoristas pendientes de cierre por CAD</h2>
          <p className="page-sub" style={{ marginBottom: 12 }}>
            Los {pendientesVisibles.length} CAD con más motoristas todavía en turno (de {pendientesPorCad.length} con pendientes)
          </p>
          <RankingPendientes filas={pendientesVisibles} />
        </div>
      )}

      {!esAdmin && (
        <div className="card">
          <h2>Pendientes de cierre de turno</h2>
          {resumen?.listaPendientes?.length ? (
            <table>
              <tbody>
                {resumen.listaPendientes.map((m) => (
                  <tr key={m.asignacionId}>
                    <td>{m.nombre} · {m.sucursal}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="status-pill pending">En turno</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: 'var(--text-3)', fontSize: 12.5 }}>No hay pendientes en este momento.</p>
          )}
        </div>
      )}
    </div>
  );
}

// Ranking con barras de progreso en CSS puro — a propósito NO es una
// gráfica de recharts, para que se distinga a simple vista de
// "Planificación vs. asistencia por CAD" de arriba en vez de parecer
// una variación del mismo gráfico.
function RankingPendientes({ filas }) {
  const max = Math.max(...filas.map((f) => f.pendientes), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {filas.map((f, i) => (
        <div key={f.sucursal} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 18, fontSize: 12, color: 'var(--text-3)', textAlign: 'right' }}>{i + 1}</span>
          <span style={{ width: 130, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{f.sucursal}</span>
          <div style={{ flex: 1, background: 'var(--chip-bg, #EEF0F3)', borderRadius: 20, overflow: 'hidden', height: 20 }}>
            <div
              style={{
                width: `${(f.pendientes / max) * 100}%`,
                height: '100%',
                background: 'var(--amber, #E0862B)',
                borderRadius: 20,
                transition: 'width .3s'
              }}
            />
          </div>
          <span className="status-pill pending" style={{ minWidth: 28, textAlign: 'center' }}>{f.pendientes}</span>
        </div>
      ))}
    </div>
  );
}

function Kpi({ label, value, nota, tono }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {nota && <div className={`status-pill ${tono}`} style={{ marginTop: 4, display: 'inline-block' }}>{nota}</div>}
    </div>
  );
}
