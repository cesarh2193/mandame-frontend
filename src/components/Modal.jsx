export default function Modal({ titulo, abierto, onCerrar, onGuardar, guardando, children, ancho = 440, soloLectura = false }) {
  if (!abierto) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,20,30,.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: 20
      }}
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <div className="card" style={{ maxWidth: ancho, width: '100%', maxHeight: '86vh', overflow: 'auto' }}>
        <h3 style={{ marginTop: 0 }}>{titulo}</h3>
        {children}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          {soloLectura ? (
            <button type="button" className="btn btn-ghost" onClick={onCerrar}>Cerrar</button>
          ) : (
            <>
              <button type="button" className="btn btn-ghost" onClick={onCerrar}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={onGuardar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
