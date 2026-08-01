import { useState } from 'react';
import Modal from '../../components/Modal';
import { useUsuarios, useUsuariosSinCuenta, useUsuariosMutation, useSucursales } from '../../api/hooks';
import { useToast } from '../../context/ToastContext';
import { IconoOjo, IconoLapiz, IconoCandado, IconoCandadoAbierto } from '../../components/Iconos';

// value es el nombre real en la tabla "rol" de la base de datos (que
// dice "Admin", no "Administrador"); label es lo que se muestra.
const ROLES = [
  { value: 'Admin', label: 'Administrador' },
  { value: 'Gerente', label: 'Gerente' },
  { value: 'Supervisor', label: 'Supervisor' },
  { value: 'Digitador', label: 'Digitador' },
  { value: 'Motorista', label: 'Motorista' }
];
const POR_PAGINA = 15;

// Convención de la empresa: primer nombre + primera letra del primer
// apellido + código correlativo de la empresa, todo en minúsculas y
// sin acentos (ej. WILLIAM CASTAÑEDA, código 125 -> "williamc125").
function generarUsuario(persona) {
  const primerNombre = (persona.nombrePila || '').trim().split(/\s+/)[0] || '';
  const primeraLetraApellido = (persona.apellidoPila || '').trim().charAt(0) || '';
  const sugerido = `${primerNombre}${primeraLetraApellido}${persona.codigo ?? ''}`;
  const sinAcentos = sugerido
    .normalize('NFD')
    .split('')
    .filter((ch) => ch.charCodeAt(0) < 0x0300 || ch.charCodeAt(0) > 0x036f)
    .join('');
  return sinAcentos.toLowerCase();
}

export default function Usuarios() {
  const { data: usuarios, isError: usuariosError, error: usuariosErrorInfo } = useUsuarios();
  const { data: personalSinCuenta } = useUsuariosSinCuenta();
  const { data: sucursales } = useSucursales(undefined, 'A');
  const mut = useUsuariosMutation();
  const mostrarToast = useToast();

  const [form, setForm] = useState({ personaId: '', usuario: '', correo: '', password: '', roles: [], sucursalIds: [] });
  const [editando, setEditando] = useState(null);
  const [viendo, setViendo] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [pagina, setPagina] = useState(1);

  const usuariosFiltrados = (usuarios ?? []).filter((u) => {
    if (filtroEstado === 'A' && u.estado === 'BLOQUEADO') return false;
    if (filtroEstado === 'BLOQUEADO' && u.estado !== 'BLOQUEADO') return false;
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return u.usuario?.toLowerCase().includes(q) || u.nombre?.toLowerCase().includes(q) || u.correo?.toLowerCase().includes(q);
  });
  const totalPaginas = Math.max(1, Math.ceil(usuariosFiltrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const usuariosPagina = usuariosFiltrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  function onBuscar(valor) {
    setBusqueda(valor);
    setPagina(1);
  }

  function onFiltroEstado(valor) {
    setFiltroEstado(valor);
    setPagina(1);
  }

  function etiquetaRol(valor) {
    return ROLES.find((r) => r.value === valor)?.label ?? valor;
  }

  function toggleRolForm(rol) {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(rol) ? f.roles.filter((r) => r !== rol) : [...f.roles, rol]
    }));
  }
  function toggleRolEditar(rol) {
    setEditando((e) => ({
      ...e,
      roles: e.roles.includes(rol) ? e.roles.filter((r) => r !== rol) : [...e.roles, rol]
    }));
  }

  function toggleSucursalForm(id) {
    setForm((f) => ({
      ...f,
      sucursalIds: f.sucursalIds.includes(id) ? f.sucursalIds.filter((x) => x !== id) : [...f.sucursalIds, id]
    }));
  }
  function toggleSucursalEditar(id) {
    setEditando((e) => ({
      ...e,
      sucursalIds: e.sucursalIds.includes(id) ? e.sucursalIds.filter((x) => x !== id) : [...e.sucursalIds, id]
    }));
  }

  function crear(e) {
    e.preventDefault();
    mut.crear.mutate(form, {
      onSuccess: () => {
        setForm({ personaId: '', usuario: '', correo: '', password: '', roles: [], sucursalIds: [] });
        mostrarToast('Usuario creado correctamente.');
      }
    });
  }

  function onBloquear(u) {
    const bloqueando = u.estado !== 'BLOQUEADO';
    const confirmado = window.confirm(
      bloqueando
        ? `¿Bloquear a ${u.usuario}? No podrá iniciar sesión hasta que lo desbloquees.`
        : `¿Desbloquear a ${u.usuario}?`
    );
    if (!confirmado) return;
    mut.actualizar.mutate(
      { id: u.id, estado: bloqueando ? 'BLOQUEADO' : 'A' },
      { onSuccess: () => mostrarToast(bloqueando ? `${u.usuario} fue bloqueado.` : `${u.usuario} fue desbloqueado.`) }
    );
  }

  return (
    <div>
      <h1 className="page-title">Usuarios y permisos</h1>

      <form className="card" onSubmit={crear}>
        <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
          Un usuario puede tener más de un rol. El rol Administrador ve todas las sucursales sin necesidad de asignarlas.
        </p>
        <div className="form-grid">
          <div className="field">
            <label>Persona (solo Administradores, Gerentes y Supervisores sin usuario creado)</label>
            <select
              value={form.personaId}
              onChange={(e) => {
                const id = e.target.value;
                const persona = personalSinCuenta?.find((p) => String(p.id) === id);
                setForm((f) => ({ ...f, personaId: id, usuario: persona ? generarUsuario(persona) : f.usuario }));
              }}
              required
            >
              <option value="">Selecciona...</option>
              {personalSinCuenta?.map((p) => <option key={p.id} value={p.id}>{p.nombres} — {p.puesto}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Usuario (autogenerado: nombre + inicial de apellido + código, editable)</label>
            <input value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} required />
          </div>
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Correo electrónico</label>
            <input type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} required />
          </div>
          <div className="field">
            <label>Contraseña inicial</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
          Si el rol es Gerente, a este correo le llega el resumen automático al autorizar cierres.
        </p>
        <div className="field" style={{ marginBottom: 12 }}>
          <label>Roles</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ROLES.map((rol) => (
              <button
                type="button"
                key={rol.value}
                className={`btn ${form.roles.includes(rol.value) ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => toggleRolForm(rol.value)}
              >
                {rol.label}
              </button>
            ))}
          </div>
        </div>
        <div className="field" style={{ marginBottom: 12 }}>
          <label>CAD (sucursales) a las que tiene acceso — puede elegir más de una</label>
          <SelectorSucursales sucursales={sucursales} seleccionadas={form.sucursalIds} onToggle={toggleSucursalForm} />
        </div>
        {mut.crear.isError && (
          <p style={{ color: 'var(--coral-dark)', background: 'var(--coral-light)', padding: '10px 12px', borderRadius: 8, fontSize: 12.5, marginBottom: 12 }}>
            No se pudo crear: {mut.crear.error?.response?.data?.error || mut.crear.error?.message || 'error desconocido'}.
          </p>
        )}
        <button className="btn btn-primary" disabled={mut.crear.isPending}>
          {mut.crear.isPending ? 'Creando...' : 'Crear usuario'}
        </button>
      </form>

      <div className="card">
        <h2>Usuarios activos</h2>
        {usuariosError && (
          <p style={{ color: 'var(--coral-dark)', background: 'var(--coral-light)', padding: '10px 12px', borderRadius: 8, fontSize: 12.5, marginBottom: 12 }}>
            No se pudo cargar el listado: {usuariosErrorInfo?.response?.data?.error || usuariosErrorInfo?.message || 'error desconocido'}.
            {usuariosErrorInfo?.response?.status === 403 && ' Tu sesión no tiene permiso de Administrador; cierra sesión y vuelve a entrar.'}
            {usuariosErrorInfo?.response?.status === 401 && ' Tu sesión venció; vuelve a iniciar sesión.'}
          </p>
        )}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 14 }}>
          <div className="field" style={{ maxWidth: 360, marginBottom: 0 }}>
            <label>Buscar por usuario, nombre o correo</label>
            <input value={busqueda} onChange={(e) => onBuscar(e.target.value)} placeholder="Ej. williamc2..." />
          </div>
          <div className="field" style={{ maxWidth: 200, marginBottom: 0 }}>
            <label>Estado</label>
            <select value={filtroEstado} onChange={(e) => onFiltroEstado(e.target.value)}>
              <option value="TODOS">Todos</option>
              <option value="A">Activos</option>
              <option value="BLOQUEADO">Bloqueados</option>
            </select>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Usuario</th><th>Nombre</th><th className="col-ocultar-movil">Correo</th><th className="col-ocultar-movil">Roles</th>
              <th>CAD asignados</th><th>Estado</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuariosPagina.map((u) => (
              <tr key={u.id}>
                <td>{u.usuario}</td><td>{u.nombre}</td><td className="col-ocultar-movil">{u.correo}</td>
                <td className="col-ocultar-movil">{u.roles.map(etiquetaRol).join(', ')}</td>
                <td>{u.sucursales?.length ? u.sucursales.map((s) => s.nombre).join(', ') : '—'}</td>
                <td>
                  <span className={`status-pill ${u.estado === 'BLOQUEADO' ? 'warn' : 'ok'}`}>
                    {u.estado === 'BLOQUEADO' ? 'Bloqueado' : 'Activo'}
                  </span>
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="btn btn-ghost icon-btn" title="Ver información" onClick={() => setViendo(u)}>
                      <IconoOjo />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost icon-btn"
                      title="Editar"
                      onClick={() => setEditando({ ...u, sucursalIds: (u.sucursales ?? []).map((s) => s.id), nuevaPassword: '' })}
                    >
                      <IconoLapiz />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost icon-btn"
                      title={u.estado === 'BLOQUEADO' ? 'Desbloquear' : 'Bloquear'}
                      disabled={mut.actualizar.isPending}
                      onClick={() => onBloquear(u)}
                    >
                      {u.estado === 'BLOQUEADO' ? <IconoCandadoAbierto /> : <IconoCandado />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {usuariosFiltrados.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              Página {paginaActual} de {totalPaginas} · {usuariosFiltrados.length} usuario{usuariosFiltrados.length === 1 ? '' : 's'}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-ghost" disabled={paginaActual <= 1} onClick={() => setPagina(paginaActual - 1)}>Anterior</button>
              <button className="btn btn-ghost" disabled={paginaActual >= totalPaginas} onClick={() => setPagina(paginaActual + 1)}>Siguiente</button>
            </div>
          </div>
        )}
      </div>

      <Modal titulo="Información del usuario" abierto={!!viendo} onCerrar={() => setViendo(null)} ancho={560} soloLectura>
        {viendo && (
          <>
            <div className="form-grid">
              <CampoVista label="Usuario" valor={viendo.usuario} />
              <CampoVista label="Nombre" valor={viendo.nombre} />
            </div>
            <div className="form-grid">
              <CampoVista label="Correo" valor={viendo.correo} />
              <CampoVista label="Estado" valor={viendo.estado === 'BLOQUEADO' ? 'Bloqueado' : 'Activo'} />
            </div>
            <div className="field">
              <label>Roles</label>
              <input value={viendo.roles.map(etiquetaRol).join(', ') || '—'} disabled />
            </div>
            <div className="field">
              <label>CAD asignados</label>
              <input value={viendo.sucursales?.length ? viendo.sucursales.map((s) => s.nombre).join(', ') : '—'} disabled />
            </div>
          </>
        )}
      </Modal>

      <Modal
        titulo="Editar usuario"
        abierto={!!editando}
        onCerrar={() => setEditando(null)}
        onGuardar={() => mut.actualizar.mutate(
          { id: editando.id, ...editando },
          { onSuccess: () => { setEditando(null); mostrarToast('Cambios guardados correctamente.'); } }
        )}
        guardando={mut.actualizar.isPending}
      >
        {editando && (
          <>
            <div className="field">
              <label>Correo electrónico</label>
              <input type="email" value={editando.correo} onChange={(e) => setEditando({ ...editando, correo: e.target.value })} />
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Roles</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ROLES.map((rol) => (
                  <button
                    type="button"
                    key={rol.value}
                    className={`btn ${editando.roles.includes(rol.value) ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => toggleRolEditar(rol.value)}
                  >
                    {rol.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Nueva contraseña (dejar en blanco para no cambiarla)</label>
              <input
                type="password"
                value={editando.nuevaPassword}
                onChange={(e) => setEditando({ ...editando, nuevaPassword: e.target.value })}
              />
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>CAD (sucursales) a las que tiene acceso — puede elegir más de una</label>
              <SelectorSucursales sucursales={sucursales} seleccionadas={editando.sucursalIds} onToggle={toggleSucursalEditar} />
            </div>
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

function SelectorSucursales({ sucursales, seleccionadas, onToggle }) {
  const [busqueda, setBusqueda] = useState('');
  const lista = sucursales ?? [];
  const seleccionadasInfo = lista.filter((s) => seleccionadas.includes(s.id));
  const filtradas = lista.filter((s) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return s.nombre?.toLowerCase().includes(q) || s.empresaNombre?.toLowerCase().includes(q);
  });

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px', background: 'var(--chip-bg)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-2)', marginBottom: seleccionadasInfo.length ? 8 : 0 }}>
          {seleccionadasInfo.length === 0 ? 'Ningún CAD seleccionado todavía' : `${seleccionadasInfo.length} CAD seleccionado${seleccionadasInfo.length === 1 ? '' : 's'}`}
        </div>
        {seleccionadasInfo.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {seleccionadasInfo.map((s) => (
              <span
                key={s.id}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--navy)', color: '#fff',
                  borderRadius: 20, padding: '4px 6px 4px 12px', fontSize: 12
                }}
              >
                {s.nombre}
                <button
                  type="button"
                  onClick={() => onToggle(s.id)}
                  title="Quitar"
                  style={{
                    background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', borderRadius: '50%',
                    width: 18, height: 18, lineHeight: '18px', textAlign: 'center', cursor: 'pointer', fontSize: 12, padding: 0
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Escribe para buscar un CAD por nombre o empresa..."
        style={{ width: '100%', border: 'none', borderBottom: '1px solid var(--line)', padding: '9px 10px', background: 'var(--input-bg)', color: 'var(--text)' }}
      />
      <div style={{ maxHeight: 220, overflowY: 'auto', padding: 6 }}>
        {filtradas.map((s) => {
          const marcada = seleccionadas.includes(s.id);
          return (
            <label
              key={s.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', fontSize: 13, cursor: 'pointer',
                borderRadius: 6, background: marcada ? 'var(--teal-light)' : 'transparent', marginBottom: 2
              }}
            >
              <input type="checkbox" checked={marcada} onChange={() => onToggle(s.id)} style={{ width: 16, height: 16, flexShrink: 0 }} />
              <span style={{ fontWeight: marcada ? 700 : 400, color: marcada ? 'var(--teal-dark)' : 'var(--text)' }}>{s.nombre}</span>
              <span style={{ color: 'var(--text-3)', fontSize: 11.5 }}>{s.empresaNombre}</span>
            </label>
          );
        })}
        {filtradas.length === 0 && <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '10px 4px' }}>Sin resultados para esa búsqueda.</p>}
      </div>
    </div>
  );
}

function CampoVista({ label, valor }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input value={valor ?? '—'} disabled />
    </div>
  );
}
