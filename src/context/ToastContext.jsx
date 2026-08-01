import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);
const DURACION_MS = 3200;

// Mensaje flotante simple para confirmar que una acción (crear,
// guardar, dar de baja, etc.) sí se completó. Se apila si hay más
// de uno y cada uno se cierra solo después de unos segundos.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const contador = useRef(0);

  const mostrar = useCallback((mensaje, tipo = 'ok') => {
    const id = ++contador.current;
    setToasts((prev) => [...prev, { id, mensaje, tipo }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, DURACION_MS);
  }, []);

  return (
    <ToastContext.Provider value={mostrar}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tipo}`}>{t.mensaje}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
