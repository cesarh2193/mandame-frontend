import { useState } from 'react';
import Modal from '../../components/Modal';
import { useEmpresas, useEmpresasMutation, useSucursales, useSucursalesMutation, usePersonal } from '../../api/hooks';

export default function Empresas() {
  const { data: empresas } = useEmpresas();
  const empresaMut = useEmpresasMutation();
  const [empresaForm, setEmpresaForm] = useState({ codigo: '', nombre: '' });
  const [editando, setEditando] = useState(null); // { tipo: 'empresa'|'sucursal', data }

  const { data: sucursales } = useSucursales();
  const sucursalMut = useSucursalesMutation();
  const [busquedaSucursal, setBusquedaSucursal] = useState('');
  const [sucursalForm, setSucursalForm] = useState({ empresaId: '', codigoCad: '', nombre: '', supervisorId: '' });
  const { data: personal } = usePersonal();
  const empresasActivas = (empresas ?? []).filter((e) => e.estado === 'A');
  const supervisores = (personal ?? []).filter((p) => p.puesto === 'Supervisor' && p.estado === 'A');

  const sucursalesFiltradas = (sucursales ?? [])
    .filter((s) => {
      const q = busquedaSucursal.trim().toLowerCase();
      if (!q) return true;
      return (
        s.nombre?.toLowerCase().includes(q) ||
        s.empresaNombre?.toLowerCase().includes(q) ||
        String(s.codigoCad ?? '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const porEmpresa = a.empresaNombre.localeCompare(b.empresaNombre, 'es', { sensitivity: 'base' });
      if (porEmpresa !== 0) return porEmpresa;
      return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
    });

  function crearEmpresa(e) {
    e.preventDefault();
    empresaMut.crear.mutate(empresaForm, { onSuccess: () => setEmpresaForm({ codigo: '', nombre: '' }) });
  }

  function crearSucursal(e) {
    e.preventDefault();
    sucursalMut.crear.mutate(
      { ...sucursalForm, supervisorId: sucursalForm.supervisorId || null },
      { onSuccess: () => setSucursalForm({ empresaId: '', codigoCad: '', nombre: '', supervisorId: '' }) }
    );
  }

  function guardarEdicion() {
    if (editando.tipo === 'empresa') {
      empresaMut.actualizar.mutate({ id: editando.data.id, ...editando.data }, { onSuccess: () => setEditando(null) });
    } else {
      sucursalMut.actualizar.mutate({ id: editando.data.id, ...editando.data }, { onSuccess: () => setEditando(null) });
    }
  }

  return (
    <div>
      <h1 className="page-title">Empresas y sucursales</h1>

      <div className="card">
        <h2>Empresas</h2>
        <form className="form-grid" onSubmit={crearEmpresa}>
          <div className="field">
            <label>Código</label>
            <input value={empresaForm.codigo} onChange={(e) => setEmpresaForm({ ...empresaForm, codigo: e.target.value })} required />
          </div>
          <div className="field">
            <label>Nombre de empresa</label>
            <input value={empresaForm.nombre} onChange={(e) => setEmpresaForm({ ...empresaForm, nombre: e.target.value })} required />
          </div>
          <button className="btn btn-primary" style={{ alignSelf: 'end' }}>Insertar empresa</button>
        </form>

        <table style={{ marginTop: 14 }}>
          <thead><tr><th>Código</th><th>Empresa</th><th>Supervisor</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {empresas?.map((e) => (
              <tr key={e.id}>
                <td>{e.codigo}</td><td>{e.nombre}</td><td>{e.supervisor ?? '—'}</td>
                <td><span className="status-pill ok">{e.estado === 'A' ? 'Activa' : 'Inactiva'}</span></td>
                <td><button className="btn btn-ghost" onClick={() => setEditando({ tipo: 'empresa', data: { ...e } })}>Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Sucursales (CAD)</h2>
        <form className="form-grid" onSubmit={crearSucursal} style={{ marginBottom: 20 }}>
          <div className="field">
            <label>Empresa</label>
            <select
              value={sucursalForm.empresaId}
              onChange={(e) => setSucursalForm({ ...sucursalForm, empresaId: e.target.value })}
              required
            >
              <option value="">Selecciona...</option>
              {empresasActivas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Código CAD</label>
            <input
              value={sucursalForm.codigoCad}
              onChange={(e) => setSucursalForm({ ...sucursalForm, codigoCad: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Nombre de la sucursal</label>
            <input
              value={sucursalForm.nombre}
              onChange={(e) => setSucursalForm({ ...sucursalForm, nombre: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Supervisor (opcional)</label>
            <select
              value={sucursalForm.supervisorId}
              onChange={(e) => setSucursalForm({ ...sucursalForm, supervisorId: e.target.value })}
            >
              <option value="">Sin asignar</option>
              {supervisores.map((p) => <option key={p.id} value={p.id}>{p.nombres}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" style={{ alignSelf: 'end' }} disabled={sucursalMut.crear.isPending}>
            {sucursalMut.crear.isPending ? 'Insertando...' : 'Insertar CAD'}
          </button>
        </form>

        {sucursalMut.crear.isError && (
          <p style={{ color: 'var(--coral-dark)', background: 'var(--coral-light)', padding: '10px 12px', borderRadius: 8, fontSize: 12.5, marginBottom: 14 }}>
            No se pudo insertar: {sucursalMut.crear.error?.response?.data?.error || sucursalMut.crear.error?.message || 'error desconocido'}.
          </p>
        )}

        <div className="field" style={{ maxWidth: 360, marginBottom: 14 }}>
          <label>Buscar por nombre, CAD o empresa</label>
          <input
            value={busquedaSucursal}
            onChange={(e) => setBusquedaSucursal(e.target.value)}
            placeholder="Ej. Campero, 645, Barberena..."
          />
        </div>
        <table>
          <thead><tr><th>CAD</th><th>Sucursal</th><th>Empresa</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {sucursalesFiltradas.map((s) => (
              <tr key={s.id}>
                <td>{s.codigoCad}</td><td>{s.nombre}</td><td>{s.empresaNombre}</td>
                <td><span className="status-pill ok">{s.estado === 'A' ? 'Activa' : 'Inactiva'}</span></td>
                <td><button className="btn btn-ghost" onClick={() => setEditando({ tipo: 'sucursal', data: { ...s } })}>Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        titulo={editando?.tipo === 'empresa' ? 'Editar empresa' : 'Editar sucursal'}
        abierto={!!editando}
        onCerrar={() => setEditando(null)}
        onGuardar={guardarEdicion}
        guardando={empresaMut.actualizar.isPending || sucursalMut.actualizar.isPending}
      >
        {editando && (
          <div className="field">
            <label>Nombre</label>
            <input
              value={editando.data.nombre}
              onChange={(e) => setEditando({ ...editando, data: { ...editando.data, nombre: e.target.value } })}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
