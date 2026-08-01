import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

// Un solo layout para computadora y teléfono. En pantallas angostas
// (ver media query en theme.css) el Sidebar se convierte en un cajón
// (drawer) que se abre con el botón hamburguesa del TopBar y se
// cierra tocando el fondo oscuro o eligiendo una opción del menú.
export default function Layout() {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="app-shell">
      <TopBar onAbrirMenu={() => setMenuAbierto(true)} />
      <div className="body-shell">
        <Sidebar abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} />
        {menuAbierto && <div className="sidebar-backdrop" onClick={() => setMenuAbierto(false)} />}
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
