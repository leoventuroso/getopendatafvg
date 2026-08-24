import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configurazione minimale e robusta per SPA client-side.
export default defineConfig({
  plugins: [react()],
  base: '/mappa-civica/montereale-valcellina/',
  server: {
    host: true,
    port: 5173
  },
  // maplibre-gl v6 ships its worker as a sibling ESM chunk; Vite's dep
  // pre-bundling rewrites/relocates it and the worker 404s at runtime
  // (map hangs blank, no console error). Excluding it from optimizeDeps
  // serves the package as-is, worker included.
  optimizeDeps: {
    exclude: ['maplibre-gl']
  }
});
