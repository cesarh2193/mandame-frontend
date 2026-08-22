import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../api/client';
import { hoyLocal, formatearFechaDisplay } from '../../utils/fecha';

export default function RevisionBoletas() {
  const { usuario } = useAuth();
  const mostrarToast = useToast();
  const hoy = hoyLocal();
  const [fecha, setFecha] = useState(hoy);
  const [sucursalId, setSucursalId] = useState('');
  const [cadTexto, setCadTexto] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [filas, setFilas] = useState(null);

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
      const res = await api.get('/informes/revision-boletas', { params: { fecha, sucursalId } });
      setFilas(res.data ?? []);
    } catch (err) {
      setFilas(null);
      mostrarToast(err?.response?.data?.error || 'No se pudo consultar el listado.', 'error');
    } finally {
      setBuscando(false);
    }
  }

  async function generarReporte() {
    setGenerandoPdf(true);
    try {
      const res = await api.get('/informes/revision-boletas/pdf', { params: { fecha, sucursalId }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `revision-boletas-${fecha}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      mostrarToast(err?.response?.data?.error || 'No se pudo generar el reporte.', 'error');
    } finally {
      setGenerandoPdf(false);
    }
  }

  const totalConBoleta = filas?.filter((f) => f.tieneBoleta).length ?? 0;

  return (
    <div>
      <h1 className="page-title">Revisión de boletas</h1>
      <p className="page-sub">Boletas ya subidas ese día por CAD, cruzadas con el cierre de turno de cada motorista.</p>

      <div className="card">
        <div className="form-grid-3">
          <div className="field">
            <label>Fecha</label>
            <input type="date" value={fecha} onChange={(e) => { setFecha(e.target.value); setFilas(null); }} />
          </div>

          <div className="field">
            <label>CAD (sucursal)</label>
            <input
              type="text"
              list="lista-cads-revision-boletas"
              placeholder="Escribe o selecciona un CAD"
              value={cadTexto}
              onChange={handleCadChange}
              onFocus={(e) => e.target.showPicker?.()}
              onClick={(e) => e.target.showPicker?.()}
              autoComplete="off"
            />
            <datalist id="lista-cads-revision-boletas">
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

      {filas !== null && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>
              {filas.length > 0 ? `${totalConBoleta} de ${filas.length} boletas cargadas` : ''}
            </div>
            {filas.length > 0 && (
              <button className="btn btn-primary" onClick={generarReporte} disabled={generandoPdf}>
                {generandoPdf ? 'Generando...' : 'Generar reporte (PDF)'}
              </button>
            )}
          </div>

          {filas.length === 0 ? (
            <p className="page-sub" style={{ marginTop: 8 }}>No hay motoristas con cierre de turno registrado para esta fecha.</p>
          ) : (
            <div className="grid-boletas">
              {filas.map((f, i) => (
                <TarjetaBoleta key={`${f.motoristaId}-${i}`} fila={f} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TarjetaBoleta({ fila }) {
  const mostrarToast = useToast();
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!fila.tieneBoleta) return undefined;
    let objectUrl;
    let cancelado = false;
    api.get(`/boleta-imagen/${fila.motoristaId}/archivo`, { params: { fecha: fila.fecha }, responseType: 'blob' })
      .then((res) => {
        if (cancelado) return;
        objectUrl = window.URL.createObjectURL(res.data);
        setUrl(objectUrl);
      })
      .catch(() => { if (!cancelado) setError(true); });
    return () => {
      cancelado = true;
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fila.motoristaId, fila.fecha, fila.tieneBoleta]);

  function verCompleta() {
    if (!url) {
      mostrarToast('La imagen todavía se está cargando.', 'error');
      return;
    }
    window.open(url, '_blank');
  }

  return (
    <div className="card">
      {fila.tieneBoleta ? (
        error ? (
          <div className="boleta-sin-cargar">No se pudo cargar la imagen</div>
        ) : url ? (
          <img src={url} alt={`Boleta de ${fila.nombre}`} className="boleta-miniatura" onClick={verCompleta} />
        ) : (
          <div className="boleta-sin-cargar">Cargando...</div>
        )
      ) : (
        <div className="boleta-sin-cargar">Sin boleta cargada</div>
      )}

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{fila.codigo} — {fila.nombre}</div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
          {formatearFechaDisplay(fila.fecha)} · Repartos: {fila.cantidadRepartos ?? 0}
        </div>
        {fila.tieneBoleta && (
          <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={verCompleta}>
            Ver completa
          </button>
        )}
      </div>
    </div>
  );
}
