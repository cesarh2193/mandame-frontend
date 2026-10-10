import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../api/client';

function colorPorcentaje(porcentaje) {
  if (porcentaje === 100) return 'var(--teal-dark)';
  if (porcentaje >= 50) return 'var(--amber-dark)';
  return 'var(--coral-dark)';
}

export default function DocumentosMotoristas() {
  const { usuario } = useAuth();
  const mostrarToast = useToast();
  const [sucursalId, setSucursalId] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [generandoExcel, setGenerandoExcel] = useState(false);
  const [filas, setFilas] = useState(null);
  const [expandido, setExpandido] = useState(null);

  async function buscar() {
    setBuscando(true);
    try {
      const res = await api.get('/informes/documentos-motoristas/preview', {
        params: { sucursalId: sucursalId || undefined }
      });
      setFilas(res.data ?? []);
    } catch (err) {
      setFilas(null);
      mostrarToast(err?.response?.data?.error || 'No se pudo consultar el informe.', 'error');
    } finally {
      setBuscando(false);
    }
  }

  async function exportarExcel() {
    setGenerandoExcel(true);
    try {
      const res = await api.get('/informes/documentos-motoristas/excel', {
        params: { sucursalId: sucursalId || undefined },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'documentos-motoristas.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      mostrarToast(err?.response?.data?.error || 'No se pudo generar el Excel.', 'error');
    } finally {
      setGenerandoExcel(false);
    }
  }

  const promedio = filas?.length
    ? Math.round(filas.reduce((suma, f) => suma + f.porcentaje, 0) / filas.length)
    : null;

  return (
    <div>
      <h1 className="page-title">Documentos motoristas</h1>
      <p className="page-sub">
        Por CAD y motorista: cuántos de los documentos del expediente ya están cargados y cuáles faltan.
      </p>

      <div className="card">
        <div className="form-grid-3">
          <div className="field">
            <label>CAD (sucursal)</label>
            <select value={sucursalId} onChange={(e) => { setSucursalId(e.target.value); setFilas(null); }}>
              <option value="">Todos los CAD a los que tengo acceso</option>
              {usuario?.sucursales?.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
          <button className="btn btn-submodal" onClick={buscar} disabled={buscando}>
            {buscando ? 'Buscando...' : 'Buscar'}
          </button>
          <button className="btn btn-primary" onClick={exportarExcel} disabled={generandoExcel}>
            {generandoExcel ? 'Generando...' : 'Exportar Excel'}
          </button>
        </div>
      </div>

      {filas !== null && (
        <div className="card" style={{ marginTop: 16 }}>
          {filas.length === 0 ? (
            <p className="page-sub">No hay motoristas activos para este CAD.</p>
          ) : (
            <>
              <div style={{ marginBottom: 14, fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>
                {filas.length} motorista{filas.length === 1 ? '' : 's'} — promedio de completitud: {promedio}%
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filas.map((f) => {
                  const abierto = expandido === f.personaId;
                  return (
                    <div key={f.personaId} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 12 }}>
                      <div
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, cursor: 'pointer', flexWrap: 'wrap' }}
                        onClick={() => setExpandido(abierto ? null : f.personaId)}
                      >
                        <div>
                          <strong>{f.nombre}</strong>{' '}
                          <small style={{ color: 'var(--text-3)' }}>
                            {f.codigo} · {f.codigoCad} {f.sucursal}
                          </small>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                            {f.documentosCargados}/{f.totalDocumentos} documentos
                          </span>
                          <span style={{ fontWeight: 800, fontSize: 14, color: colorPorcentaje(f.porcentaje) }}>
                            {f.porcentaje}%
                          </span>
                        </div>
                      </div>
                      <div style={{ height: 6, background: 'var(--line)', borderRadius: 4, marginTop: 8, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${f.porcentaje}%`, background: colorPorcentaje(f.porcentaje) }} />
                      </div>
                      {abierto && (
                        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--coral-dark)', textTransform: 'uppercase', marginBottom: 6 }}>
                              Faltan ({f.documentosFaltantes})
                            </div>
                            {f.detalleFaltantes.length === 0 ? (
                              <p style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Ninguno — expediente completo.</p>
                            ) : (
                              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: 'var(--text-2)' }}>
                                {f.detalleFaltantes.map((d) => <li key={d}>{d}</li>)}
                              </ul>
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--teal-dark)', textTransform: 'uppercase', marginBottom: 6 }}>
                              Ya subidos ({f.documentosCargados})
                            </div>
                            {f.detalleCargados.length === 0 ? (
                              <p style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Ninguno todavía.</p>
                            ) : (
                              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: 'var(--text-2)' }}>
                                {f.detalleCargados.map((d) => <li key={d}>{d}</li>)}
                              </ul>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
