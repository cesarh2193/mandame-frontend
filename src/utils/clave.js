// Mismas reglas que valida el backend (services/clave.service.js), para
// avisar antes de enviar. La validación que manda es la del backend.
export function validarClaveNueva(clave, confirmar) {
  if (!clave || clave.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(clave) || !/\d/.test(clave)) return 'La contraseña debe tener letras y números.';
  if (confirmar !== undefined && clave !== confirmar) return 'Las contraseñas no coinciden.';
  return null;
}

export const AYUDA_CLAVE = 'Mínimo 8 caracteres, con letras y números.';
