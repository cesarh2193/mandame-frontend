import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import FotoPersonal from '../../components/FotoPersonal';
import {
  usePersonal, usePersonalMutation, useSubirFotoPersonal, useSubirDocumentoPersonal,
  useEmpresas, useSucursales
} from '../../api/hooks';
import { api } from '../../api/client';
import { formatearFechaDisplay } from '../../utils/fecha';
import { useToast } from '../../context/ToastContext';
import { IconoOjo, IconoLapiz, IconoBasura } from '../../components/Iconos';

const PUESTOS = ['Motorista', 'Supervisor', 'Gerente', 'Digitador', 'Administrador'];
const ESTADOS_CIVILES = ['Soltero/a', 'Casado/a', 'Unido/a', 'Divorciado/a', 'Viudo/a'];
const RELACIONES_EMERGENCIA = ['Madre', 'Padre', 'Esposa', 'Esposo', 'Hijo/a', 'Hermano/a', 'Tío/a', 'Primo/a', 'Otro'];
const BANCOS_GUATEMALA = [
  'Banco Industrial', 'Banco G&T Continental', 'Banrural', 'BAC (Banco de América Central)',
  'Banco Agromercantil (BAM)', 'Banco Promerica', 'Bantrab', 'Banco Ficohsa Guatemala',
  'Banco Inmobiliario', 'Interbanco', 'CHN (Crédito Hipotecario Nacional)', 'Vivibanco', 'Banco Azteca', 'Otro'
];
// tipo es el código que se guarda en persona_documento.tipo (y con el
// que se arma la ruta /api/personal/:id/documentos/:tipo) — DPI,
// RECIBO_LUZ y LICENCIA no se renombran para no dejar huérfanos los
// documentos que la gente ya subió antes de agregar el resto.
const TIPOS_DOCUMENTO = [
  { tipo: 'DPI', etiqueta: 'DPI (frente)', categoria: 'Identificación' },
  { tipo: 'DPI_REVERSO', etiqueta: 'DPI (reverso)', categoria: 'Identificación' },
  { tipo: 'LICENCIA', etiqueta: 'Licencia de conducir (frente)', categoria: 'Identificación' },
  { tipo: 'LICENCIA_REVERSO', etiqueta: 'Licencia de conducir (reverso)', categoria: 'Identificación' },
  { tipo: 'RECIBO_LUZ', etiqueta: 'Recibo de luz', categoria: 'Identificación' },
  { tipo: 'TARJETA_CIRCULACION', etiqueta: 'Tarjeta de circulación', categoria: 'Administrativo' },
  { tipo: 'POLITICAS_CUMPLIMIENTO', etiqueta: 'Políticas de cumplimiento', categoria: 'Administrativo' },
  { tipo: 'ENTREVISTA', etiqueta: 'Entrevista', categoria: 'Administrativo' },
  { tipo: 'TARJETA_SALUD', etiqueta: 'Tarjeta de salud', categoria: 'Salud' },
  { tipo: 'TARJETA_PULMONES', etiqueta: 'Tarjeta de pulmones', categoria: 'Salud' },
  { tipo: 'MANIPULACION_ALIMENTOS', etiqueta: 'Tarjeta de manipulación de alimentos (frente)', categoria: 'Salud' },
  { tipo: 'MANIPULACION_ALIMENTOS_REVERSO', etiqueta: 'Tarjeta de manipulación de alimentos (reverso)', categoria: 'Salud' }
];
const CATEGORIAS_DOCUMENTO = ['Identificación', 'Administrativo', 'Salud'];
const POR_PAGINA = 20;
const FORM_VACIO = {
  codigo: '', nombres: '', apellidos: '', dpi: '', puesto: 'Motorista', empresaId: '', sucursalId: '',
  tambienMotorista: true, tipoMotorista: 'FIJO', placa: '', licencia: '',
  telefono: '', correo: '',
  contactoEmergenciaNombre: '', contactoEmergenciaTelefono: '', contactoEmergenciaRelacion: '',
  numeroCuenta: '', banco: '', tipoCuenta: '',
  igss: '', estadoCivil: '', nombreConyuge: '', nombrePadre: '', nombreMadre: '',
  fechaInicioLabores: '', fechaFinLabores: '', seguroVida: false,
  fotoArchivo: null,
  docArchivos: {}
};

function dpiEsValido(dpi) {
  if (!dpi) return true; // el campo requerido se valida aparte; acá solo el formato
  return String(dpi).replace(/\D/g, '').length === 13;
}

// Campos "extra" (no obligatorios al crear) que consideramos para medir
// qué tan completo está el expediente de una persona. Los obligatorios
// (código, nombres, DPI, puesto, sucursal) no cuentan: siempre están
// completos porque el formulario no deja guardar sin ellos.
const CAMPOS_COMPLETITUD = [
  'telefono', 'correo',
  'contactoEmergenciaNombre', 'contactoEmergenciaTelefono', 'contactoEmergenciaRelacion',
  'numeroCuenta', 'banco', 'tipoCuenta',
  'igss', 'estadoCivil', 'nombrePadre', 'nombreMadre', 'fechaInicioLabores',
  'tieneFoto'
];

// Los documentos cuentan aparte (uno por cada tipo subido) en vez de
// como una sola casilla booleana, para que la completitud no se
// "estanque" en un solo punto por más documentos que se agreguen.
function calcularCompletitud(p) {
  const llenos = CAMPOS_COMPLETITUD.filter((campo) => {
    const valor = p[campo];
    return typeof valor === 'boolean' ? valor : !!(valor && String(valor).trim());
  }).length;
  const documentosLlenos = p.documentosSubidos?.length ?? 0;
  const totalCampos = CAMPOS_COMPLETITUD.length + TIPOS_DOCUMENTO.length;
  return Math.round(((llenos + documentosLlenos) / totalCampos) * 100);
}

function colorCompletitud(porcentaje) {
  if (porcentaje >= 80) return 'var(--teal-dark)';
  if (porcentaje >= 50) return 'var(--amber-dark)';
  return 'var(--coral-dark)';
}

export default function Personal() {
  const { data: personal } = usePersonal();
  const mut = usePersonalMutation();
  const subirFoto = useSubirFotoPersonal();
  const subirDocumento = useSubirDocumentoPersonal();
  const { data: empresas } = useEmpresas('A');
  const mostrarToast = useToast();

  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const { data: sucursales } = useSucursales(form.empresaId, 'A');
  const [editando, setEditando] = useState(null);
  const { data: sucursalesEditar } = useSucursales(editando?.empresaId, 'A');
  const [viendo, setViendo] = useState(null);

  const [emergenciaAbierta, setEmergenciaAbierta] = useState(false);
  const [padresAbierta, setPadresAbierta] = useState(false);
  const [bancariosAbierta, setBancariosAbierta] = useState(false);
  const [laboralAbierta, setLaboralAbierta] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [mostrarBajas, setMostrarBajas] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [esMovil, setEsMovil] = useState(() => window.matchMedia('(max-width: 860px)').matches);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 860px)');
    const onChange = () => setEsMovil(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  // El modal principal abierto en un momento dado (crear o editar, nunca
  // los dos a la vez) determina sobre qué objeto escriben los sub-modales
  // de "Información de emergencia" y "Datos de los padres".
  const activo = creando ? { valores: form, set: setForm } : editando ? { valores: editando, set: setEditando } : null;

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
    setEmergenciaAbierta(false);
    setPadresAbierta(false);
    setBancariosAbierta(false);
    setLaboralAbierta(false);
  }

  function cerrarEdicion() {
    setEditando(null);
    setEmergenciaAbierta(false);
    setPadresAbierta(false);
    setBancariosAbierta(false);
    setLaboralAbierta(false);
  }

  function subirDocumentosPendientes(id, docArchivos) {
    Object.entries(docArchivos || {}).forEach(([tipo, archivo]) => {
      if (archivo) subirDocumento.mutate({ id, tipo, archivo });
    });
  }

  function crear() {
    if (!dpiEsValido(form.dpi)) {
      mostrarToast('El DPI debe tener 13 dígitos.', 'error');
      return;
    }
    const { fotoArchivo, docArchivos, ...payload } = form;
    mut.crear.mutate(payload, {
      onSuccess: (data) => {
        if (fotoArchivo && data?.id) {
          subirFoto.mutate({ id: data.id, archivo: fotoArchivo });
        }
        if (data?.id) subirDocumentosPendientes(data.id, docArchivos);
        cerrarCreacion();
        mostrarToast('Personal insertado correctamente.');
      }
    });
  }

  function guardarEdicion() {
    if (!dpiEsValido(editando.dpi)) {
      mostrarToast('El DPI debe tener 13 dígitos.', 'error');
      return;
    }
    const { fotoArchivo, docArchivos, tieneFoto, documentosSubidos, id, ...payload } = editando;
    mut.actualizar.mutate(
      { id, ...payload },
      {
        onSuccess: () => {
          if (fotoArchivo) {
            subirFoto.mutate({ id, archivo: fotoArchivo });
          }
          subirDocumentosPendientes(id, docArchivos);
          cerrarEdicion();
          mostrarToast('Cambios guardados correctamente.');
        }
      }
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
      estado: p.estado || 'A',
      telefono: p.telefono || '',
      correo: p.correo || '',
      contactoEmergenciaNombre: p.contactoEmergenciaNombre || '',
      contactoEmergenciaTelefono: p.contactoEmergenciaTelefono || '',
      contactoEmergenciaRelacion: p.contactoEmergenciaRelacion || '',
      numeroCuenta: p.numeroCuenta || '',
      banco: p.banco || '',
      tipoCuenta: p.tipoCuenta || '',
      igss: p.igss || '',
      estadoCivil: p.estadoCivil || '',
      nombreConyuge: p.nombreConyuge || '',
      nombrePadre: p.nombrePadre || '',
      nombreMadre: p.nombreMadre || '',
      fechaInicioLabores: p.fechaInicioLabores ? String(p.fechaInicioLabores).slice(0, 10) : '',
      fechaFinLabores: p.fechaFinLabores ? String(p.fechaFinLabores).slice(0, 10) : '',
      seguroVida: !!p.seguroVida,
      tieneFoto: !!p.tieneFoto,
      fotoArchivo: null,
      documentosSubidos: p.documentosSubidos || [],
      docArchivos: {}
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
        {esMovil ? (
          <div className="mobile-personal-list">
            {personalPagina.map((p) => (
              <div key={p.id} className="mobile-personal-card">
                <div className="mobile-personal-top">
                  <div className="mobile-personal-code">{p.codigo}</div>
                  <div className="mobile-personal-actions">
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
                </div>
                <div className="mobile-personal-name">
                  {p.nombres} <BadgeCompletitud persona={p} />
                </div>
                <div className="mobile-personal-meta">
                  <span className="mobile-personal-label">CAD</span>
                  <span className="mobile-personal-value">{p.codigoCad || p.sucursalNombre}</span>
                </div>
                <div className="mobile-personal-meta">
                  <span className="mobile-personal-label">Estado</span>
                  <span className={`status-pill ${p.estado === 'I' ? 'warn' : 'ok'}`}>
                    {p.estado === 'I' ? 'Dado de baja' : 'Activo'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th className="col-ocultar-movil">Puesto</th>
                <th>Sucursal</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {personalPagina.map((p) => (
                <tr key={p.id}>
                  <td>{p.codigo}</td>
                  <td>{p.nombres} <BadgeCompletitud persona={p} /></td>
                  <td className="col-ocultar-movil">{p.puesto}</td>
                  <td>{p.sucursalNombre}</td>
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
        )}
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

      <Modal titulo="Nuevo personal" abierto={creando} onCerrar={cerrarCreacion} onGuardar={crear} guardando={mut.crear.isPending} ancho={820}>
        <FotoUploader archivo={form.fotoArchivo} onCambiar={(archivo) => setForm({ ...form, fotoArchivo: archivo })} />

        <Seccion titulo="Datos personales" />
        <div className="form-grid-3">
          <div className="field">
            <label>Código (correlativo de la empresa)</label>
            <input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })} required />
          </div>
          <div className="field">
            <label>Nombres</label>
            <input value={form.nombres} onChange={(e) => setForm({ ...form, nombres: e.target.value.toUpperCase() })} required />
          </div>
          <div className="field">
            <label>Apellidos</label>
            <input value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value.toUpperCase() })} required />
          </div>
        </div>
        <div className="form-grid-3">
          <CampoDpi valor={form.dpi} onChange={(v) => setForm({ ...form, dpi: v })} />
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
            <label>Teléfono</label>
            <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value.toUpperCase() })} />
          </div>
          <div className="field">
            <label>Correo electrónico</label>
            <input type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />
          </div>
        </div>

        <Seccion titulo="Ubicación" />
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
              <input value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })} />
            </div>
            <div className="field">
              <label>Licencia de conducir</label>
              <input value={form.licencia} onChange={(e) => setForm({ ...form, licencia: e.target.value.toUpperCase() })} />
            </div>
          </div>
        )}

        <Seccion titulo="Información adicional" />
        <div className="form-grid-4">
          <BotonSubmodal
            etiqueta="Información de emergencia"
            lleno={!!form.contactoEmergenciaNombre}
            onClick={() => setEmergenciaAbierta(true)}
          />
          <BotonSubmodal
            etiqueta="Datos bancarios"
            lleno={!!(form.numeroCuenta || form.banco)}
            onClick={() => setBancariosAbierta(true)}
          />
          <BotonSubmodal
            etiqueta="Información laboral y personal"
            lleno={!!(form.igss || form.estadoCivil || form.fechaInicioLabores)}
            onClick={() => setLaboralAbierta(true)}
          />
          <BotonSubmodal
            etiqueta="Datos de los padres"
            lleno={!!(form.nombrePadre || form.nombreMadre)}
            onClick={() => setPadresAbierta(true)}
          />
        </div>

        <Seccion titulo="Documentos" />
        <AcordeonDocumentos
          documentosSubidos={[]}
          docArchivos={form.docArchivos}
          onCambiarArchivo={(tipo, archivo) => setForm({ ...form, docArchivos: { ...form.docArchivos, [tipo]: archivo } })}
        />

        {mut.crear.isError && (
          <p style={{ color: 'var(--coral-dark)', background: 'var(--coral-light)', padding: '10px 12px', borderRadius: 8, fontSize: 12.5, marginTop: 4 }}>
            No se pudo insertar: {mut.crear.error?.response?.data?.error || mut.crear.error?.message || 'error desconocido'}.
          </p>
        )}
      </Modal>

      <Modal titulo="Información del personal" abierto={!!viendo} onCerrar={() => setViendo(null)} ancho={820} soloLectura>
        {viendo && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <FotoPersonal personaId={viendo.id} tieneFoto={viendo.tieneFoto} tamano={110} />
            </div>

            <Seccion titulo="Datos personales" />
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
            <div className="form-grid-3">
              <Campo label="Teléfono" valor={viendo.telefono} />
              <Campo label="Correo electrónico" valor={viendo.correo} />
            </div>
            <div className="form-grid-3">
              <Campo label="Contacto de emergencia" valor={viendo.contactoEmergenciaNombre} />
              <Campo label="Teléfono de emergencia" valor={viendo.contactoEmergenciaTelefono} />
              <Campo label="Relación" valor={viendo.contactoEmergenciaRelacion} />
            </div>

            <Seccion titulo="Datos bancarios" />
            <div className="form-grid-3">
              <Campo label="Número de cuenta" valor={viendo.numeroCuenta} />
              <Campo label="Banco" valor={viendo.banco} />
              <Campo label="Tipo de cuenta" valor={viendo.tipoCuenta} />
            </div>

            <Seccion titulo="Información laboral y personal" />
            <div className="form-grid-3">
              <Campo label="IGSS" valor={viendo.igss} />
              <Campo label="Estado civil" valor={viendo.estadoCivil} />
              <Campo label="Nombre del cónyuge" valor={viendo.nombreConyuge} />
            </div>
            <div className="form-grid-3">
              <Campo label="Fecha inicio de labores" valor={viendo.fechaInicioLabores ? formatearFechaDisplay(viendo.fechaInicioLabores) : ''} />
              <Campo label="Fecha finaliza labores" valor={viendo.fechaFinLabores ? formatearFechaDisplay(viendo.fechaFinLabores) : ''} />
              <Campo label="Seguro de vida" valor={viendo.seguroVida ? 'Sí' : 'No'} />
            </div>
            <div className="form-grid-3">
              <Campo label="Nombre del padre" valor={viendo.nombrePadre} />
              <Campo label="Nombre de la madre" valor={viendo.nombreMadre} />
            </div>

            {viendo.tambienMotorista && (
              <>
                <Seccion titulo="Datos de motorista" />
                <div className="form-grid-3">
                  <Campo label="Tipo de motorista" valor={viendo.tipoMotorista === 'TURNO' ? 'Turno (sáb-dom)' : 'Fijo'} />
                  <Campo label="Placa asignada" valor={viendo.placa || '—'} />
                  <Campo label="Licencia de conducir" valor={viendo.licencia || '—'} />
                </div>
              </>
            )}

            <Seccion titulo="Documentos" />
            <AcordeonDocumentos
              personaId={viendo.id}
              documentosSubidos={viendo.documentosSubidos || []}
              docArchivos={{}}
              soloLectura
            />
          </>
        )}
      </Modal>

      <Modal
        titulo="Editar personal"
        abierto={!!editando}
        onCerrar={cerrarEdicion}
        onGuardar={guardarEdicion}
        guardando={mut.actualizar.isPending}
        ancho={820}
      >
        {editando && (
          <>
            <FotoUploader
              archivo={editando.fotoArchivo}
              tieneFotoGuardada={editando.tieneFoto}
              personaId={editando.id}
              onCambiar={(archivo) => setEditando({ ...editando, fotoArchivo: archivo })}
            />

            <Seccion titulo="Datos personales" />
            <div className="form-grid-3">
              <div className="field">
                <label>Nombres</label>
                <input value={editando.nombres} onChange={(e) => setEditando({ ...editando, nombres: e.target.value.toUpperCase() })} />
              </div>
              <div className="field">
                <label>Apellidos</label>
                <input value={editando.apellidos} onChange={(e) => setEditando({ ...editando, apellidos: e.target.value.toUpperCase() })} />
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
              <CampoDpi valor={editando.dpi} onChange={(v) => setEditando({ ...editando, dpi: v })} />
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
                <label>Teléfono</label>
                <input value={editando.telefono} onChange={(e) => setEditando({ ...editando, telefono: e.target.value.toUpperCase() })} />
              </div>
              <div className="field">
                <label>Correo electrónico</label>
                <input type="email" value={editando.correo} onChange={(e) => setEditando({ ...editando, correo: e.target.value })} />
              </div>
            </div>

            <Seccion titulo="Ubicación" />
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
                  <input value={editando.placa} onChange={(e) => setEditando({ ...editando, placa: e.target.value.toUpperCase() })} />
                </div>
                <div className="field">
                  <label>Licencia de conducir</label>
                  <input value={editando.licencia} onChange={(e) => setEditando({ ...editando, licencia: e.target.value.toUpperCase() })} />
                </div>
              </div>
            )}

            <Seccion titulo="Información adicional" />
            <div className="form-grid-4">
              <BotonSubmodal
                etiqueta="Información de emergencia"
                lleno={!!editando.contactoEmergenciaNombre}
                onClick={() => setEmergenciaAbierta(true)}
              />
              <BotonSubmodal
                etiqueta="Datos bancarios"
                lleno={!!(editando.numeroCuenta || editando.banco)}
                onClick={() => setBancariosAbierta(true)}
              />
              <BotonSubmodal
                etiqueta="Información laboral y personal"
                lleno={!!(editando.igss || editando.estadoCivil || editando.fechaInicioLabores)}
                onClick={() => setLaboralAbierta(true)}
              />
              <BotonSubmodal
                etiqueta="Datos de los padres"
                lleno={!!(editando.nombrePadre || editando.nombreMadre)}
                onClick={() => setPadresAbierta(true)}
              />
            </div>

            <Seccion titulo="Documentos" />
            <AcordeonDocumentos
              personaId={editando.id}
              documentosSubidos={editando.documentosSubidos || []}
              docArchivos={editando.docArchivos}
              onCambiarArchivo={(tipo, archivo) => setEditando({ ...editando, docArchivos: { ...editando.docArchivos, [tipo]: archivo } })}
            />
            {mut.actualizar.isError && (
              <p style={{ color: 'var(--coral-dark)', background: 'var(--coral-light)', padding: '10px 12px', borderRadius: 8, fontSize: 12.5 }}>
                No se pudo guardar: {mut.actualizar.error?.response?.data?.error || mut.actualizar.error?.message || 'error desconocido'}.
              </p>
            )}
          </>
        )}
      </Modal>

      <Modal
        titulo="Información de emergencia"
        abierto={emergenciaAbierta}
        onCerrar={() => setEmergenciaAbierta(false)}
        onGuardar={() => setEmergenciaAbierta(false)}
        ancho={520}
      >
        {activo && (
          <>
            <div className="field">
              <label>Nombre completo del contacto</label>
              <input
                value={activo.valores.contactoEmergenciaNombre}
                onChange={(e) => activo.set({ ...activo.valores, contactoEmergenciaNombre: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Teléfono</label>
                <input
                  value={activo.valores.contactoEmergenciaTelefono}
                  onChange={(e) => activo.set({ ...activo.valores, contactoEmergenciaTelefono: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="field">
                <label>Relación</label>
                <select
                  value={activo.valores.contactoEmergenciaRelacion}
                  onChange={(e) => activo.set({ ...activo.valores, contactoEmergenciaRelacion: e.target.value })}
                >
                  <option value="">Selecciona...</option>
                  {RELACIONES_EMERGENCIA.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </>
        )}
      </Modal>

      <Modal
        titulo="Datos de los padres"
        abierto={padresAbierta}
        onCerrar={() => setPadresAbierta(false)}
        onGuardar={() => setPadresAbierta(false)}
        ancho={520}
      >
        {activo && (
          <>
            <div className="field">
              <label>Nombre del padre</label>
              <input
                value={activo.valores.nombrePadre}
                onChange={(e) => activo.set({ ...activo.valores, nombrePadre: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="field">
              <label>Nombre de la madre</label>
              <input
                value={activo.valores.nombreMadre}
                onChange={(e) => activo.set({ ...activo.valores, nombreMadre: e.target.value.toUpperCase() })}
              />
            </div>
          </>
        )}
      </Modal>

      <Modal
        titulo="Datos bancarios"
        abierto={bancariosAbierta}
        onCerrar={() => setBancariosAbierta(false)}
        onGuardar={() => setBancariosAbierta(false)}
        ancho={560}
      >
        {activo && (
          <div className="form-grid-3">
            <div className="field">
              <label>Número de cuenta</label>
              <input
                value={activo.valores.numeroCuenta}
                onChange={(e) => activo.set({ ...activo.valores, numeroCuenta: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="field">
              <label>Banco</label>
              <select
                value={activo.valores.banco}
                onChange={(e) => activo.set({ ...activo.valores, banco: e.target.value })}
              >
                <option value="">Selecciona...</option>
                {BANCOS_GUATEMALA.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Tipo de cuenta</label>
              <select
                value={activo.valores.tipoCuenta}
                onChange={(e) => activo.set({ ...activo.valores, tipoCuenta: e.target.value })}
              >
                <option value="">Selecciona...</option>
                <option value="Monetaria">Monetaria</option>
                <option value="Ahorro">Ahorro</option>
              </select>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        titulo="Información laboral y personal"
        abierto={laboralAbierta}
        onCerrar={() => setLaboralAbierta(false)}
        onGuardar={() => setLaboralAbierta(false)}
        ancho={620}
      >
        {activo && (
          <>
            <div className="form-grid-3">
              <div className="field">
                <label>IGSS</label>
                <input
                  value={activo.valores.igss}
                  onChange={(e) => activo.set({ ...activo.valores, igss: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="field">
                <label>Estado civil</label>
                <select
                  value={activo.valores.estadoCivil}
                  onChange={(e) => activo.set({ ...activo.valores, estadoCivil: e.target.value })}
                >
                  <option value="">Selecciona...</option>
                  {ESTADOS_CIVILES.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Nombre del cónyuge (opcional)</label>
                <input
                  value={activo.valores.nombreConyuge}
                  onChange={(e) => activo.set({ ...activo.valores, nombreConyuge: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
            <div className="form-grid-3">
              <div className="field">
                <label>Fecha inicio de labores</label>
                <input
                  type="date"
                  value={activo.valores.fechaInicioLabores}
                  onChange={(e) => activo.set({ ...activo.valores, fechaInicioLabores: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Fecha finaliza labores</label>
                <input
                  type="date"
                  value={activo.valores.fechaFinLabores}
                  onChange={(e) => activo.set({ ...activo.valores, fechaFinLabores: e.target.value })}
                />
              </div>
              <div className="field" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 9 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={activo.valores.seguroVida}
                    onChange={(e) => activo.set({ ...activo.valores, seguroVida: e.target.checked })}
                  />
                  Tiene seguro de vida
                </label>
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

function CampoDpi({ valor, onChange }) {
  const invalido = valor && String(valor).replace(/\D/g, '').length !== 13;
  return (
    <div className="field">
      <label>DPI</label>
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        maxLength={20}
        required
        style={invalido ? { borderColor: 'var(--coral-dark)' } : undefined}
      />
      {invalido && (
        <span style={{ display: 'block', color: 'var(--coral-dark)', fontSize: 11.5, marginTop: 4 }}>
          El DPI debe tener 13 dígitos.
        </span>
      )}
    </div>
  );
}

function Campo({ label, valor }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input value={valor || '—'} disabled />
    </div>
  );
}

function Seccion({ titulo }) {
  return (
    <h4
      style={{
        color: 'var(--teal-dark)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.3,
        borderBottom: '1px solid var(--line)', paddingBottom: 6, margin: '18px 0 12px'
      }}
    >
      {titulo}
    </h4>
  );
}

// Indicador de expediente incompleto: no agrega una columna nueva a la
// tabla, va pegado al nombre y usa color + porcentaje para saltar a la
// vista sin tener que abrir cada registro.
function BadgeCompletitud({ persona }) {
  const porcentaje = calcularCompletitud(persona);
  return (
    <span
      title={`Expediente ${porcentaje}% completo`}
      style={{ color: colorCompletitud(porcentaje), fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap' }}
    >
      ({porcentaje}%)
    </span>
  );
}

function BotonSubmodal({ etiqueta, lleno, onClick }) {
  return (
    <button type="button" className={`btn btn-submodal${lleno ? ' lleno' : ''}`} style={{ width: '100%' }} onClick={onClick}>
      {lleno ? '✓ ' : ''}{etiqueta}
    </button>
  );
}

function FotoUploader({ archivo, tieneFotoGuardada, personaId, onCambiar }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 6 }}>
      <FotoPersonal personaId={personaId} tieneFoto={tieneFotoGuardada} archivoLocal={archivo} tamano={80} />
      <div style={{ display: 'flex', gap: 8 }}>
        <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
          {archivo || tieneFotoGuardada ? 'Cambiar foto' : 'Subir foto'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: 'none' }}
            onChange={(e) => onCambiar(e.target.files?.[0] || null)}
          />
        </label>
        {archivo && (
          <button type="button" className="btn btn-ghost" onClick={() => onCambiar(null)}>
            Quitar
          </button>
        )}
      </div>
    </div>
  );
}

// Documentos (DPI, recibo de luz, licencia): a diferencia de la foto,
// pueden ser PDF, así que en vez de previsualizar inline se descargan
// como blob (respetando el token de sesión) y se abren en una pestaña
// nueva — el navegador decide cómo mostrar cada tipo de archivo.
function DocumentoField({ tipo, etiqueta, personaId, subido, archivoLocal, onCambiar, soloLectura }) {
  const [cargando, setCargando] = useState(false);
  const mostrarToast = useToast();
  const cargado = subido || !!archivoLocal;

  async function verDocumento() {
    setCargando(true);
    try {
      const res = await api.get(`/personal/${personaId}/documentos/${tipo}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      window.open(url, '_blank');
    } catch {
      mostrarToast('No se pudo abrir el documento.', 'error');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="field">
      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          title={cargado ? 'Documento cargado' : 'Documento pendiente'}
          style={{
            display: 'inline-block', width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
            background: cargado ? 'var(--teal-dark)' : 'var(--coral-dark)'
          }}
        />
        {etiqueta}
      </label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {!soloLectura && (
          <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
            {archivoLocal ? 'Cambiar archivo' : subido ? 'Reemplazar' : 'Subir'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => onCambiar(e.target.files?.[0] || null)}
            />
          </label>
        )}
        {subido && personaId && (
          <button type="button" className="btn btn-ghost" onClick={verDocumento} disabled={cargando}>
            {cargando ? 'Abriendo...' : 'Ver'}
          </button>
        )}
        {!subido && soloLectura && <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>No adjuntado</span>}
        {archivoLocal && (
          <span style={{ fontSize: 11.5, color: 'var(--text-2)' }}>{archivoLocal.name}</span>
        )}
      </div>
    </div>
  );
}

// Agrupa los 12 documentos por categoría en acordeones plegables, para no
// saturar el modal con todos los campos sueltos de una — "Identificación"
// abre por defecto (es la más usada), el resto arranca cerrado.
function AcordeonDocumentos({ personaId, documentosSubidos, docArchivos, onCambiarArchivo, soloLectura }) {
  const [abiertas, setAbiertas] = useState({ 'Identificación': true });

  return (
    <div>
      {CATEGORIAS_DOCUMENTO.map((categoria) => {
        const items = TIPOS_DOCUMENTO.filter((d) => d.categoria === categoria);
        const cargados = items.filter((d) => documentosSubidos.includes(d.tipo) || docArchivos[d.tipo]).length;
        const abierta = !!abiertas[categoria];

        return (
          <div key={categoria} className="card" style={{ marginBottom: 10, padding: 14 }}>
            <div
              onClick={() => setAbiertas((a) => ({ ...a, [categoria]: !a[categoria] }))}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
              <strong style={{ fontSize: 13.5 }}>{categoria}</strong>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={`status-pill ${cargados === items.length ? 'ok' : 'pending'}`}>
                  {cargados}/{items.length} cargados
                </span>
                <span style={{ color: 'var(--text-3)' }}>{abierta ? '⌄' : '›'}</span>
              </div>
            </div>
            {abierta && (
              <div className="form-grid-3" style={{ marginTop: 12 }}>
                {items.map(({ tipo, etiqueta }) => (
                  <DocumentoField
                    key={tipo}
                    tipo={tipo}
                    etiqueta={etiqueta}
                    personaId={personaId}
                    subido={documentosSubidos.includes(tipo)}
                    archivoLocal={docArchivos[tipo]}
                    onCambiar={onCambiarArchivo ? (archivo) => onCambiarArchivo(tipo, archivo) : undefined}
                    soloLectura={soloLectura}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
