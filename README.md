# Mandame — Frontend (React + Vite)

Interfaz web de Mandame v2, hecha con React 18, Vite, React Router,
TanStack Query y Recharts, siguiendo el mismo diseño validado en el
prototipo (`mandame-prototype-final.html`).

## Instalación local

```bash
cd mandame-frontend
npm install
npm run dev
```

Abre `http://localhost:5173`. En desarrollo, las llamadas a `/api/...`
se reenvían automáticamente al backend en `http://localhost:3000`
(ver el proxy en `vite.config.js`) — no hace falta configurar nada
más si el backend de Express corre en ese puerto.

## Probar en otro servidor / montarlo

1. Compilar:
   ```bash
   npm run build
   ```
   Esto genera la carpeta `dist/` con archivos estáticos (HTML, JS, CSS).

2. Configurar la URL real del backend antes de compilar, copiando
   `.env.example` a `.env` y ajustando:
   ```
   VITE_API_URL=https://api.mandame.tudominio.com/api
   ```
   (Vite incrusta esta variable en el build; si cambias el backend,
   hay que volver a compilar.)

3. Servir `dist/` con cualquier servidor de archivos estáticos:
   - Nginx / Apache apuntando el `root` a `dist/`.
   - O `npm run preview` para probarlo rápido en el mismo servidor.
   - Si usas Nginx, recuerda la regla de "SPA fallback" (todas las
     rutas que no sean un archivo real deben servir `index.html`,
     porque las rutas como `/asignaciones` las resuelve React Router
     en el navegador, no el servidor).

4. El backend debe permitir CORS desde el dominio donde quede
   publicado este frontend (o servirse ambos bajo el mismo dominio
   para no tener que pensar en CORS).

## Estructura

```
src/
  api/client.js       cliente axios + manejo del token JWT
  api/hooks.js         un hook de TanStack Query por endpoint
  context/AuthContext  sesión del usuario (nombre, rol activo, sucursales)
  components/          Sidebar, TopBar, Layout, Modal, ProtectedRoute
  pages/                una carpeta/archivo por pantalla del prototipo
  styles/theme.css      variables de color (incluye modo oscuro)
```

## Contrato de API que este frontend espera del backend

El backend (Node.js + Express, ver recomendación de arquitectura)
debe exponer estos endpoints. Los procedimientos de
`mandame_procedimientos.sql` cubren la lógica transaccional de la
mayoría de estos — el rol de Express es autenticar, validar permisos
por rol/sucursal, y llamar al procedimiento correcto con `CALL`.

| Método | Ruta | Procedimiento / tabla relacionada |
|---|---|---|
| POST | `/api/auth/login` | valida usuario, compara con bcrypt, firma JWT |
| GET  | `/api/auth/me` | devuelve nombre, roles y sucursales del token |
| GET  | `/api/dashboard/hoy` | agregados de `asignacion` + `reparto` del día |
| GET  | `/api/dashboard/cuadre-cads` | solo si el rol es Administrador |
| GET/POST | `/api/planificacion` | `sp_registrar_planificacion` |
| GET  | `/api/asignaciones/disponibles` | `fn_motorista_disponible` |
| POST | `/api/asignaciones/lote` | `sp_asignar_motoristas_lote` |
| POST | `/api/asignaciones/:id/anular` | `sp_anular_asignacion` |
| GET  | `/api/asistencia/pendientes` | asignaciones sin marca de INGRESO |
| POST | `/api/asistencia/:id/ingreso` | `sp_marcar_ingreso` |
| GET  | `/api/cierre-turno/en-turno` | asignaciones con INGRESO y sin SALIDA |
| POST | `/api/cierre-turno/:id` | `sp_cerrar_turno` (o `sp_corregir_cierre` si el rol es Administrador y ya existe cierre) |
| GET  | `/api/autorizacion/pendientes` | `reparto` en estado PENDIENTE, fecha de hoy |
| GET  | `/api/autorizacion/autorizados` | `reparto` en estado AUTORIZADO |
| POST | `/api/autorizacion/autorizar` | `sp_autorizar_repartos` (y dispara el correo a los gerentes que devuelve el procedimiento) |
| GET  | `/api/monitoreo` | vista agregada `cierre_dia` |
| GET  | `/api/monitoreo/pdf` | genera el PDF (ej. con Puppeteer o pdfkit) a partir de la misma consulta |
| GET/POST/PUT | `/api/empresas`, `/api/sucursales`, `/api/tarifas`, `/api/personal`, `/api/usuarios` | catálogos CRUD estándar |

## Autenticación y autorización (cómo lo usa este frontend)

- El login guarda un JWT (`src/api/client.js`) que se manda en cada
  petición como `Authorization: Bearer <token>`.
- El frontend **no decide permisos** — solo muestra/oculta según lo
  que `/api/auth/me` devolvió (roles, sucursales). La validación real
  de "¿puede este usuario autorizar esta sucursal?" vive en el
  middleware de Express del backend, revisando `usuario_rol` y
  `usuario_sucursal` en cada endpoint de escritura.
- Si el backend responde 401, el interceptor de axios limpia la
  sesión y redirige a `/login` automáticamente.

## Archivos (firmas de autorización)

Este frontend no sube archivos todavía porque el prototipo actual no
llegó a esa pantalla, pero el patrón recomendado para cuando se
agregue: subir el archivo a disco o a un bucket (S3 o equivalente)
desde el backend, y que la respuesta guarde solo la URL en
`reparto.firma_url` — nunca el binario en la base de datos.
