import { useState } from 'react';
import Modal from '../../components/Modal';
import { useTarifasCatalogo, useTarifasMutation } from '../../api/hooks';
import { useToast } from '../../context/ToastContext';

const FORM_VACIO = { descripcion: '', tipo: 'FIJO', valor: '' };

export default function Tarifas() {
  const { data: tarifas } = useTarifasCatalogo();
  const mut = useTarifasMutation();
  const mostrarToast = useToast();

  const [busqueda, setBusqueda] = useState('');
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [editando, setEditando] = useState(null);

  const tarifasFiltradas = (tarifas ?? []).filter((t) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return t.descripcion?.toLowerCase().includes(q) || String(t.valor ?? '').toLowerCase().includes(q);
  });

  function crear() {
    mut.crear.mutate(form, {
      onSuccess: () => {
        setForm(FORM_VACIO);
        setCreando(false);
        mostrarToast('Tarifa insertada correctamente.');
      }
    });
  }

  function guardarEdicion() {
    // Nota: el tipo (Fijo/Turno/Mixto) no se manda en la edición a
    // propósito — el backend debe rechazar cualquier intento de
    // cambiarlo una vez creada la tarifa.
    mut.actualizar.mutate(
      { id: editando.id, descripcion: editando.descripcion, valor: editando.valor },
      {
        onSuccess: () => {
          setEditando(null);
          mostrarToast('Cambios guardados correctamente.');
        }
      }
    );
  }

  return (
    <div>
      <h1 className="page-title">Tarifas</h1>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap', marginBottom: 14 }}>
          <div className="field" style={{ maxWidth: 360, marginBottom: 0 }}>
            <label>Buscar por tarifa o valor</label>
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Ej. Hora extra o 526..." />
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setCreando(true)}>
            + Nueva tarifa
          </button>
        </div>

        <table>
          <thead><tr><th>Tarifa</th><th>Tipo</th><th>Valor</th><th>Acciones</th></tr></thead>
          <tbody>
            {tarifasFiltradas.map((t) => (
              <tr key={t.id}>
                <td>{t.descripcion}</td><td>{t.tipo}</td><td>Q{Number(t.valor).toFixed(2)}</td>
                <td><button className="btn btn-ghost" onClick={() => setEditando({ ...t })}>Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        titulo="Nueva tarifa"
        abierto={creando}
        onCerrar={() => { setCreando(false); setForm(FORM_VACIO); }}
        onGuardar={crear}
        guardando={mut.crear.isPending}
      >
        <div className="field">
          <label>Descripción</label>
          <input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} required />
        </div>
        <div className="field">
          <label>Tipo</label>
          <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            <option value="FIJO">Fijo</option>
            <option value="TURNO">Turno</option>
            <option value="MIXTO">Mixto</option>
          </select>
        </div>
        <div className="field">
          <label>Valor (Q)</label>
          <input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} required />
        </div>
        {mut.crear.isError && (
          <p style={{ color: 'var(--coral-dark)', background: 'var(--coral-light)', padding: '10px 12px', borderRadius: 8, fontSize: 12.5 }}>
            No se pudo insertar: {mut.crear.error?.response?.data?.error || mut.crear.error?.message || 'error desconocido'}.
          </p>
        )}
      </Modal>

      <Modal titulo="Editar tarifa" abierto={!!editando} onCerrar={() => setEditando(null)} onGuardar={guardarEdicion} guardando={mut.actualizar.isPending}>
        {editando && (
          <>
            <div className="field">
              <label>Descripción</label>
              <input value={editando.descripcion} onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })} />
            </div>
            <div className="field">
              <label>Tipo (no se puede modificar)</label>
              <input value={editando.tipo} disabled />
            </div>
            <div className="field">
              <label>Valor (Q)</label>
              <input type="number" step="0.01" value={editando.valor} onChange={(e) => setEditando({ ...editando, valor: e.target.value })} />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
