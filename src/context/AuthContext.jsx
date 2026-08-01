import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { setToken, getToken } from '../api/client';
import { useLogin, useUsuarioActual } from '../api/hooks';

const AuthContext = createContext(null);

// Guarda quién inició sesión (nombre, rol activo, sucursales a las
// que tiene acceso) para que Sidebar, TopBar y cada página decidan
// qué mostrar. El backend es quien realmente decide qué datos
// devuelve por endpoint — esto es solo para la interfaz.
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
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
      setToken(data.token);
      setUsuario(data.usuario);
      return data.usuario;
    },
    [loginMutation]
  );

  const logout = useCallback(() => {
    setToken(null);
    setUsuario(null);
  }, []);

  const value = {
    usuario,
    isAuthenticated: !!getToken() && !!usuario,
    authLoading: hayTokenSinUsuario && usuarioActualQuery.isLoading,
    login,
    logout,
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
