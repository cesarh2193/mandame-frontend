import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../api/client';

export default function FichaPersonalInforme() {
  const { usuario } = useAuth();
  const mostrarToast = useToast();
  const [sucursalId, setSucursalId] = useState(usuario?.sucursales?.[0]?.id ?? '');
  const [motoristas, setMotoristas] = useState([]);
  const [motoristaId, setMotoristaId] = useState('');
  const [generando, setGenerando] = useState(false);

  const nombreSeleccionado = useMemo(
    () => motoristas.find((m) => String(m.motoristaId) === String(motoristaId))?.nombre ?? '',
    [motoristas, motoristaId]
  );

  useEffect(() => {
    let activo = true;

    async function cargarMotoristas() {
      if (!sucursalId) {
        if (activo) {
          setMotoristas([]);
          setMotoristaId('');
        }
        return;
      }

      try {
        // Mismo listado que usa el informe de asistencia: motoristas
        // activos que pertenecen al CAD seleccionado.
        const res = await api.get('/informes/asistencia/motoristas', { params: { sucursalId } });
        if (!activo) return;
        setMotoristas(res.data ?? []);
        if (!res.data?.length) {
          setMotoristaId('');
        }
      } catch {
        if (activo) {
          setMotoristas([]);
          setMotoristaId('');
        }
      }
    }

    const timer = setTimeout(() => {
      cargarMotoristas();
    }, 200);

    return () => {
      activo = false;
      clearTimeout(timer);
    };
  }, [sucursalId]);

  async function generarFicha() {
    if (!motoristaId) {
      mostrarToast('Selecciona un CAD y un motorista.', 'error');
      return;
    }

    setGenerando(true);
    try {
      const res = await api.get('/informes/ficha-personal', {
        params: { personaId: motoristaId },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `ficha-personal-${motoristaId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      mostrarToast(err?.response?.data?.error || 'No se pudo generar la ficha.', 'error');
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Ficha de personal</h1>
      <p className="page-sub">
        Selecciona un CAD (de los que tienes acceso) y un motorista para generar su ficha completa en PDF,
        con foto, datos personales, bancarios, laborales, de los padres y documentos adjuntos.
      </p>

      <div className="card">
        <div className="form-grid-3">
          <div className="field">
            <label>CAD (sucursal)</label>
            <select value={sucursalId} onChange={(e) => { setSucursalId(e.target.value); setMotoristaId(''); }}>
              <option value="">Selecciona un CAD</option>
              {usuario?.sucursales?.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Motorista</label>
            <select
              value={motoristaId}
              onChange={(e) => setMotoristaId(e.target.value)}
              disabled={!sucursalId}
            >
              <option value="">Selecciona un motorista</option>
              {motoristas.map((m) => (
                <option key={m.motoristaId} value={m.motoristaId}>{m.nombre}</option>
              ))}
            </select>
          </div>

          <div className="field" style={{ display: 'flex', alignItems: 'end' }}>
            <button className="btn btn-primary" onClick={generarFicha} disabled={generando || !motoristaId || !sucursalId}>
              {generando ? 'Generando...' : 'Generar ficha'}
            </button>
          </div>
        </div>

        {nombreSeleccionado && (
          <div style={{ marginTop: 14, color: 'var(--text-2)' }}>
            <strong>Motorista seleccionado:</strong> {nombreSeleccionado}
          </div>
        )}
      </div>
    </div>
  );
}
