# Pipeline dati GIS

Script Python per produrre gli asset statici della piattaforma (Jamstack).

Per usare questa pipeline su un comune diverso da Montereale Valcellina,
vedi [SETUP.md](../SETUP.md) alla radice del repo — elenca i file di
configurazione da compilare e i dati grezzi da procurarsi. Ogni script legge
i valori specifici del comune da `pipeline/lib/comune_config.py`, che a sua
volta legge `frontend/src/comune.config.json`.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Esecuzione

Usa il Makefile dalla cartella `pipeline/`:

```bash
make help       # mostra tutti i target disponibili
make all        # pipeline completa
make outdoor    # solo modulo Outdoor (trails, acqua, ciclabile)
make green      # solo modulo Ambiente (NDVI, NBR, LST, ombra)
make rescue     # solo modulo Emergenze
make base       # solo modulo Base (frazioni, statistiche ISTAT)
make community  # solo modulo Segnala (inizializza DuckDB)
make tiles      # PMTiles LTS (richiede Tippecanoe)
make basemap    # Basemap vettoriale dark self-hosted (planetiler + OpenMapTiles, ~450MB, Java 21+)
```

`make basemap` è un'alternativa documentata ma non usata in produzione: il frontend usa gli stili live hosted di Maptoolkit (`styles.maptoolkit.org`), non questo basemap self-hosted.

Ogni target è indipendente: puoi eseguirli singolarmente senza rieseguire l'intera pipeline.

## Struttura

```
pipeline/
├── lib/                    # Moduli condivisi importati dagli script
│   ├── comune_config.py    # Legge frontend/src/comune.config.json — vedi SETUP.md
│   ├── dem_slope.py        # Campionamento DEM e calcolo pendenza
│   └── exclusions.py       # Geometrie da escludere (opzionale, vedi SETUP.md)
├── scripts/                # Uno script per target applicativo
│   ├── build_frazioni_geojson.py
│   ├── fetch_istat_stats.py
│   ├── build_outdoor_geojson.py
│   ├── build_bike_infra_geojson.py
│   ├── build_bike_cyclepaths_geojson.py
│   ├── build_rescue_geojson.py
│   ├── process_green_layers.py
│   ├── process_nbr.py
│   ├── process_lst.py
│   ├── process_shade_corridors.py
│   ├── init_duckdb.py
│   └── build_pmtiles.py
├── data/                   # OSM PBF e sorgenti (gitignored)
├── tools/                  # planetiler.jar (gitignored)
├── Makefile
├── requirements.txt
└── README.md
```

## Script e output

| Script | Modulo | Output |
|---|---|---|
| `build_frazioni_geojson.py` | Base | `frontend/public/data/frazioni.geojson` |
| `fetch_istat_stats.py` | Base | `frontend/public/data/istat_stats.json` |
| `build_outdoor_geojson.py` | Outdoor | `outdoor/trails.geojson`, `outdoor/trails_routing.geojson`, `outdoor/water.geojson` |
| `build_bike_infra_geojson.py` | Outdoor | `outdoor/bike_infra.geojson` |
| `build_bike_cyclepaths_geojson.py` | Outdoor | `outdoor/bike_cyclepaths.geojson` |
| `build_rescue_geojson.py` | Emergenze | `rescue/*.geojson` |
| `process_green_layers.py` | Ambiente | `frontend/public/data/greenery.geojson` |
| `process_nbr.py` | Ambiente | `frontend/public/data/nbr.geojson` |
| `process_lst.py` | Ambiente | `frontend/public/data/lst.geojson` |
| `process_shade_corridors.py` | Ambiente | `frontend/public/data/shade_corridors.geojson` |
| `init_duckdb.py` | Segnala | `frontend/public/data/community_data.duckdb` |
| `build_pmtiles.py` | Base/Outdoor | `frontend/public/data/base_layers.pmtiles` |

## Dati locali richiesti (gitignored)

Questi file devono essere presenti localmente ma non sono versionati:

- `frontend/src/data/*.SAFE` — scena Sentinel-2 L2A per `process_green_layers.py`
- `frontend/src/data/dem.tif` — DEM/LiDAR per gli script outdoor
- `pipeline/data/*.osm.pbf` — dump OSM per `build_pmtiles.py`
- `pipeline/tools/planetiler.jar` — per `build_pmtiles.py`
