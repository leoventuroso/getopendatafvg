// In Fase 0 centralizziamo gli endpoint in un file unico.
// In produzione questi valori possono arrivare da variabili Vite (import.meta.env).
export const APP_CONFIG = {
  municipality: {
    name: 'Montereale Valcellina',
    // Vista di default per l'embed stressinbici.it (Percorsi in bici → Stress da traffico).
    // area=italia usa il tileset nazionale, che fa lo swap automatico sul comune giusto in base
    // a queste coordinate/zoom (nessuno slug/nome comune da conoscere). Per un'altra città:
    // cambia solo lat/lon/zoom.
    ltsEmbedView: { lat: 46.15620, lon: 12.65731, zoom: 12.86 }
  },
  map: {
    center: [12.664, 46.160] as [number, number],
    zoom: 12
  },
  duckdb: {
    databaseUrl: `${import.meta.env.BASE_URL}data/community_data.duckdb`
  }
};
