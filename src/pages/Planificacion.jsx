import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { IconoLapiz, IconoBasura } from '../components/Iconos';
import { usePlanificacion, useGuardarPlanificacion, useEditarPlanificacion, useAnularPlanificacion } from '../api/hooks';
import { hoyLocal } from '../utils/fecha';

export default function Planificacion() {
  const { usuario } = useAuth();
  const mostrarToast = useToast();
  const hoy = hoyLocal();
  const [fecha, setFecha] = useState(hoy);
  const [sucursalId, setSucursalId] = useState(usuario?.sucursales?.[0]?.id ?? '');
  const [total, setTotal] = useState(1);
  const [editando, setEditando] = useState(null);

  const { data: planificaciones } = usePlanificacion(fecha);
  const guardar = useGuardarPlanificacion();
  const editar = useEditarPlanificacion();
  const anular = useAnularPlanificacion();

  const planExistente = useMemo(
    () => planificaciones?.find((p) => String(p.sucursalId) === String(sucursalId)),
    [planificaciones, sucursalId]
  );

  function onSubmit(e) {
    e.preventDefault();
    if (planExistente) return;
    if (!(Number(total) > 0)) {
      mostrarToast('El total de motoristas debe ser mayor a cero.', 'error');
      return;
    }
    guardar.mutate(
      { sucursalId: Number(sucursalId), fecha, total: Number(total) },
      { onError: (err) => mostrarToast(err?.response?.data?.error || 'No se pudo guardar la planificación.', 'error') }
    );
  }

  function guardarEdicion() {
    if (!(Number(editando.total) > 0)) {
      mostrarToast('El total de motoristas debe ser mayor a cero.', 'error');
      return;
    }
    editar.mutate(
      { sucursalId: editando.sucursalId, fecha, total: Number(editando.total) },
      {
        onSuccess: () => { setEditando(null); mostrarToast('Planificación actualizada.'); },
        onError: (err) => mostrarToast(err?.response?.data?.error || 'No se pudo actualizar la planificación.', 'error')
      }
    );
  }

  function anularPlan(p) {
    if (!window.confirm(`¿Anular la planificación de ${p.sucursalNombre} para esta fecha?`)) return;
    anular.mutate(
      { sucursalId: p.sucursalId, fecha },
      {
        onSuccess: () => mostrarToast('Planificación anulada.'),
        onError: (err) => mostrarToast(err?.response?.data?.error || 'No se pudo anular la planificación.', 'error')
      }
    );
  }

  return (
    <div>
      <h1 className="page-title">Planificación</h1>
      <p className="page-sub">Define el total de motoristas que necesita cada sucursal</p>

      <form className="card" onSubmit={onSubmit}>
        <div className="form-grid">
          <div className="field">
            <label>Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </div>
          <div className="field">
            <label>Sucursal</label>
            <select value={sucursalId} onChange={(e) => setSucursalId(e.target.value)} required>
              {usuario?.sucursales?.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Total de motoristas a planificar</label>
            <input
              type="number"
              min="1"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              disabled={!!planExistente}
              required
            />
          </div>
        </div>

        {planExistente ? (
          <p style={{ color: 'var(--amber-dark)', background: 'var(--amber-light)', padding: '10px 12px', borderRadius: 8, fontSize: 12.5, marginBottom: 12 }}>
            Ya existe una planificación para esta sucursal y fecha ({planExistente.total} motoristas, registrada por {planExistente.registradoPor || '—'}).
            Para cambiarla, editala desde la tabla de abajo.
          </p>
        ) : (
          <button className="btn btn-primary" disabled={guardar.isPending}>
            {guardar.isPending ? 'Guardando...' : 'Guardar planificación'}
          </button>
        )}
      </form>

      <div className="card">
        <h2>Planificación de hoy</h2>
        <table>
          <thead>
            <tr><th>Sucursal</th><th>Total planificado</th><th>Registrado por</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {planificaciones?.map((p) => (
              <tr key={p.sucursalId}>
                <td>{p.sucursalNombre}</td>
                <td>{p.total}</td>
                <td>{p.registradoPor}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="btn btn-ghost icon-btn"
                      title="Editar"
                      onClick={() => setEditando({ ...p, total: p.total })}
                    >
                      <IconoLapiz />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost icon-btn"
                      title={p.tieneAsistencia ? 'No se puede anular: ya hay motoristas con asistencia registrada.' : 'Anular'}
                      onClick={() => anularPlan(p)}
                      disabled={p.tieneAsistencia || anular.isPending}
                    >
                      <IconoBasura />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        titulo="Editar planificación"
        abierto={!!editando}
        onCerrar={() => setEditando(null)}
        onGuardar={guardarEdicion}
        guardando={editar.isPending}
      >
        {editando && (
          <>
            <div className="field">
              <label>Sucursal</label>
              <input value={editando.sucursalNombre} disabled />
            </div>
            <div className="field">
              <label>Total de motoristas a planificar</label>
              <input
                type="number"
                min="1"
                value={editando.total}
                onChange={(e) => setEditando({ ...editando, total: e.target.value })}
                required
              />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
