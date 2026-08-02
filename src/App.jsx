import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import Restablecer from './pages/Restablecer';
import Hoy from './pages/Hoy';
import Monitoreo from './pages/Monitoreo';
import Planificacion from './pages/Planificacion';
import Asignaciones from './pages/Asignaciones';
import Asistencia from './pages/Asistencia';
import CierreTurno from './pages/CierreTurno';
import Autorizar from './pages/Autorizar';
import Boleta from './pages/informes/Boleta';
import AsistenciaInforme from './pages/informes/AsistenciaInforme';
import Empresas from './pages/catalogos/Empresas';
import Tarifas from './pages/catalogos/Tarifas';
import Personal from './pages/catalogos/Personal';
import Usuarios from './pages/catalogos/Usuarios';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/restablecer" element={<Restablecer />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/hoy" element={<Hoy />} />
            <Route
              path="/monitoreo"
              element={
                <ProtectedRoute roles={['Admin', 'Gerente']}>
                  <Monitoreo />
                </ProtectedRoute>
              }
            />
            <Route
              path="/planificacion"
              element={
                <ProtectedRoute rolesExcluidos={['Gerente']}>
                  <Planificacion />
                </ProtectedRoute>
              }
            />
            <Route
              path="/asignaciones"
              element={
                <ProtectedRoute rolesExcluidos={['Gerente']}>
                  <Asignaciones />
                </ProtectedRoute>
              }
            />
            <Route
              path="/asistencia"
              element={
                <ProtectedRoute rolesExcluidos={['Gerente']}>
                  <Asistencia />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cierre-turno"
              element={
                <ProtectedRoute rolesExcluidos={['Gerente']}>
                  <CierreTurno />
                </ProtectedRoute>
              }
            />
            <Route path="/autorizar" element={<Autorizar />} />
            <Route path="/informes/boleta" element={<Boleta />} />
            <Route path="/informes/boletas-cierre" element={<Boleta />} />
            <Route path="/informes/asistencia" element={<AsistenciaInforme />} />
            <Route
              path="/catalogos/empresas"
              element={
                <ProtectedRoute roles={['Admin', 'Gerente']}>
                  <Empresas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/catalogos/tarifas"
              element={
                <ProtectedRoute roles={['Admin', 'Gerente']}>
                  <Tarifas />
                </ProtectedRoute>
              }
            />
            <Route path="/catalogos/personal" element={<Personal />} />
            <Route
              path="/catalogos/usuarios"
              element={
                <ProtectedRoute roles={['Admin']}>
                  <Usuarios />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="/" element={<Navigate to="/hoy" replace />} />
          <Route path="*" element={<Navigate to="/hoy" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
