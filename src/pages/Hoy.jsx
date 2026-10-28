import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useResumenHoy, useCuadreCads, useRepartosHoy, useDocumentosCad } from '../api/hooks';

const MAX_CADS_EN_GRAFICA = 10;
const MAX_MOTORISTAS_EN_GRAFICA = 20;

export default function Hoy() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rolActivo === 'Admin';
  // Vacío = todas las CADs a las que el usuario tiene acceso (el
  // backend agrega). Si solo tiene una sucursal, no hace falta elegir.
  const [sucursalId, setSucursalId] = useState('');

  const { data: resumen, isLoading } = useResumenHoy(sucursalId);
  const { data: cuadreCads } = useCuadreCads(); // el backend ya filtra: solo trae datos si el rol es Administrador
  const { data: repartosHoy } = useRepartosHoy(sucursalId); // gráfica del no-Administrador
  const { data: documentosCad } = useDocumentosCad(sucursalId); // % de expediente completo, por CAD

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

  // Repartos por motorista en el cierre de hoy — gráfica que ve un
  // no-Administrador, ya viene ordenada desc. por el backend.
  const repartosVisibles = (repartosHoy ?? []).slice(0, MAX_MOTORISTAS_EN_GRAFICA);
  const hayMasMotoristas = (repartosHoy ?? []).length > repartosVisibles.length;

  // Documentos de expediente por CAD — mejor avance primero, para que
  // se note que sí hay progreso real en algunos CAD en vez de abrir
  // con una fila de puros 0%. Se complementa con un resumen de 3
  // números (en 0%, en progreso, promedio general) para que se
  // entienda el panorama completo de un vistazo, sin tener que leer
  // los 35 CAD uno por uno.
  const documentosOrdenados = [...(documentosCad ?? [])].sort((a, b) => b.porcentaje - a.porcentaje);
  const cadEnCero = documentosOrdenados.filter((f) => f.porcentaje === 0).length;
  const cadEnProgreso = documentosOrdenados.filter((f) => f.porcentaje > 0 && f.porcentaje < 100).length;
  const cadCompletos = documentosOrdenados.filter((f) => f.porcentaje === 100).length;
  const promedioDocumentos = documentosOrdenados.length
    ? Math.round(documentosOrdenados.reduce((suma, f) => suma + f.porcentaje, 0) / documentosOrdenados.length)
    : 0;

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

      {!esAdmin && repartosVisibles.length > 0 && (
        <div className="card">
          <h2>Repartos por motorista en el cierre de hoy</h2>
          <p className="page-sub" style={{ marginBottom: 12 }}>
            Cantidad de entregas registrada al cerrar turno hoy{hayMasMotoristas ? ` (top ${repartosVisibles.length} de ${repartosHoy.length})` : ''}
          </p>
          <ResponsiveContainer width="100%" height={Math.max(220, repartosVisibles.length * 32)}>
            <BarChart data={repartosVisibles} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="nombre" width={160} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [v, 'Repartos']} labelFormatter={(nombre, payload) => `${nombre} · ${payload?.[0]?.payload?.sucursal ?? ''}`} />
              <Bar dataKey="repartos" fill="var(--teal, #12806B)" barSize={14} radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {documentosOrdenados.length > 0 && (
        <div className="card">
          <h2>Documentos del expediente por CAD</h2>
          <p className="page-sub" style={{ marginBottom: 14 }}>
            Qué tanto ha subido cada CAD de los documentos que se le piden a sus motoristas
          </p>
          <div className="grid-kpi" style={{ marginBottom: 18 }}>
            <Kpi label="Sin ningún documento" value={cadEnCero} nota={cadEnCero > 0 ? 'requiere atención' : undefined} tono="warn" />
            <Kpi label="En progreso" value={cadEnProgreso} />
            <Kpi label="Completos" value={cadCompletos} nota={cadCompletos > 0 ? 'listos' : undefined} tono="ok" />
            <Kpi label="Promedio general" value={`${promedioDocumentos}%`} />
          </div>
          <TablaDocumentosCad filas={documentosOrdenados} />
          <p style={{ fontSize: 12.5, marginTop: 12 }}>
            <Link to="/informes/documentos-motoristas">Ver el detalle completo por motorista →</Link>
          </p>
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

function colorPorcentaje(porcentaje) {
  if (porcentaje === 100) return 'var(--teal-dark, #0B5C4C)';
  if (porcentaje >= 50) return 'var(--amber-dark, #8F5710)';
  return 'var(--coral-dark, #9E2A2A)';
}

// A diferencia de RankingPendientes, acá el número importa más que la
// barra: con muchos CAD en 0% o cerca, una barra casi invisible no
// comunica nada. Es una grilla compacta de dos columnas (nombre + %),
// ya viene ordenada de mejor a peor avance por quien la llama.
function TablaDocumentosCad({ filas }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '4px 20px' }}>
      {filas.map((f) => (
        <div
          key={f.id}
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
            padding: '7px 0', borderBottom: '1px solid var(--line, #E3E5EA)'
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {f.sucursal}
          </span>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: colorPorcentaje(f.porcentaje), flexShrink: 0 }}>
            {f.porcentaje}%
          </span>
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
