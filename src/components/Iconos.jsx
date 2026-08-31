const PROPS_ICONO = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function IconoOjo() {
  return (
    <svg {...PROPS_ICONO}>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconoLapiz() {
  return (
    <svg {...PROPS_ICONO}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function IconoBasura() {
  return (
    <svg {...PROPS_ICONO}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export function IconoCandado() {
  return (
    <svg {...PROPS_ICONO}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function IconoCheck() {
  return (
    <svg {...PROPS_ICONO}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function IconoCandadoAbierto() {
  return (
    <svg {...PROPS_ICONO}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.5-2" />
    </svg>
  );
}

// Los siguientes son para la barra inferior de navegación en móvil (BottomNav.jsx).

export function IconoHoy() {
  return (
    <svg {...PROPS_ICONO}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

export function IconoPlanifica() {
  return (
    <svg {...PROPS_ICONO}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </svg>
  );
}

export function IconoAsistencia() {
  return (
    <svg {...PROPS_ICONO}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" />
      <path d="m9 13.5 2 2 3.5-3.5" />
    </svg>
  );
}

export function IconoCierre() {
  return (
    <svg {...PROPS_ICONO}>
      <path d="M5 3v18" />
      <path d="M5 4h13l-3 4 3 4H5" />
    </svg>
  );
}

export function IconoMas() {
  return (
    <svg {...PROPS_ICONO}>
      <circle cx="5" cy="5" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="5" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="19" cy="5" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="5" cy="19" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="19" cy="19" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
