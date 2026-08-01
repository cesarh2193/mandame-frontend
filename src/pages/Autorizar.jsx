import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRepartosPendientes, useRepartosAutorizados, useAutorizarRepartos } from '../api/hooks';
import { hoyLocal } from '../utils/fecha';

export default function Autorizar() {
  const { usuario } = useAuth();
  const sucursalId = usuario?.sucursales?.[0]?.id;
  const hoy = hoyLocal();
  const [tab, setTab] = useState('pendientes');
  const [seleccionados, setSeleccionados] = useState([]);

  const { data: pendientes } = useRepartosPendientes(sucursalId);
  const { data: autorizados } = useRepartosAutorizados(sucursalId, hoy);
  const autorizar = useAutorizarRepartos();

  function toggle(id) {
    setSeleccionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function autorizarSeleccionados() {
    if (seleccionados.length === 0) return;
    autorizar.mutate(seleccionados, { onSuccess: () => setSeleccionados([]) });
  }

  function autorizarTodos() {
    const ids = (pendientes ?? []).filter((p) => p.cerrado).map((p) => p.repartoId);
    if (ids.length === 0) return;
    autorizar.mutate(ids, { onSuccess: () => setSeleccionados([]) });
  }

  return (
    <div>
      <h1 className="page-title">Autorizar</h1>
      <p className="page-sub">
        {usuario?.rolActivo === 'Admin'
          ? 'Vista de administrador: puede autorizar cualquier sucursal'
          : 'Visible para el supervisor de las sucursales asignadas'}
      </p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <button className={`btn ${tab === 'pendientes' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('pendientes')}>
          Pendientes de hoy
        </button>
        <button className={`btn ${tab === 'autorizados' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('autorizados')}>
          Autorizados (consulta)
        </button>
      </div>

      {tab === 'pendientes' ? (
        <div className="card">
          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
            Solo se puede autorizar el cierre del día actual. Al autorizar se envía automático un correo
            de resumen a los usuarios con rol Gerente que tengan acceso a esta sucursal.
          </p>
          <table>
            <thead><tr><th></th><th>Motorista</th><th>Entregas</th><th>Estado</th></tr></thead>
            <tbody>
              {pendientes?.map((p) => (
                <tr key={p.repartoId}>
                  <td>
                    <input
                      type="checkbox"
                      disabled={!p.cerrado}
                      checked={seleccionados.includes(p.repartoId)}
                      onChange={() => toggle(p.repartoId)}
                    />
                  </td>
                  <td>{p.nombre}</td>
                  <td>{p.entregas ?? '—'}</td>
                  <td>
                    <span className={`status-pill ${p.cerrado ? 'ok' : 'pending'}`}>
                      {p.cerrado ? 'Cerrado' : 'En turno'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{seleccionados.length} seleccionados</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={autorizarTodos} disabled={autorizar.isPending}>Autorizar todos</button>
              <button className="btn btn-amber" onClick={autorizarSeleccionados} disabled={autorizar.isPending || seleccionados.length === 0}>
                Autorizar seleccionados
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
            Modo consulta: ya no se puede modificar ni volver a marcar.
          </p>
          <table>
            <thead><tr><th>Motorista</th><th>Entregas</th><th>Autorizado por</th><th>Hora</th></tr></thead>
            <tbody>
              {autorizados?.map((a) => (
                <tr key={a.repartoId}>
                  <td>{a.nombre}</td>
                  <td>{a.entregas}</td>
                  <td>{a.autorizadoPor}</td>
                  <td>{a.hora}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
