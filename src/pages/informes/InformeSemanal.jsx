import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../api/client';
import { semanaActualISO } from '../../utils/fecha';

// Formatea un número de dinero con 2 decimales, o "—" si viene vacío.
function q(valor) {
  return valor === null || valor === undefined ? '—' : `Q${Number(valor).toFixed(2)}`;
}

export default function InformeSemanal() {
  const { usuario } = useAuth();
  const mostrarToast = useToast();
  const [semanaISO, setSemanaISO] = useState(semanaActualISO());
  const [sucursalId, setSucursalId] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [generandoExcel, setGenerandoExcel] = useState(false);
  const [filas, setFilas] = useState(null);
  const [paginacion, setPaginacion] = useState(null);
  const [pagina, setPagina] = useState(1);

  // <input type="week"> entrega "2026-W38": lo partimos en año + semana.
  function parametrosSemana() {
    const [anio, semana] = semanaISO.split('-W');
    return { anio: Number(anio), semana: Number(semana) };
  }

  function semanaValida() {
    if (!semanaISO) {
      mostrarToast('Selecciona la semana a consultar.', 'error');
      return false;
    }
    return true;
  }

  async function buscar(paginaABuscar = 1) {
    if (!semanaValida()) return;
    const { anio, semana } = parametrosSemana();

    setBuscando(true);
    try {
      const res = await api.get('/informes/semanal/preview', {
        params: { anio, semana, sucursalId: sucursalId || undefined, pagina: paginaABuscar }
      });
      setFilas(res.data?.filas ?? []);
      setPaginacion(res.data ?? null);
      setPagina(paginaABuscar);
    } catch (err) {
      setFilas(null);
      setPaginacion(null);
      mostrarToast(err?.response?.data?.error || 'No se pudo consultar el informe semanal.', 'error');
    } finally {
      setBuscando(false);
    }
  }

  function irAPagina(nuevaPagina) {
    if (!paginacion || nuevaPagina < 1 || nuevaPagina > paginacion.totalPaginas) return;
    buscar(nuevaPagina);
  }

  async function exportarExcel() {
    if (!semanaValida()) return;
    const { anio, semana } = parametrosSemana();

    setGenerandoExcel(true);
    try {
      const res = await api.get('/informes/semanal/excel', {
        params: { anio, semana, sucursalId: sucursalId || undefined },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `informe-semanal-semana-${semana}-${anio}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      mostrarToast(err?.response?.data?.error || 'No se pudo generar el Excel.', 'error');
    } finally {
      setGenerandoExcel(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Informe semanal</h1>
      <p className="page-sub">
        Pago semanal por motorista (días laborados, horas y total con IVA), para un CAD o para todos los que
        tengas acceso. Selecciona la semana y exporta el detalle en Excel.
      </p>

      <div className="card">
        <div className="form-grid-3">
          <div className="field">
            <label>Semana</label>
            <input type="week" value={semanaISO} onChange={(e) => { setSemanaISO(e.target.value); setFilas(null); setPaginacion(null); }} />
          </div>

          <div className="field">
            <label>CAD (sucursal)</label>
            <select value={sucursalId} onChange={(e) => { setSucursalId(e.target.value); setFilas(null); setPaginacion(null); }}>
              <option value="">Todos los CAD a los que tengo acceso</option>
              {usuario?.sucursales?.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
          <button className="btn btn-submodal" onClick={() => buscar(1)} disabled={buscando || !semanaISO}>
            {buscando ? 'Buscando...' : 'Buscar'}
          </button>
          <button className="btn btn-primary" onClick={exportarExcel} disabled={generandoExcel || !semanaISO}>
            {generandoExcel ? 'Generando...' : 'Exportar Excel'}
          </button>
        </div>
      </div>

      {filas !== null && (
        <div className="card" style={{ marginTop: 16 }}>
          {filas.length === 0 ? (
            <p className="page-sub">No hay motoristas con cierre de turno autorizado en esta semana.</p>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th className="col-ocultar-movil">CAD</th>
                      <th className="col-ocultar-movil">Tienda</th>
                      <th>Nombre</th>
                      <th className="col-ocultar-movil">Licencia</th>
                      <th>Días laborados</th>
                      <th className="col-ocultar-movil">Tarifa sin IVA</th>
                      <th className="col-ocultar-movil">Horas trabajadas</th>
                      <th>Total sin IVA</th>
                      <th className="col-ocultar-movil">IVA (12%)</th>
                      <th>Total general</th>
                      <th className="col-ocultar-movil">Tipo de plaza</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((fila, idx) => (
                      <tr key={`${fila.motoristaId}-${fila.codigoCad}-${idx}`}>
                        <td className="col-ocultar-movil">{fila.codigoCad}</td>
                        <td className="col-ocultar-movil">{fila.sucursal}</td>
                        <td>{fila.nombre}</td>
                        <td className="col-ocultar-movil">{fila.licencia || '—'}</td>
                        <td>{fila.totalDiasLaborados}</td>
                        <td className="col-ocultar-movil">{q(fila.tarifaSinIva)}</td>
                        <td className="col-ocultar-movil">{fila.totalHorasTrabajadas.toFixed(2)}</td>
                        <td>{q(fila.totalGeneralSinIva)}</td>
                        <td className="col-ocultar-movil">{q(fila.totalGeneralIva)}</td>
                        <td>{q(fila.totalGeneral)}</td>
                        <td className="col-ocultar-movil">{fila.tipoPlaza}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: 8, marginTop: 12
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>
                  Total motoristas: {paginacion?.total ?? filas.length}
                </span>
                {paginacion?.totalPaginas > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      className="btn btn-ghost"
                      onClick={() => irAPagina(pagina - 1)}
                      disabled={buscando || pagina <= 1}
                    >
                      Anterior
                    </button>
                    <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                      Página {pagina} de {paginacion.totalPaginas}
                    </span>
                    <button
                      className="btn btn-ghost"
                      onClick={() => irAPagina(pagina + 1)}
                      disabled={buscando || pagina >= paginacion.totalPaginas}
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
