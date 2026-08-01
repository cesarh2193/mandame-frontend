import { useState } from 'react';
import Modal from '../../components/Modal';
import { usePersonal, usePersonalMutation, useEmpresas, useSucursales } from '../../api/hooks';
import { useToast } from '../../context/ToastContext';
import { IconoOjo, IconoLapiz, IconoBasura } from '../../components/Iconos';

const PUESTOS = ['Motorista', 'Supervisor', 'Gerente', 'Digitador', 'Administrador'];
const POR_PAGINA = 20;
const FORM_VACIO = {
  codigo: '', nombres: '', apellidos: '', dpi: '', puesto: 'Motorista', empresaId: '', sucursalId: '',
  tambienMotorista: true, tipoMotorista: 'FIJO', placa: '', licencia: ''
};

export default function Personal() {
  const { data: personal } = usePersonal();
  const mut = usePersonalMutation();
  const { data: empresas } = useEmpresas('A');
  const mostrarToast = useToast();

  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const { data: sucursales } = useSucursales(form.empresaId, 'A');
  const [editando, setEditando] = useState(null);
  const { data: sucursalesEditar } = useSucursales(editando?.empresaId, 'A');
  const [viendo, setViendo] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [mostrarBajas, setMostrarBajas] = useState(false);
  const [pagina, setPagina] = useState(1);
  const personalFiltrado = (personal ?? []).filter((p) => {
    // "Mostrar dados de baja" es exclusivo: si está marcado, solo
    // inactivos; si no, solo activos (nunca mezclados).
    if (mostrarBajas ? p.estado !== 'I' : p.estado === 'I') return false;
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return (
      p.nombres?.toLowerCase().includes(q) ||
      String(p.codigo ?? '').toLowerCase().includes(q) ||
      p.puesto?.toLowerCase().includes(q) ||
      p.sucursalNombre?.toLowerCase().includes(q)
    );
  });

  const totalPaginas = Math.max(1, Math.ceil(personalFiltrado.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const personalPagina = personalFiltrado.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  function onBuscar(valor) {
    setBusqueda(valor);
    setPagina(1);
  }

  function onMostrarBajas(valor) {
    setMostrarBajas(valor);
    setPagina(1);
  }

  function onPuestoChange(puesto) {
    setForm((f) => ({ ...f, puesto, tambienMotorista: puesto === 'Motorista' ? true : f.tambienMotorista }));
  }

  function cerrarCreacion() {
    setCreando(false);
    setForm(FORM_VACIO);
  }

  function crear() {
    mut.crear.mutate(form, {
      onSuccess: () => {
        cerrarCreacion();
        mostrarToast('Personal insertado correctamente.');
      }
    });
  }

  function guardarEdicion() {
    mut.actualizar.mutate(
      { id: editando.id, ...editando },
      { onSuccess: () => { setEditando(null); mostrarToast('Cambios guardados correctamente.'); } }
    );
  }

  function datosFormulario(p) {
    return {
      id: p.id,
      nombres: p.nombrePila,
      apellidos: p.apellidoPila,
      dpi: p.dpi,
      puesto: p.puesto,
      empresaId: p.empresaId,
      sucursalId: p.sucursalId,
      tambienMotorista: !!p.tambienMotorista,
      tipoMotorista: p.tipoMotorista || 'FIJO',
      placa: p.placa || '',
      licencia: p.licencia || '',
      estado: p.estado || 'A'
    };
  }

  function onDarBaja(p) {
    const confirmado = window.confirm(`¿Dar de baja a ${p.nombres}? No podrá ser asignado ni marcar asistencia después de esto.`);
    if (!confirmado) return;
    mut.darDeBaja.mutate(p.id, {
      onSuccess: () => mostrarToast(`${p.nombres} fue dado de baja.`),
      onError: (err) => mostrarToast(err?.response?.data?.error || 'No se pudo dar de baja.', 'error')
    });
  }

  return (
    <div>
      <h1 className="page-title">Personal</h1>

      <div className="card">
        <h2>Listado</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap', marginBottom: 14 }}>
          <div className="field" style={{ maxWidth: 360, marginBottom: 0 }}>
            <label>Buscar por código, nombre, puesto o sucursal</label>
            <input value={busqueda} onChange={(e) => onBuscar(e.target.value)} placeholder="Ej. Abner, 3029, Digitador, Toledo..." />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={mostrarBajas} onChange={(e) => onMostrarBajas(e.target.checked)} />
              Mostrar dados de baja
            </label>
            <button type="button" className="btn btn-primary" onClick={() => setCreando(true)}>
              + Nuevo personal
            </button>
          </div>
        </div>
        <table>
          <thead><tr><th>Código</th><th>Nombre</th><th>Puesto</th><th>Sucursal</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {personalPagina.map((p) => (
              <tr key={p.id}>
                <td>{p.codigo}</td><td>{p.nombres}</td><td>{p.puesto}</td><td>{p.sucursalNombre}</td>
                <td>
                  <span className={`status-pill ${p.estado === 'I' ? 'warn' : 'ok'}`}>
                    {p.estado === 'I' ? 'Dado de baja' : 'Activo'}
                  </span>
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="btn btn-ghost icon-btn"
                      title="Ver información"
                      onClick={() => setViendo(p)}
                    >
                      <IconoOjo />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost icon-btn"
                      title="Editar"
                      onClick={() => setEditando(datosFormulario(p))}
                    >
                      <IconoLapiz />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost icon-btn"
                      title="Dar de baja"
                      disabled={p.estado === 'I' || mut.darDeBaja.isPending}
                      onClick={() => onDarBaja(p)}
                    >
                      <IconoBasura />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
            {personalFiltrado.length} registro(s) · página {paginaActual} de {totalPaginas}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={paginaActual <= 1}
              onClick={() => setPagina(paginaActual - 1)}
            >
              Anterior
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={paginaActual >= totalPaginas}
              onClick={() => setPagina(paginaActual + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <Modal titulo="Nuevo personal" abierto={creando} onCerrar={cerrarCreacion} onGuardar={crear} guardando={mut.crear.isPending} ancho={720}>
        <div className="form-grid-3">
          <div className="field">
            <label>Código (correlativo de la empresa)</label>
            <input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} required />
          </div>
          <div className="field">
            <label>Nombres</label>
            <input value={form.nombres} onChange={(e) => setForm({ ...form, nombres: e.target.value })} required />
          </div>
          <div className="field">
            <label>Apellidos</label>
            <input value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} required />
          </div>
        </div>
        <div className="form-grid-3">
          <div className="field">
            <label>DPI</label>
            <input value={form.dpi} onChange={(e) => setForm({ ...form, dpi: e.target.value })} required />
          </div>
          <div className="field">
            <label>Puesto</label>
            <select value={form.puesto} onChange={(e) => onPuestoChange(e.target.value)}>
              {PUESTOS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="field" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 9 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.tambienMotorista}
                disabled={form.puesto === 'Motorista'}
                onChange={(e) => setForm({ ...form, tambienMotorista: e.target.checked })}
              />
              También es motorista
            </label>
          </div>
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Empresa</label>
            <select value={form.empresaId} onChange={(e) => setForm({ ...form, empresaId: e.target.value, sucursalId: '' })} required>
              <option value="">Selecciona...</option>
              {empresas?.map((emp) => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Sucursal base (CAD)</label>
            <select value={form.sucursalId} onChange={(e) => setForm({ ...form, sucursalId: e.target.value })} required disabled={!form.empresaId}>
              <option value="">Selecciona...</option>
              {sucursales?.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
        </div>

        {form.tambienMotorista && (
          <div className="form-grid-3">
            <div className="field">
              <label>Tipo de motorista</label>
              <select value={form.tipoMotorista} onChange={(e) => setForm({ ...form, tipoMotorista: e.target.value })}>
                <option value="FIJO">Fijo</option>
                <option value="TURNO">Turno (sáb-dom)</option>
              </select>
            </div>
            <div className="field">
              <label>Placa asignada</label>
              <input value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value })} />
            </div>
            <div className="field">
              <label>Licencia de conducir</label>
              <input value={form.licencia} onChange={(e) => setForm({ ...form, licencia: e.target.value })} />
            </div>
          </div>
        )}

        {mut.crear.isError && (
          <p style={{ color: 'var(--coral-dark)', background: 'var(--coral-light)', padding: '10px 12px', borderRadius: 8, fontSize: 12.5, marginTop: 4 }}>
            No se pudo insertar: {mut.crear.error?.response?.data?.error || mut.crear.error?.message || 'error desconocido'}.
          </p>
        )}
      </Modal>

      <Modal titulo="Información del personal" abierto={!!viendo} onCerrar={() => setViendo(null)} ancho={720} soloLectura>
        {viendo && (
          <>
            <div className="form-grid-3">
              <Campo label="Código" valor={viendo.codigo} />
              <Campo label="Nombre completo" valor={viendo.nombres} />
              <Campo label="DPI" valor={viendo.dpi} />
            </div>
            <div className="form-grid-3">
              <Campo label="Puesto" valor={viendo.puesto} />
              <Campo label="Sucursal (CAD)" valor={viendo.sucursalNombre} />
              <Campo label="Estado" valor={viendo.estado === 'I' ? 'Dado de baja' : 'Activo'} />
            </div>
            {viendo.tambienMotorista && (
              <div className="form-grid-3">
                <Campo label="Tipo de motorista" valor={viendo.tipoMotorista === 'TURNO' ? 'Turno (sáb-dom)' : 'Fijo'} />
                <Campo label="Placa asignada" valor={viendo.placa || '—'} />
                <Campo label="Licencia de conducir" valor={viendo.licencia || '—'} />
              </div>
            )}
          </>
        )}
      </Modal>

      <Modal
        titulo="Editar personal"
        abierto={!!editando}
        onCerrar={() => setEditando(null)}
        onGuardar={guardarEdicion}
        guardando={mut.actualizar.isPending}
        ancho={720}
      >
        {editando && (
          <>
            <div className="form-grid-3">
              <div className="field">
                <label>Nombres</label>
                <input value={editando.nombres} onChange={(e) => setEditando({ ...editando, nombres: e.target.value })} />
              </div>
              <div className="field">
                <label>Apellidos</label>
                <input value={editando.apellidos} onChange={(e) => setEditando({ ...editando, apellidos: e.target.value })} />
              </div>
              <div className="field">
                <label>Estado</label>
                <select value={editando.estado} onChange={(e) => setEditando({ ...editando, estado: e.target.value })}>
                  <option value="A">Activo</option>
                  <option value="I">Dado de baja</option>
                </select>
              </div>
            </div>
            <div className="form-grid-3">
              <div className="field">
                <label>DPI</label>
                <input value={editando.dpi} onChange={(e) => setEditando({ ...editando, dpi: e.target.value })} />
              </div>
              <div className="field">
                <label>Puesto</label>
                <select
                  value={editando.puesto}
                  onChange={(e) => setEditando({
                    ...editando, puesto: e.target.value,
                    tambienMotorista: e.target.value === 'Motorista' ? true : editando.tambienMotorista
                  })}
                >
                  {PUESTOS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="field" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 9 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editando.tambienMotorista}
                    disabled={editando.puesto === 'Motorista'}
                    onChange={(e) => setEditando({ ...editando, tambienMotorista: e.target.checked })}
                  />
                  También es motorista
                </label>
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Empresa</label>
                <select
                  value={editando.empresaId}
                  onChange={(e) => setEditando({ ...editando, empresaId: e.target.value, sucursalId: '' })}
                >
                  <option value="">Selecciona...</option>
                  {empresas?.map((emp) => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Sucursal base (CAD)</label>
                <select
                  value={editando.sucursalId}
                  onChange={(e) => setEditando({ ...editando, sucursalId: e.target.value })}
                  disabled={!editando.empresaId}
                >
                  <option value="">Selecciona...</option>
                  {sucursalesEditar?.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
            </div>
            {editando.tambienMotorista && (
              <div className="form-grid-3">
                <div className="field">
                  <label>Tipo de motorista</label>
                  <select value={editando.tipoMotorista} onChange={(e) => setEditando({ ...editando, tipoMotorista: e.target.value })}>
                    <option value="FIJO">Fijo</option>
                    <option value="TURNO">Turno (sáb-dom)</option>
                  </select>
                </div>
                <div className="field">
                  <label>Placa asignada</label>
                  <input value={editando.placa} onChange={(e) => setEditando({ ...editando, placa: e.target.value })} />
                </div>
                <div className="field">
                  <label>Licencia de conducir</label>
                  <input value={editando.licencia} onChange={(e) => setEditando({ ...editando, licencia: e.target.value })} />
                </div>
              </div>
            )}
            {mut.actualizar.isError && (
              <p style={{ color: 'var(--coral-dark)', background: 'var(--coral-light)', padding: '10px 12px', borderRadius: 8, fontSize: 12.5 }}>
                No se pudo guardar: {mut.actualizar.error?.response?.data?.error || mut.actualizar.error?.message || 'error desconocido'}.
              </p>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}

function Campo({ label, valor }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input value={valor ?? '—'} disabled />
    </div>
  );
}

