import comune from './comune.config.json';

// Tutto ciò che è specifico del comune (nome, email, confine, viste mappa)
// vive in comune.config.json - unica fonte, letta anche dalla pipeline Python
// (pipeline/lib/comune_config.py). Per un nuovo comune: vedi SETUP.md.
export const APP_CONFIG = {
  productName: 'Mappa Civica',
  municipality: {
    name: comune.name,
    email: comune.email,
    cadastralCode: (comune as { cadastralCode?: string }).cadastralCode,
    // Vista di default per l'embed stressinbici.it (Percorsi in bici → Stress da traffico).
    // area=italia usa il tileset nazionale, che fa lo swap automatico sul comune giusto in base
    // a queste coordinate/zoom (nessuno slug/nome comune da conoscere). Per un'altra città:
    // cambia solo lat/lon/zoom in comune.config.json.
    ltsEmbedView: comune.ltsEmbedView
  },
  map: {
    center: comune.map.center as [number, number],
    zoom: comune.map.zoom
  },
  duckdb: {
    databaseUrl: `${import.meta.env.BASE_URL}data/community_data.duckdb`
  }
};
