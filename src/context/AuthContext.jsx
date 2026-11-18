import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, setToken, getToken } from '../api/client';
import { marcarActividadAhora } from '../utils/actividad';
import { useLogin, useUsuarioActual } from '../api/hooks';

const AuthContext = createContext(null);

// Guarda quién inició sesión (nombre, rol activo, sucursales a las
// que tiene acceso) para que Sidebar, TopBar y cada página decidan
// qué mostrar. El backend es quien realmente decide qué datos
// devuelve por endpoint — esto es solo para la interfaz.
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const queryClient = useQueryClient();
  const loginMutation = useLogin();

  // Si ya hay token (recarga de página) pero todavía no sabemos quién
  // es, se pide /auth/me para rehidratar el usuario en vez de tratar
  // el refresh como un logout.
  const hayTokenSinUsuario = !!getToken() && !usuario;
  const usuarioActualQuery = useUsuarioActual(hayTokenSinUsuario);
  const { data: usuarioActualData, isError: usuarioActualError } = usuarioActualQuery;

  useEffect(() => {
    if (hayTokenSinUsuario && usuarioActualData) {
      setUsuario(usuarioActualData);
    }
  }, [hayTokenSinUsuario, usuarioActualData]);

  useEffect(() => {
    if (hayTokenSinUsuario && usuarioActualError) {
      setToken(null);
    }
  }, [hayTokenSinUsuario, usuarioActualError]);

  const login = useCallback(
    async (credenciales) => {
      const data = await loginMutation.mutateAsync(credenciales);
      // data esperado: { token, usuario: { nombre, roles: [...], sucursales: [...] } }
      queryClient.clear();
      marcarActividadAhora();
      setToken(data.token);
      setUsuario(data.usuario);
      return data.usuario;
    },
    [loginMutation, queryClient]
  );

  // Después de cambiar la contraseña temporal ya no se le exige de nuevo.
  const marcarClaveCambiada = useCallback(() => {
    setUsuario((u) => (u ? { ...u, debeCambiarClave: false } : u));
  }, []);

  // Además de borrar el token del navegador, le avisa al servidor para que
  // ese token deje de servir (si alguien lo copió, ya no le funciona).
  const logout = useCallback(() => {
    const token = getToken();
    if (token) {
      api.post('/auth/logout', null, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
    queryClient.clear();
    setToken(null);
    setUsuario(null);
  }, [queryClient]);

  // Recarga directo a /login con el aviso. No se limpia el estado de React
  // antes: eso haría que la app redirija sola a /login y se pierda el aviso.
  // keepalive: el aviso al servidor sale aunque la página ya se esté yendo.
  const cerrarPorInactividad = useCallback(() => {
    const token = getToken();
    if (token) {
      fetch(`${api.defaults.baseURL}/auth/logout`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, keepalive: true
      }).catch(() => {});
    }
    setToken(null);
    window.location.replace('/login?motivo=inactividad');
  }, []);

  const value = {
    usuario,
    isAuthenticated: !!getToken() && !!usuario,
    authLoading: hayTokenSinUsuario && usuarioActualQuery.isLoading,
    login,
    logout,
    cerrarPorInactividad,
    marcarClaveCambiada,
    loginPending: loginMutation.isPending,
    loginError: loginMutation.error
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
