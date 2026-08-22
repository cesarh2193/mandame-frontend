// Ruta de "inicio" según el rol del usuario logueado. Un usuario que
// solo tiene el rol Motorista no tiene acceso a /hoy (ver Sidebar y
// App.jsx, que le restringen todo salvo Boletas cierre), así que su
// inicio es directo a la pantalla de subir boleta.
export function rutaInicio(usuario) {
  const roles = usuario?.roles ?? [];
  if (roles.length > 0 && roles.every((r) => r === 'Motorista')) {
    return '/informes/subir-boleta';
  }
  return '/hoy';
}
