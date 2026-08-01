import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  useMotoristasDisponibles, useAsignacionesActivas, useAsignarLote, useAnularAsignacion, useBuscarOtroCad
} from '../api/hooks';
import { hoyLocal } from '../utils/fecha';

export default function Asignaciones() {
  const { usuario } = useAuth();
  const mostrarToast = useToast();
  const hoy = hoyLocal();
  const [sucursalId, setSucursalId] = useState(usuario?.sucursales?.[0]?.id ?? '');
  const [fecha, setFecha] = useState(hoy);
  const [tipo, setTipo] = useState('TITULAR');
  const [seleccionados, setSeleccionados] = useState([]);
  const [busquedaActivas, setBusquedaActivas] = useState('');
  const [busquedaOtroCad, setBusquedaOtroCad] = useState('');

  // Los checkboxes marcados son solo para el CAD/fecha que se está
  // viendo: si se cambian, la selección anterior ya no aplica y no
  // debe arrastrarse (si no, "Seleccionar todos" termina asignando
  // motoristas de un CAD distinto al que se está viendo).
  useEffect(() => {
    setSeleccionados([]);
    setBusquedaOtroCad('');
  }, [sucursalId, fecha]);

  const { data: respuestaDisponibles } = useMotoristasDisponibles(sucursalId, fecha);
  const sinPlanificacion = !!respuestaDisponibles?.sinPlanificacion;
  const disponibles = respuestaDisponibles?.motoristas;
  const { data: activas } = useAsignacionesActivas(sucursalId);
  const { data: resultadosOtroCad } = useBuscarOtroCad(sucursalId, fecha, busquedaOtroCad);
  const asignarLote = useAsignarLote();
  const anular = useAnularAsignacion();

  function toggleSeleccion(id) {
    setSeleccionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const idsDisponibles = (disponibles ?? []).filter((m) => m.disponible).map((m) => m.motoristaId);
  const todosSeleccionados = idsDisponibles.length > 0 && idsDisponibles.every((id) => seleccionados.includes(id));

  function toggleSeleccionarTodos() {
    setSeleccionados((prev) =>
      todosSeleccionados
        ? prev.filter((id) => !idsDisponibles.includes(id))
        : Array.from(new Set([...prev, ...idsDisponibles]))
    );
  }

  function onAsignar() {
    if (seleccionados.length === 0) return;
    asignarLote.mutate(
      { sucursalId: Number(sucursalId), fechaInicio: fecha, fechaFin: fecha, tipo, motoristaIds: seleccionados },
      {
        onSuccess: (data) => {
          setSeleccionados([]);
          mostrarToast(`Se asignó a ${data.asignados} motorista(s) y se marcó su ingreso de asistencia de una vez.`);
        }
      }
    );
  }

  function onAnular(a) {
    if (a.marcoIngreso) {
      const confirmado = window.confirm(
        `${a.nombre} ya marcó ingreso de asistencia hoy. Si anulas esta asignación, también se anulará esa asistencia. ¿Deseas continuar?`
      );
      if (!confirmado) return;
    }
    anular.mutate(a.asignacionId);
  }

  const activasFiltradas = (activas ?? []).filter((a) => {
    const q = busquedaActivas.trim().toLowerCase();
    if (!q) return true;
    return a.nombre?.toLowerCase().includes(q) || String(a.codigo ?? '').toLowerCase().includes(q);
  });

  return (
    <div>
      <h1 className="page-title">Asignaciones de motoristas</h1>
      <p className="page-sub">Selecciona el CAD y la fecha, y asigna a todos los motoristas que necesites de una sola vez</p>

      <div className="card">
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div className="field">
            <label>CAD (sucursal)</label>
            <select value={sucursalId} onChange={(e) => setSucursalId(e.target.value)}>
              {usuario?.sucursales?.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="field">
            <label>Tipo de asignación</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="TITULAR">Titular</option>
              <option value="APOYO">Apoyo (cubre 2da sucursal)</option>
            </select>
          </div>
        </div>

        {sinPlanificacion ? (
          <p style={{ color: 'var(--coral-dark)', background: 'var(--coral-light)', padding: '10px 12px', borderRadius: 8, fontSize: 12.5 }}>
            Este CAD todavía no tiene planificación registrada para el {fecha}. Regístrala primero en{' '}
            <Link to="/planificacion" style={{ color: 'inherit', fontWeight: 700 }}>Planificación</Link> para poder asignar motoristas.
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={toggleSeleccionarTodos}
                disabled={idsDisponibles.length === 0}
              >
                {todosSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
            </div>
            <table>
              <thead>
                <tr><th></th><th>Motorista</th><th>Tipo</th><th>Disponibilidad</th></tr>
              </thead>
              <tbody>
                {disponibles?.map((m) => (
                  <tr key={m.motoristaId}>
                    <td>
                      <input
                        type="checkbox"
                        disabled={!m.disponible}
                        checked={seleccionados.includes(m.motoristaId)}
                        onChange={() => toggleSeleccion(m.motoristaId)}
                      />
                    </td>
                    <td>{m.nombre}</td>
                    <td>{m.tipoMotorista}</td>
                    <td>
                      <span className={`status-pill ${m.disponible ? 'ok' : 'pending'}`}>
                        {m.disponible ? 'Disponible' : 'Ya asignado hoy'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{seleccionados.length} seleccionados</span>
              <button className="btn btn-primary" onClick={onAsignar} disabled={asignarLote.isPending || seleccionados.length === 0}>
                Asignar seleccionados a esta CAD
              </button>
            </div>
            {asignarLote.isError && (
              <p style={{ color: 'var(--coral-dark)', background: 'var(--coral-light)', padding: '10px 12px', borderRadius: 8, fontSize: 12.5, marginTop: 10 }}>
                {asignarLote.error?.response?.data?.error || 'No se pudo asignar.'}
              </p>
            )}
          </>
        )}
      </div>

      {!sinPlanificacion && (
        <div className="card">
          <h2>Cubrir con motorista de otro CAD (emergencia)</h2>
          <p className="page-sub" style={{ marginBottom: 12 }}>
            Busca por nombre. Solo se puede agregar a los que estén activos y no tengan un turno abierto en otro CAD
            (si ya cerraron turno en su CAD de origen, sí se pueden agregar).
          </p>
          <div className="field" style={{ maxWidth: 360, marginBottom: 14 }}>
            <label>Buscar motorista</label>
            <input
              value={busquedaOtroCad}
              onChange={(e) => setBusquedaOtroCad(e.target.value)}
              placeholder="Escribe al menos 2 letras del nombre..."
            />
          </div>
          {busquedaOtroCad.trim().length >= 2 && (
            resultadosOtroCad?.length ? (
              <table>
                <thead>
                  <tr><th></th><th>Motorista</th><th>CAD de origen</th><th>Disponibilidad</th></tr>
                </thead>
                <tbody>
                  {resultadosOtroCad.map((m) => (
                    <tr key={m.motoristaId}>
                      <td>
                        <input
                          type="checkbox"
                          disabled={!m.disponible}
                          checked={seleccionados.includes(m.motoristaId)}
                          onChange={() => toggleSeleccion(m.motoristaId)}
                        />
                      </td>
                      <td>{m.nombre}</td>
                      <td>{m.sucursalBase}</td>
                      <td>
                        <span className={`status-pill ${m.disponible ? 'ok' : 'warn'}`}>
                          {m.disponible ? 'Disponible' : `Ya tiene ingreso en ${m.cadConIngresoAbierto}`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: 'var(--text-3)', fontSize: 12.5 }}>Sin resultados para esa búsqueda.</p>
            )
          )}
        </div>
      )}

      <div className="card">
        <h2>Asignaciones activas hoy</h2>
        <div className="field" style={{ maxWidth: 360, marginBottom: 14 }}>
          <label>Buscar por nombre o código</label>
          <input
            value={busquedaActivas}
            onChange={(e) => setBusquedaActivas(e.target.value)}
            placeholder="Ej. Alexander o 3029..."
          />
        </div>
        <table>
          <thead>
            <tr><th>Motorista</th><th>Tipo</th><th>Estado</th><th>Acción</th></tr>
          </thead>
          <tbody>
            {activasFiltradas.map((a) => (
              <tr key={a.asignacionId}>
                <td>{a.nombre}</td>
                <td>{a.tipoAsignacion}</td>
                <td>{a.marcoIngreso ? `Ingresó ${a.horaIngreso}` : 'Sin ingreso'}</td>
                <td>
                  <button
                    className="btn btn-ghost"
                    disabled={anular.isPending || a.cerroTurno}
                    title={a.cerroTurno ? 'Ya cerró turno hoy: no se puede anular.' : undefined}
                    onClick={() => onAnular(a)}
                  >
                    Anular
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
