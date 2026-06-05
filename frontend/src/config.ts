// In Fase 0 centralizziamo gli endpoint in un file unico.
// In produzione questi valori possono arrivare da variabili Vite (import.meta.env).
export const APP_CONFIG = {
  map: {
    center: [12.664, 46.160] as [number, number],
    zoom: 12,
    pmtilesUrl: '/data/base_layers.pmtiles',
    // Allineato allo script pipeline (`tippecanoe -l transport`).
    sourceLayer: 'transportation'
  },
  duckdb: {
    databaseUrl: '/data/community_data.duckdb'
  }
};
