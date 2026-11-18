// Última vez que la persona usó el sistema (tocó, escribió, movió el
// mouse). Se guarda en localStorage para que todas las pestañas abiertas
// compartan el mismo reloj: si trabaja en una, las otras no se cierran.
const CLAVE = 'mandame_ultima_actividad';
let enMemoria = Date.now();

export function registrarActividad() {
  const ahora = Date.now();
  if (ahora - enMemoria < 2000) return; // como mucho una escritura cada 2 s
  enMemoria = ahora;
  try { localStorage.setItem(CLAVE, String(ahora)); } catch { /* sin storage: queda en memoria */ }
}

/** Igual que registrarActividad pero sin esperar los 2 s (login, "Seguir trabajando"). */
export function marcarActividadAhora() {
  enMemoria = 0;
  registrarActividad();
}

export function ultimaActividad() {
  let guardada = 0;
  try { guardada = Number(localStorage.getItem(CLAVE)) || 0; } catch { /* sin storage */ }
  return Math.max(enMemoria, guardada);
}

/** Segundos desde la última actividad: se manda al servidor en cada petición. */
export function segundosSinActividad() {
  return Math.max(0, Math.floor((Date.now() - ultimaActividad()) / 1000));
}
