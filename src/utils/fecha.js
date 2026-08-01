// "Hoy" en fecha LOCAL, como YYYY-MM-DD.
//
// NUNCA usar `new Date().toISOString().slice(0, 10)` para esto: toISOString
// convierte a UTC primero, y como Guatemala está en UTC-6, a partir de las
// 18:00 hora local esa fecha ya cae en el día siguiente en UTC. El backend
// usa CURDATE() (fecha del servidor, en su zona local) para filtrar "hoy",
// así que un frontend que manda la fecha de mañana después de las 6pm
// termina sin encontrar nada — parece un problema de la base de datos pero
// es este desfase de zona horaria.
export function hoyLocal() {
  const ahora = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`;
}
