import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuración estándar de Vite + React.
// El proxy de /api hace que en desarrollo el frontend (puerto 5173)
// pueda llamar a fetch('/api/...') y Vite lo reenvíe al backend de
// Express (puerto 3000) sin problemas de CORS. En producción, el
// frontend se compila a archivos estáticos y VITE_API_URL apunta
// directo a donde esté publicado el backend (ver .env.example).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
