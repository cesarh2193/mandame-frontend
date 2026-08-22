import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../api/client';
import { hoyLocal } from '../../utils/fecha';

export default function SubirBoleta() {
  const { usuario } = useAuth();
  const mostrarToast = useToast();
  const hoy = hoyLocal();
  // Un usuario con solo el rol Motorista ve esta misma pantalla como "su"
  // Boletas cierre: nada más su propio CAD, sin tener que buscarlo a mano.
  const esMotoristaPuro = (usuario?.roles ?? []).length > 0 && (usuario?.roles ?? []).every((r) => r === 'Motorista');
  const unicaSucursal = usuario?.sucursales?.length === 1 ? usuario.sucursales[0] : null;
  const [fecha, setFecha] = useState(hoy);
  const [sucursalId, setSucursalId] = useState(esMotoristaPuro && unicaSucursal ? String(unicaSucursal.id) : '');
  const [cadTexto, setCadTexto] = useState(esMotoristaPuro && unicaSucursal ? unicaSucursal.nombre : '');
  const [buscando, setBuscando] = useState(false);
  const [motoristas, setMotoristas] = useState(null);
  const [subiendoId, setSubiendoId] = useState(null);
  const [viendoId, setViendoId] = useState(null);
  const [generandoLink, setGenerandoLink] = useState(false);
  const [linkGenerado, setLinkGenerado] = useState('');
  const [copiado, setCopiado] = useState(false);
  const inputArchivoRef = useRef(null);
  const motoristaObjetivoRef = useRef(null);

  useEffect(() => {
    if (esMotoristaPuro && unicaSucursal) {
      buscar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCadChange(e) {
    const valor = e.target.value;
    setCadTexto(valor);
    const match = usuario?.sucursales?.find(
      (s) => s.nombre.trim().toLowerCase() === valor.trim().toLowerCase()
    );
    setSucursalId(match ? String(match.id) : '');
  }

  async function buscar() {
    if (!fecha || !sucursalId) {
      mostrarToast('Selecciona una fecha y un CAD.', 'error');
      return;
    }

    setBuscando(true);
    try {
      const res = await api.get('/boleta-imagen', { params: { fecha, sucursalId } });
      setMotoristas(res.data ?? []);
    } catch (err) {
      setMotoristas(null);
      mostrarToast(err?.response?.data?.error || 'No se pudo consultar el listado.', 'error');
    } finally {
      setBuscando(false);
    }
  }

  function iniciarSubida(motorista) {
    if (motorista.estado === 'CARGADA') {
      const confirmado = window.confirm(
        `Ya existe una boleta cargada para ${motorista.nombre} en esta fecha. ` +
        'Si subís otra, la anterior queda guardada como copia (reemplazada) y esta nueva pasa a ser la boleta activa.\n\n' +
        '¿Deseás reemplazarla?'
      );
      if (!confirmado) return;
    }

    motoristaObjetivoRef.current = Number(motorista.motoristaId);
    inputArchivoRef.current?.click();
  }

  async function onArchivoSeleccionado(e) {
    const archivo = e.target.files?.[0];
    const motoristaId = motoristaObjetivoRef.current;
    e.target.value = '';
    if (!archivo || motoristaId == null) return;

    setSubiendoId(motoristaId);
    try {
      const formData = new FormData();
      formData.append('imagen', archivo);
      await api.post(`/boleta-imagen/${motoristaId}`, formData, {
        params: { fecha, sucursalId },
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMotoristas((prev) => prev?.map((m) => (
        Number(m.motoristaId) === motoristaId ? { ...m, estado: 'CARGADA' } : m
      )) ?? prev);
      mostrarToast('Boleta cargada correctamente.');
    } catch (err) {
      mostrarToast(err?.response?.data?.error || 'No se pudo subir la boleta.', 'error');
    } finally {
      setSubiendoId(null);
    }
  }

  async function generarLink() {
    if (!sucursalId) {
      mostrarToast('Selecciona un CAD primero.', 'error');
      return;
    }
    setGenerandoLink(true);
    setCopiado(false);
    try {
      const res = await api.post('/boletas/generar-link', { sucursalId, fecha: hoy });
      setLinkGenerado(`${window.location.origin}/subir-boleta?token=${res.data.token}`);
    } catch (err) {
      mostrarToast(err?.response?.data?.error || 'No se pudo generar el link.', 'error');
    } finally {
      setGenerandoLink(false);
    }
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(linkGenerado);
      setCopiado(true);
    } catch {
      mostrarToast('No se pudo copiar. Copialo manualmente.', 'error');
    }
  }

  async function verBoleta(motoristaId) {
    setViendoId(motoristaId);
    try {
      const res = await api.get(`/boleta-imagen/${motoristaId}/archivo`, {
        params: { fecha },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(res.data);
      window.open(url, '_blank');
    } catch (err) {
      mostrarToast(err?.response?.data?.error || 'No se pudo abrir la boleta.', 'error');
    } finally {
      setViendoId(null);
    }
  }

  const totalCargadas = motoristas?.filter((m) => m.estado === 'CARGADA').length ?? 0;
  const esAdmin = (usuario?.roles ?? []).includes('Admin');
  // Por seguridad, subir o reemplazar una boleta solo se permite el
  // mismo día — salvo Administrador, que sí puede corregir boletas de
  // otra fecha. El backend también lo valida, esto es solo para no
  // dejar que el resto de roles ni siquiera intente con una fecha pasada.
  const puedeSubir = fecha === hoy || esAdmin;

  return (
    <div>
      <h1 className="page-title">{esMotoristaPuro ? 'Boletas cierre' : 'Subir boleta'}</h1>
      <p className="page-sub">
        {esMotoristaPuro
          ? 'Sube la foto de tu boleta del día. Se guarda en el servidor y, si está configurado, también en Google Drive.'
          : 'Sube la imagen de la boleta de cada motorista con asistencia y cierre de turno autorizado ' +
            'en la fecha y CAD elegidos. Se guarda en el servidor y, si está configurado, también en Google Drive.'}
      </p>

      <div className="card">
        <div className="form-grid-3">
          <div className="field">
            <label>Fecha</label>
            <input type="date" value={fecha} onChange={(e) => { setFecha(e.target.value); setMotoristas(null); }} />
          </div>

          <div className="field">
            <label>CAD (sucursal)</label>
            <input
              type="text"
              list="lista-cads-subir-boleta"
              placeholder="Escribe o selecciona un CAD"
              value={cadTexto}
              onChange={handleCadChange}
              onFocus={(e) => e.target.showPicker?.()}
              onClick={(e) => e.target.showPicker?.()}
              autoComplete="off"
            />
            <datalist id="lista-cads-subir-boleta">
              {usuario?.sucursales?.map((s) => <option key={s.id} value={s.nombre} />)}
            </datalist>
          </div>

          <div className="field" style={{ display: 'flex', alignItems: 'end' }}>
            <button className="btn btn-submodal" onClick={buscar} disabled={buscando || !fecha || !sucursalId} style={{ flex: 1 }}>
              {buscando ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>
      </div>

      {!esMotoristaPuro && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <strong style={{ fontSize: 13.5 }}>Link para compartir por WhatsApp</strong>
              <p className="page-sub" style={{ margin: '2px 0 0' }}>
                Un motorista puede subir su propia boleta de hoy sin necesitar cuenta, entrando con este link. Vence a las 48 horas.
              </p>
            </div>
            <button className="btn btn-ghost" onClick={generarLink} disabled={generandoLink || !sucursalId}>
              {generandoLink ? 'Generando...' : 'Generar link para compartir hoy'}
            </button>
          </div>
          {linkGenerado && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
              <input value={linkGenerado} readOnly style={{ flex: 1, minWidth: 220 }} onFocus={(e) => e.target.select()} />
              <button className="btn btn-primary" onClick={copiarLink}>
                {copiado ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          )}
        </div>
      )}

      <input
        ref={inputArchivoRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={onArchivoSeleccionado}
      />

      {motoristas !== null && (
        <div className="card" style={{ marginTop: 16 }}>
          {motoristas.length === 0 ? (
            <p className="page-sub">No hay motoristas con asistencia y cierre de turno para esta fecha.</p>
          ) : (
            <>
              <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>
                {totalCargadas} de {motoristas.length} boletas cargadas
              </div>
              {!puedeSubir && (
                <p style={{ color: 'var(--amber-dark)', background: 'var(--amber-light)', padding: '10px 12px', borderRadius: 8, fontSize: 12.5, marginBottom: 12 }}>
                  Estás viendo una fecha distinta a hoy: solo se puede consultar (Ver boleta). Subir o reemplazar una
                  boleta solo está permitido el mismo día.
                </p>
              )}
              <table>
                <thead>
                  <tr>
                    <th className="col-ocultar-movil">Código</th>
                    <th>Nombre</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {motoristas.map((m) => {
                    const id = Number(m.motoristaId);
                    const cargada = m.estado === 'CARGADA';

                    return (
                      <tr key={id}>
                        <td className="col-ocultar-movil">{m.codigo}</td>
                        <td>{m.nombre}</td>
                        <td>
                          <span className={`status-pill ${cargada ? 'ok' : 'pending'}`}>
                            {cargada ? 'Cargada' : 'Pendiente'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button
                              className="btn btn-secondary"
                              onClick={() => iniciarSubida(m)}
                              disabled={!puedeSubir || subiendoId === id}
                              title={!puedeSubir ? 'Solo se puede subir o reemplazar la boleta del día de hoy.' : undefined}
                            >
                              {subiendoId === id ? 'Subiendo...' : 'Subir boleta'}
                            </button>
                            <button
                              className="btn btn-ghost"
                              onClick={() => verBoleta(id)}
                              disabled={!cargada || viendoId === id}
                            >
                              {viendoId === id ? 'Abriendo...' : 'Ver boleta'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
