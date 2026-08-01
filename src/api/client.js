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
    return Promise.reject(err);
  }
);
