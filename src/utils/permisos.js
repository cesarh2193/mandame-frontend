// Regla compartida de visibilidad por rol para ítems de navegación
// (Sidebar de escritorio y BottomNav de móvil usan exactamente la misma,
// para que nunca queden desalineados sobre qué rol ve qué).
//
// roles: si se pasa, el ítem exige que el usuario tenga al menos uno de
// esos roles.
// rolesExcluidos: oculta el ítem solo si TODOS los roles del usuario
// están en esa lista (ej. alguien con Gerente + Supervisor sigue viendo
// lo que le toca por Supervisor).
export function puedeVerItem(item, rolesUsuario) {
  if (item.roles && !rolesUsuario.some((r) => item.roles.includes(r))) return false;
  if (item.rolesExcluidos && rolesUsuario.length > 0 && rolesUsuario.every((r) => item.rolesExcluidos.includes(r))) return false;
  return true;
}
