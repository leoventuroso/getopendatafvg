import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configurazione minimale e robusta per SPA client-side.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173
  }
});
