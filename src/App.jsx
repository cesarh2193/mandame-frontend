import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { rutaInicio } from './utils/rutas';

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
import SubirBoleta from './pages/informes/SubirBoleta';
import AsistenciaInforme from './pages/informes/AsistenciaInforme';
import AsistenciaGeneral from './pages/informes/AsistenciaGeneral';
import FichaPersonalInforme from './pages/informes/FichaPersonalInforme';
import Empresas from './pages/catalogos/Empresas';
import Tarifas from './pages/catalogos/Tarifas';
import Personal from './pages/catalogos/Personal';
import Usuarios from './pages/catalogos/Usuarios';

function InicioRedirect() {
  const { usuario } = useAuth();
  return <Navigate to={rutaInicio(usuario)} replace />;
}

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
            <Route
              path="/hoy"
              element={
                <ProtectedRoute rolesExcluidos={['Motorista']}>
                  <Hoy />
                </ProtectedRoute>
              }
            />
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
                <ProtectedRoute rolesExcluidos={['Gerente', 'Motorista']}>
                  <Planificacion />
                </ProtectedRoute>
              }
            />
            <Route
              path="/asignaciones"
              element={
                <ProtectedRoute rolesExcluidos={['Gerente', 'Motorista']}>
                  <Asignaciones />
                </ProtectedRoute>
              }
            />
            <Route
              path="/asistencia"
              element={
                <ProtectedRoute rolesExcluidos={['Gerente', 'Motorista']}>
                  <Asistencia />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cierre-turno"
              element={
                <ProtectedRoute rolesExcluidos={['Gerente', 'Motorista']}>
                  <CierreTurno />
                </ProtectedRoute>
              }
            />
            <Route
              path="/autorizar"
              element={
                <ProtectedRoute rolesExcluidos={['Motorista']}>
                  <Autorizar />
                </ProtectedRoute>
              }
            />
            <Route
              path="/informes/boleta"
              element={
                <ProtectedRoute rolesExcluidos={['Motorista']}>
                  <Boleta />
                </ProtectedRoute>
              }
            />
            <Route
              path="/informes/boletas-cierre"
              element={
                <ProtectedRoute rolesExcluidos={['Motorista']}>
                  <Boleta />
                </ProtectedRoute>
              }
            />
            <Route
              path="/informes/subir-boleta"
              element={
                <ProtectedRoute rolesExcluidos={['Gerente']}>
                  <SubirBoleta />
                </ProtectedRoute>
              }
            />
            <Route
              path="/informes/asistencia"
              element={
                <ProtectedRoute rolesExcluidos={['Motorista']}>
                  <AsistenciaInforme />
                </ProtectedRoute>
              }
            />
            <Route
              path="/informes/asistencia-general"
              element={
                <ProtectedRoute rolesExcluidos={['Motorista']}>
                  <AsistenciaGeneral />
                </ProtectedRoute>
              }
            />
            <Route
              path="/informes/ficha-personal"
              element={
                <ProtectedRoute rolesExcluidos={['Motorista']}>
                  <FichaPersonalInforme />
                </ProtectedRoute>
              }
            />
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
            <Route
              path="/catalogos/personal"
              element={
                <ProtectedRoute rolesExcluidos={['Motorista']}>
                  <Personal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/catalogos/usuarios"
              element={
                <ProtectedRoute roles={['Admin']}>
                  <Usuarios />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="/" element={<InicioRedirect />} />
          <Route path="*" element={<InicioRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
