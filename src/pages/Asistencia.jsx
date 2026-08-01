import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePendientesIngreso, useMarcarIngreso } from '../api/hooks';

export default function Asistencia() {
  const { usuario } = useAuth();
  const [sucursalId, setSucursalId] = useState(usuario?.sucursales?.[0]?.id ?? '');
  const [busqueda, setBusqueda] = useState('');

  const { data: pendientes } = usePendientesIngreso(sucursalId);
  const marcarIngreso = useMarcarIngreso();

  const filtrados = useMemo(
    () => (pendientes ?? []).filter((m) => m.nombre.toLowerCase().includes(busqueda.toLowerCase())),
    [pendientes, busqueda]
  );

  return (
    <div>
      <h1 className="page-title">Asistencia</h1>
      <p className="page-sub">Visible para Supervisor, Digitador y Administrador de la CAD seleccionada</p>

      <div className="card">
        {usuario?.sucursales?.length > 1 && (
          <div className="field" style={{ maxWidth: 320, marginBottom: 14 }}>
            <label>CAD (sucursal)</label>
            <select value={sucursalId} onChange={(e) => setSucursalId(e.target.value)}>
              {usuario.sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
        )}
        <div className="field" style={{ marginBottom: 14 }}>
          <label>Buscar motorista</label>
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre del motorista..." />
        </div>

        <table>
          <tbody>
            {filtrados.map((m) => (
              <tr key={m.asignacionId}>
                <td>{m.nombre} <small style={{ color: 'var(--text-3)' }}>({m.tipoMotorista})</small></td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="btn btn-amber"
                    disabled={marcarIngreso.isPending}
                    onClick={() => marcarIngreso.mutate(m.asignacionId)}
                  >
                    Marcar ingreso
                  </button>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr><td style={{ color: 'var(--text-3)' }}>No hay motoristas pendientes de ingreso con ese nombre.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
