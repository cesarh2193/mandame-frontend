import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

// Convención en todo el archivo: un hook "useX" para leer (useQuery)
// y "useXMutation" para escribir (useMutation). Cada mutación
// invalida las queries relacionadas para que la pantalla se
// refresque sola, sin recargar la página.

// ---------- Auth ----------
export function useLogin() {
  return useMutation({
    mutationFn: (credenciales) => api.post('/auth/login', credenciales).then((r) => r.data)
  });
}

export function useRestablecer() {
  return useMutation({
    mutationFn: (payload) => api.post('/auth/restablecer', payload).then((r) => r.data)
  });
}

export function useUsuarioActual(enabled = true) {
  return useQuery({
    queryKey: ['usuario-actual'],
    queryFn: () => api.get('/auth/me').then((r) => r.data),
    retry: false,
    enabled
  });
}

// ---------- Dashboard "Hoy" ----------
export function useResumenHoy(sucursalId) {
  return useQuery({
    queryKey: ['resumen-hoy', sucursalId],
    queryFn: () => api.get('/dashboard/hoy', { params: { sucursalId } }).then((r) => r.data)
  });
}

export function useCuadreCads() {
  // solo lo usa la vista de Administrador (gráfica por CAD)
  return useQuery({
    queryKey: ['cuadre-cads'],
    queryFn: () => api.get('/dashboard/cuadre-cads').then((r) => r.data)
  });
}

// ---------- Planificación ----------
export function usePlanificacion(fecha) {
  return useQuery({
    queryKey: ['planificacion', fecha],
    queryFn: () => api.get('/planificacion', { params: { fecha } }).then((r) => r.data)
  });
}

export function useGuardarPlanificacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post('/planificacion', payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planificacion'] })
  });
}

// ---------- Asignaciones ----------
export function useMotoristasDisponibles(sucursalId, fecha) {
  return useQuery({
    queryKey: ['motoristas-disponibles', sucursalId, fecha],
    queryFn: () => api.get('/asignaciones/disponibles', { params: { sucursalId, fecha } }).then((r) => r.data),
    enabled: !!sucursalId && !!fecha
  });
}

export function useBuscarOtroCad(sucursalId, fecha, q) {
  return useQuery({
    queryKey: ['buscar-otro-cad', sucursalId, fecha, q],
    queryFn: () => api.get('/asignaciones/buscar-otro-cad', { params: { sucursalId, fecha, q } }).then((r) => r.data),
    enabled: !!sucursalId && !!fecha && q.trim().length >= 2
  });
}

export function useAsignacionesActivas(sucursalId) {
  return useQuery({
    queryKey: ['asignaciones-activas', sucursalId],
    queryFn: () => api.get('/asignaciones', { params: { sucursalId } }).then((r) => r.data)
  });
}

export function useAsignarLote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post('/asignaciones/lote', payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['motoristas-disponibles'] });
      qc.invalidateQueries({ queryKey: ['asignaciones-activas'] });
    }
  });
}

export function useAnularAsignacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (asignacionId) => api.post(`/asignaciones/${asignacionId}/anular`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asignaciones-activas'] });
      qc.invalidateQueries({ queryKey: ['motoristas-disponibles'] });
    }
  });
}

// ---------- Asistencia ----------
export function usePendientesIngreso(sucursalId) {
  return useQuery({
    queryKey: ['pendientes-ingreso', sucursalId],
    queryFn: () => api.get('/asistencia/pendientes', { params: { sucursalId } }).then((r) => r.data)
  });
}

export function useMarcarIngreso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (asignacionId) => api.post(`/asistencia/${asignacionId}/ingreso`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pendientes-ingreso'] })
  });
}

// ---------- Cierre de turno ----------
export function useEnTurno(sucursalId) {
  return useQuery({
    queryKey: ['en-turno', sucursalId],
    queryFn: () => api.get('/cierre-turno/en-turno', { params: { sucursalId } }).then((r) => r.data)
  });
}

export function useTarifas() {
  return useQuery({
    queryKey: ['tarifas-activas'],
    queryFn: () => api.get('/tarifas', { params: { estado: 'A' } }).then((r) => r.data)
  });
}

export function useCerrarTurno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ asignacionId, ...payload }) => api.post(`/cierre-turno/${asignacionId}`, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['en-turno'] });
      qc.invalidateQueries({ queryKey: ['resumen-hoy'] });
      // El cierre autoriza de una vez (ver cierreTurno.routes.js), así que
      // la tabla de "Autorizados hoy" también debe refrescarse sola.
      qc.invalidateQueries({ queryKey: ['repartos-autorizados'] });
      qc.invalidateQueries({ queryKey: ['repartos-pendientes'] });
    }
  });
}

// ---------- Autorizar ----------
export function useRepartosPendientes(sucursalId) {
  return useQuery({
    queryKey: ['repartos-pendientes', sucursalId],
    queryFn: () => api.get('/autorizacion/pendientes', { params: { sucursalId } }).then((r) => r.data)
  });
}

export function useRepartosAutorizados(sucursalId, fecha) {
  return useQuery({
    queryKey: ['repartos-autorizados', sucursalId, fecha],
    queryFn: () => api.get('/autorizacion/autorizados', { params: { sucursalId, fecha } }).then((r) => r.data)
  });
}

export function useAutorizarRepartos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (repartoIds) => api.post('/autorizacion/autorizar', { repartoIds }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['repartos-pendientes'] });
      qc.invalidateQueries({ queryKey: ['repartos-autorizados'] });
    }
  });
}

// ---------- Monitoreo ----------
export function useMonitoreo(fecha) {
  return useQuery({
    queryKey: ['monitoreo', fecha],
    queryFn: () => api.get('/monitoreo', { params: { fecha } }).then((r) => r.data)
  });
}

// ---------- Catálogos genéricos ----------
function useCatalogo(recurso) {
  return useQuery({
    queryKey: [recurso],
    queryFn: () => api.get(`/${recurso}`).then((r) => r.data)
  });
}
function useCatalogoMutation(recurso) {
  const qc = useQueryClient();
  return {
    crear: useMutation({
      mutationFn: (payload) => api.post(`/${recurso}`, payload).then((r) => r.data),
      onSuccess: () => qc.invalidateQueries({ queryKey: [recurso] })
    }),
    actualizar: useMutation({
      mutationFn: ({ id, ...payload }) => api.put(`/${recurso}/${id}`, payload).then((r) => r.data),
      onSuccess: () => qc.invalidateQueries({ queryKey: [recurso] })
    }),
    darDeBaja: useMutation({
      mutationFn: (id) => api.post(`/${recurso}/${id}/dar-de-baja`).then((r) => r.data),
      onSuccess: () => qc.invalidateQueries({ queryKey: [recurso] })
    })
  };
}

export const useEmpresas = (estado) => useQuery({
  queryKey: ['empresas', estado],
  queryFn: () => api.get('/empresas', { params: { estado } }).then((r) => r.data)
});
export const useEmpresasMutation = () => useCatalogoMutation('empresas');
export const useSucursales = (empresaId, estado) => useQuery({
  queryKey: ['sucursales', empresaId, estado],
  queryFn: () => api.get('/sucursales', { params: { empresaId, estado } }).then((r) => r.data)
});
export const useSucursalesMutation = () => useCatalogoMutation('sucursales');

export const useTarifasCatalogo = () => useCatalogo('tarifas');
export const useTarifasMutation = () => useCatalogoMutation('tarifas');

export const usePersonal = () => useCatalogo('personal');
export const usePersonalMutation = () => useCatalogoMutation('personal');

export function useSubirFotoPersonal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archivo }) => {
      const formData = new FormData();
      formData.append('foto', archivo);
      return api.post(`/personal/${id}/foto`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }).then((r) => r.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personal'] })
  });
}

export function useSubirDocumentoPersonal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tipo, archivo }) => {
      const formData = new FormData();
      formData.append('documento', archivo);
      return api.post(`/personal/${id}/documentos/${tipo}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }).then((r) => r.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personal'] })
  });
}

export const useUsuarios = () => useCatalogo('usuarios');
export const useUsuariosSinCuenta = () => useQuery({
  queryKey: ['personal-sin-usuario'],
  queryFn: () => api.get('/personal', { params: { sinUsuario: true } }).then((r) => r.data)
});
export const useUsuariosMutation = () => useCatalogoMutation('usuarios');
