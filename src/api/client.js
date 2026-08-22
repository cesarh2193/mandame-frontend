import axios from 'axios';

// Un solo cliente axios para toda la app. El token se guarda en
// memoria (dentro de este módulo) y también en localStorage para
// no perder la sesión al recargar la página — esto corre en el
// navegador del usuario, no dentro de un artifact de Claude, así
// que localStorage es la opción correcta aquí.
const TOKEN_KEY = 'mandame_token';

let inMemoryToken = localStorage.getItem(TOKEN_KEY) || null;

export function setToken(token) {
  inMemoryToken = token;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return inMemoryToken;
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api'
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Manda al backend (POST /logs/frontend) cualquier error que un usuario
// se encuentre en el navegador, para que quede guardado junto con los
// del backend en vez de perderse en la consola de esa persona — clave
// ahora que el sistema lo usan varios CAD a la vez y no podemos pedirle
// pantallazo a cada quien. Se limita a como mucho un envío cada 3
// segundos para no inundar el log si el mismo error se repite en bucle.
let ultimoReporte = 0;
export function reportarErrorFrontend(mensaje, stack) {
  const ahora = Date.now();
  if (ahora - ultimoReporte < 3000) return;
  ultimoReporte = ahora;

  api.post('/logs/frontend', {
    mensaje: String(mensaje || 'Error sin mensaje').slice(0, 500),
    stack: stack ? String(stack).slice(0, 3000) : null,
    pagina: window.location.pathname
  }).catch(() => {});
}

// Instala los listeners globales (errores de JS no atrapados y
// promesas sin .catch) — se llama una sola vez desde main.jsx.
export function instalarCapturaErroresGlobales() {
  window.addEventListener('error', (evento) => {
    reportarErrorFrontend(evento.message, evento.error?.stack);
  });
  window.addEventListener('unhandledrejection', (evento) => {
    const razon = evento.reason;
    reportarErrorFrontend(razon?.message || String(razon), razon?.stack);
  });
}

// Si el backend responde 401 (token vencido o inválido), se limpia
// la sesión local y se manda al login. Cada endpoint de escritura
// que dependa del rol/sucursal del usuario se valida en el backend
// (ver middleware de autorización en el README del backend) — el
// frontend no decide permisos, solo oculta/muestra según lo que la
// API ya le confirmó al iniciar sesión.
//
// Ojo: /auth/login también responde 401 cuando el usuario o la
// contraseña son incorrectos — eso NO es una sesión vencida, es un
// intento de login fallido. Si tratáramos ese 401 igual, la recarga
// forzada a /login borraría el mensaje de error antes de que el
// formulario alcanzara a mostrarlo. Por eso solo se fuerza logout
// cuando el 401 viene de una petición que sí llevaba un token.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const teniaToken = !!err.config?.headers?.Authorization;
    if (err.response?.status === 401 && teniaToken) {
      setToken(null);
      window.location.href = '/login';
    }

    // Solo se reportan errores "de verdad" (el servidor se cayó, no hay
    // conexión) — un 400/404/403 normalmente ya es un mensaje esperado
    // que la pantalla le muestra al usuario con un toast, no hace falta
    // duplicarlo en el log. Se excluye la propia ruta de logs para no
    // entrar en bucle si esa petición llegara a fallar.
    const esRutaDeLogs = err.config?.url?.includes('/logs/frontend');
    if (!esRutaDeLogs && (!err.response || err.response.status >= 500)) {
      const url = err.config?.url || '';
      reportarErrorFrontend(
        `HTTP ${err.response?.status ?? 'sin respuesta'} en ${url}: ${err.message}`,
        err.stack
      );
    }

    return Promise.reject(err);
  }
);
