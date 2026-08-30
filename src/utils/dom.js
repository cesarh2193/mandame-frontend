// El navegador exige que showPicker() se dispare directo desde un gesto
// del usuario — si se llama de nuevo (ej. onFocus justo después de un
// onClick que ya lo abrió, o en algunos navegadores móviles) tira
// NotAllowedError. No es un error real del sistema, así que se ignora en
// vez de dejarlo reventar como error no atrapado (llenaba el log de
// avisos repetidos sin ninguna acción que tomar).
export function mostrarPickerSiSePuede(elemento) {
  try {
    elemento.showPicker?.();
  } catch {
    // ignorado a propósito
  }
}
