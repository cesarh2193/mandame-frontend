import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../api/client';
import { hoyLocal } from '../../utils/fecha';

export default function Boleta() {
  const { usuario } = useAuth();
  const mostrarToast = useToast();
  const hoy = hoyLocal();
  const [fecha, setFecha] = useState(hoy);
  const [sucursalId, setSucursalId] = useState('');
  const [cadTexto, setCadTexto] = useState('');
  const [motoristas, setMotoristas] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [generandoBlanco, setGenerandoBlanco] = useState(false);
  const [esMovil, setEsMovil] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setEsMovil(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const todosSeleccionados = useMemo(
    () => motoristas.length > 0 && seleccionados.length === motoristas.length,
    [motoristas, seleccionados]
  );

  useEffect(() => {
    let activo = true;

    async function cargarMotoristas() {
      if (!fecha || !sucursalId) {
        if (activo) {
          setMotoristas([]);
          setSeleccionados([]);
        }
        return;
      }

      try {
        const res = await api.get('/informes/boleta/motoristas', { params: { fecha, sucursalId } });
        if (!activo) return;

        const lista = res.data ?? [];
        setMotoristas(lista);
        setSeleccionados(lista.map((m) => Number(m.motoristaId)));
      } catch {
        if (activo) {
          setMotoristas([]);
          setSeleccionados([]);
        }
      }
    }

    cargarMotoristas();
    return () => { activo = false; };
  }, [fecha, sucursalId]);

  function toggleSeleccion(motoristaId) {
    setSeleccionados((prev) => {
      const existe = prev.includes(motoristaId);
      if (existe) return prev.filter((id) => id !== motoristaId);
      return [...prev, motoristaId];
    });
  }

  function marcarTodos() {
    if (todosSeleccionados) {
      setSeleccionados([]);
      return;
    }

    setSeleccionados(motoristas.map((m) => Number(m.motoristaId)));
  }

  function handleCadChange(e) {
    const valor = e.target.value;
    setCadTexto(valor);
    const match = usuario?.sucursales?.find(
      (s) => s.nombre.trim().toLowerCase() === valor.trim().toLowerCase()
    );
    setSucursalId(match ? String(match.id) : '');
  }

  async function generarNueva() {
    setGenerandoBlanco(true);
    try {
      const params = { fecha, sucursalId, motoristaIds: seleccionados.join(',') };
      const res = await api.get('/informes/boleta-nueva', {
        params,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `boletas-${fecha}${seleccionados.length ? `-${seleccionados.length}motoristas` : ''}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      mostrarToast(err?.response?.data?.error || 'No se pudo generar la boleta.', 'error');
    } finally {
      setGenerandoBlanco(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Boletas cierre</h1>
      <p className="page-sub">
        Genera la boleta impresa solo de los motoristas con asignación y cierre de turno autorizado
        en la fecha y CAD elegidos. Puedes imprimir todos o solo los seleccionados.
      </p>

      <div className="card">
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="field">
            <label>Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="field">
            <label>CAD (sucursal)</label>
            <input
              type="text"
              list="lista-cads"
              placeholder="Escribe o selecciona un CAD"
              value={cadTexto}
              onChange={handleCadChange}
              onFocus={(e) => e.target.showPicker?.()}
              onClick={(e) => e.target.showPicker?.()}
              autoComplete="off"
            />
            <datalist id="lista-cads">
              {usuario?.sucursales?.map((s) => <option key={s.id} value={s.nombre} />)}
            </datalist>
          </div>
        </div>

        {sucursalId && (
          <div className="field" style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
              <label style={{ margin: 0 }}>Motoristas</label>
              <button
                type="button"
                className={`btn ${todosSeleccionados ? 'btn-primary' : 'btn-secondary'}`}
                onClick={marcarTodos}
                disabled={!motoristas.length}
              >
                {todosSeleccionados ? 'Quitar todos' : 'Todos'}
              </button>
            </div>

            {!motoristas.length && (
              <div style={{ color: 'var(--text-3)' }}>No hay motoristas con cierre de turno para este CAD y fecha.</div>
            )}

            {motoristas.length > 0 && (
              <div style={{ display: 'grid', gap: 8 }}>
                {!esMovil && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '44px 2fr 0.8fr 1fr 1fr',
                      gap: 12,
                      padding: '8px 10px',
                      fontWeight: 700,
                      color: 'var(--text-2)',
                      fontSize: 12,
                      background: 'rgba(15, 23, 42, 0.035)',
                      borderRadius: 8,
                      border: '1px solid var(--line)'
                    }}
                  >
                    <span></span>
                    <span>Nombre</span>
                    <span>Repartos</span>
                    <span>Hora inicio</span>
                    <span>Hora final</span>
                  </div>
                )}

                {motoristas.map((m) => {
                  const id = Number(m.motoristaId);
                  const marcado = seleccionados.includes(id);
                  const horas = m.minutosTrabajados != null ? `${(Number(m.minutosTrabajados) / 60).toFixed(1)} h` : '—';

                  return (
                    <div
                      key={id}
                      style={{
                        display: 'grid',
                        alignItems: 'center',
                        gap: 12,
                        gridTemplateColumns: esMovil ? '44px 1.5fr auto' : '44px 2fr 0.8fr 1fr 1fr',
                        padding: esMovil ? '12px 14px' : '10px 12px',
                        border: '1px solid var(--line)',
                        borderRadius: '12px',
                        background: '#fff',
                        boxShadow: esMovil ? '0 2px 8px rgba(15, 23, 42, 0.06)' : '0 1px 0 rgba(0,0,0,0.03)'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() => toggleSeleccion(id)}
                      />
                      <span style={{
                        fontSize: esMovil ? 13 : 14,
                        lineHeight: 1.35,
                        wordBreak: 'break-word',
                        fontWeight: esMovil ? 600 : 500,
                        color: 'var(--text-1)',
                        textAlign: esMovil ? 'left' : 'left'
                      }}>{m.nombre}</span>
                      {esMovil ? (
                        <span style={{ fontSize: 13, color: 'var(--text-2)', textAlign: 'right', whiteSpace: 'nowrap' }}>{horas}</span>
                      ) : (
                        <>
                          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{m.repartos ?? '—'}</span>
                          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{m.horaInicio || '—'}</span>
                          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{m.horaFinal || '—'}</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={generarNueva} disabled={generandoBlanco || !sucursalId}>
            {generandoBlanco ? 'Generando...' : 'Nueva boleta'}
          </button>
        </div>
      </div>
    </div>
  );
}
