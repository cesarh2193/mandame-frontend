import { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../api/client';
import { hoyLocal } from '../../utils/fecha';

export default function SubirBoleta() {
  const { usuario } = useAuth();
  const mostrarToast = useToast();
  const hoy = hoyLocal();
  const [fecha, setFecha] = useState(hoy);
  const [sucursalId, setSucursalId] = useState('');
  const [cadTexto, setCadTexto] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [motoristas, setMotoristas] = useState(null);
  const [subiendoId, setSubiendoId] = useState(null);
  const [viendoId, setViendoId] = useState(null);
  const inputArchivoRef = useRef(null);
  const motoristaObjetivoRef = useRef(null);

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

  function iniciarSubida(motoristaId) {
    motoristaObjetivoRef.current = motoristaId;
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

  return (
    <div>
      <h1 className="page-title">Subir boleta</h1>
      <p className="page-sub">
        Sube la imagen de la boleta de cada motorista con asistencia y cierre de turno autorizado
        en la fecha y CAD elegidos. Se guarda en el servidor y, si está configurado, también en Google Drive.
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
                              onClick={() => iniciarSubida(id)}
                              disabled={subiendoId === id}
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
