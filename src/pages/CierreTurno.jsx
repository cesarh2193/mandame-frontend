import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useEnTurno, useTarifas, useCerrarTurno, useRepartosAutorizados, useRevertirCierre } from '../api/hooks';
import { hoyLocal } from '../utils/fecha';

function pad(n) {
  return String(n).padStart(2, '0');
}

// Formato "YYYY-MM-DDTHH:mm" en hora LOCAL (no usar toISOString: eso
// convierte a UTC y desfasa la hora que ve el usuario en el input).
function aInputLocal(fecha) {
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`;
}

export default function CierreTurno() {
  const { usuario } = useAuth();
  const mostrarToast = useToast();
  const hoy = hoyLocal();
  const [sucursalId, setSucursalId] = useState(usuario?.sucursales?.[0]?.id ?? '');
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(null);
  const [esMovil, setEsMovil] = useState(() => window.matchMedia('(max-width: 860px)').matches);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 860px)');
    const onChange = () => setEsMovil(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const puedeRevertir = (usuario?.roles ?? []).some((r) => ['Admin', 'Supervisor'].includes(r));
  const { data: enTurno } = useEnTurno(sucursalId);
  const { data: tarifas } = useTarifas();
  const cerrarTurno = useCerrarTurno();
  const { data: autorizadosHoy } = useRepartosAutorizados(sucursalId, hoy);
  const revertirCierre = useRevertirCierre();

  function revertir(repartoId, nombre) {
    if (!window.confirm(`¿Revertir el cierre de turno de ${nombre}? Vuelve a aparecer "en turno" para cerrarse de nuevo.`)) return;
    revertirCierre.mutate(repartoId, {
      onSuccess: () => mostrarToast(`Cierre de ${nombre} revertido. Ya puede cerrarse de nuevo.`),
      onError: (err) => mostrarToast(err?.response?.data?.error || 'No se pudo revertir el cierre.', 'error')
    });
  }

  const filtrados = useMemo(
    () => (enTurno ?? []).filter((m) => m.nombre.toLowerCase().includes(busqueda.toLowerCase())),
    [enTurno, busqueda]
  );

  return (
    <div>
      <h1 className="page-title">Cierre de turno</h1>
      <span className="status-pill pending" style={{ display: 'inline-block', marginBottom: 10 }}>
        Un solo paso: ingreso/salida + repartos + autorización
      </span>

      {usuario?.sucursales?.length > 1 && (
        <div className="field" style={{ maxWidth: 320, marginBottom: 14 }}>
          <label>CAD (sucursal)</label>
          <select value={sucursalId} onChange={(e) => setSucursalId(e.target.value)}>
            {usuario.sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
      )}
      <div className="field" style={{ maxWidth: 360, marginBottom: 14 }}>
        <label>Buscar motorista</label>
        <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre del motorista..." />
      </div>

      {filtrados.map((m) => (
        <TarjetaCierre
          key={m.asignacionId}
          motorista={m}
          tarifas={tarifas ?? []}
          abierto={abierto === m.asignacionId}
          onToggle={() => setAbierto(abierto === m.asignacionId ? null : m.asignacionId)}
          onGuardar={(payload) =>
            cerrarTurno.mutate(
              { asignacionId: m.asignacionId, ...payload },
              {
                onSuccess: (data) => {
                  setAbierto(null);
                  mostrarToast(
                    data.autorizado
                      ? `Turno de ${m.nombre} cerrado y autorizado.`
                      : `Turno de ${m.nombre} cerrado. Queda pendiente de autorización.`
                  );
                },
                onError: (err) => mostrarToast(err?.response?.data?.error || 'No se pudo guardar el cierre de turno.', 'error')
              }
            )
          }
          guardando={cerrarTurno.isPending}
          mostrarToast={mostrarToast}
        />
      ))}

      <div className="card">
        <h2>Autorizados hoy (consulta)</h2>
        <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
          Modo consulta: se autorizan al guardar el cierre, ya no se puede modificar ni volver a marcar.
        </p>
        {esMovil ? (
          <div className="mobile-cierre-list">
            {autorizadosHoy?.map((a) => (
              <div key={a.repartoId} className="mobile-cierre-card">
                <div className="mobile-cierre-top">
                  <div className="mobile-cierre-name">{a.nombre}</div>
                  {puedeRevertir && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => revertir(a.repartoId, a.nombre)}
                      disabled={revertirCierre.isPending}
                    >
                      Revertir
                    </button>
                  )}
                </div>
                <div className="mobile-cierre-stats">
                  <div className="mobile-cierre-stat">
                    <span className="mobile-cierre-label">Entregas</span>
                    <span className="mobile-cierre-value">{a.entregas}</span>
                  </div>
                  <div className="mobile-cierre-stat">
                    <span className="mobile-cierre-label">Ingreso</span>
                    <span className="mobile-cierre-value">{a.horaIngreso}</span>
                  </div>
                  <div className="mobile-cierre-stat">
                    <span className="mobile-cierre-label">Salida</span>
                    <span className="mobile-cierre-value">{a.horaSalida}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table className="tabla-compacta">
            <thead>
              <tr>
                <th>Motorista</th><th>Entregas</th><th>Fecha ingreso</th><th>Fecha de salida</th>
                {puedeRevertir && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {autorizadosHoy?.map((a) => (
                <tr key={a.repartoId}>
                  <td>{a.nombre}</td>
                  <td>{a.entregas}</td>
                  <td>{a.horaIngreso}</td>
                  <td>{a.horaSalida}</td>
                  {puedeRevertir && (
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => revertir(a.repartoId, a.nombre)}
                        disabled={revertirCierre.isPending}
                      >
                        Revertir
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Tarifa por defecto para un motorista: la tarifa activa cuyo tipo
// coincide con su tipo de contrato (Fijo/Turno), sin contar las
// variantes de "ASUETO" (esas se eligen a mano solo cuando aplica) ni
// las de tipo MIXTO (ej. "Hora extra", que no es una tarifa por día).
// Es solo una sugerencia para agilizar: el campo se puede cambiar
// libremente, no se restringe ninguna opción.
function tarifaPorDefecto(tarifas, tipoMotorista) {
  if (!tipoMotorista) return null;
  return tarifas.find((t) => t.tipo === tipoMotorista && !t.descripcion?.toUpperCase().includes('ASUETO')) ?? null;
}

function TarjetaCierre({ motorista, tarifas, abierto, onToggle, onGuardar, guardando, mostrarToast }) {
  const [cantidad, setCantidad] = useState(0);
  const [tarifaId, setTarifaId] = useState(tarifaPorDefecto(tarifas, motorista.tipoMotorista)?.id ?? tarifas[0]?.id ?? '');

  // Esta tarjeta se monta apenas carga la lista "en turno", que puede
  // resolver antes que useTarifas() — si eso pasa, el useState de
  // arriba queda fijo en '' para siempre (el inicializador solo corre
  // una vez), aunque las tarifas ya hayan llegado. Este efecto lo
  // corrige apenas hay tarifas disponibles y todavía no se eligió
  // ninguna — eligiendo la tarifa según el tipo de motorista (Fijo/Turno)
  // cuando se puede, para no dejar el <select> "viéndose" seleccionado
  // con la primera opción mientras por dentro el valor real sigue vacío.
  useEffect(() => {
    if (!tarifaId && tarifas.length > 0) {
      setTarifaId(tarifaPorDefecto(tarifas, motorista.tipoMotorista)?.id ?? tarifas[0].id);
    }
  }, [tarifas, tarifaId, motorista.tipoMotorista]);

  const ahora = new Date();
  const hoy = aInputLocal(ahora).slice(0, 10);
  const [horaIngreso, setHoraIngreso] = useState(`${hoy}T${motorista.horaIngreso || '00:00'}`);
  const [horaSalida, setHoraSalida] = useState(aInputLocal(ahora));

  function submit(e) {
    e.preventDefault();
    if (!(Number(cantidad) > 0)) {
      mostrarToast('La cantidad de repartos tiene que ser mayor a 0 para guardar el cierre.', 'error');
      return;
    }
    onGuardar({
      cantidadEntregas: Number(cantidad),
      tarifaId: Number(tarifaId),
      horaIngreso: `${horaIngreso.replace('T', ' ')}:00`,
      horaSalida: `${horaSalida.replace('T', ' ')}:00`
    });
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={onToggle}>
        <div>
          <strong>{motorista.nombre}</strong>{' '}
          <small style={{ color: 'var(--text-3)' }}>
            {motorista.sucursal} · ingresó {motorista.horaIngreso}
          </small>
        </div>
        <button type="button" className="btn btn-ghost">{abierto ? 'Cerrar' : 'Cerrar turno'}</button>
      </div>

      {abierto && (
        <form onSubmit={submit} style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          <div className="form-grid">
            <div className="field">
              <label>Fecha y hora de ingreso</label>
              <input type="datetime-local" value={horaIngreso} onChange={(e) => setHoraIngreso(e.target.value)} required />
            </div>
            <div className="field">
              <label>Fecha y hora de salida</label>
              <input type="datetime-local" value={horaSalida} onChange={(e) => setHoraSalida(e.target.value)} required />
            </div>
            <div className="field">
              <label>Cantidad de repartos</label>
              <input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} required />
            </div>
            <div className="field">
              <label>Tarifa aplicable</label>
              <select value={tarifaId} onChange={(e) => setTarifaId(e.target.value)} required>
                <option value="" disabled>Selecciona...</option>
                {tarifas.map((t) => <option key={t.id} value={t.id}>{t.descripcion}</option>)}
              </select>
            </div>
          </div>
          <button className="btn btn-primary" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar y autorizar cierre de turno'}
          </button>
        </form>
      )}
    </div>
  );
}
