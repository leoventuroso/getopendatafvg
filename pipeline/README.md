# Pipeline dati GIS

Script Python per produrre gli asset statici della piattaforma (Jamstack).

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
```

Ogni target è indipendente: puoi eseguirli singolarmente senza rieseguire l'intera pipeline.

## Struttura

```
pipeline/
├── lib/                    # Moduli condivisi importati dagli script
│   ├── dem_slope.py        # Campionamento DEM e calcolo pendenza
│   └── exclusions.py       # Geometrie da escludere (Cao Malnisio ecc.)
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

- `frontend/src/data/*.SAFE` — scena Sentinel-2 L2A (tile T33TUM) per `process_green_layers.py`
- `frontend/src/data/*.tif` — DEM/LiDAR (es. `w51075_s10.tif`) per gli script outdoor
- `pipeline/data/*.osm.pbf` — dump OSM per `build_pmtiles.py`
- `pipeline/tools/planetiler.jar` — per `build_pmtiles.py`
