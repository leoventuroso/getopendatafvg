# Montereale Valcellina Open

An open-source, serverless, and multi-modular Civic Tech platform for the territory of Montereale Valcellina (Friuli-Venezia Giulia, Italy). The platform provides interactive tools for sustainable mobility, outdoor activities, environmental resilience, and community-driven data collection — with zero hosting costs and no backend infrastructure.

---

## Architecture

The system is built on a 100% Jamstack architecture:

- **Static Base Layer (PMTiles):** Cloud-optimized vector tiles containing road networks, mountain trails, contour lines, and regional flood risk layers, served via HTTP Range Requests.
- **Dynamic Strata (DuckDB-Wasm):** An embedded DuckDB database queried directly in the browser via WebAssembly, used for read-only access to municipality data. Community reports are stored locally via `localStorage` and submitted to the municipality via pre-filled `mailto:` links — no backend required.
- **GIS Pipeline (Python):** Offline processing scripts that transform raw data (Sentinel-2, Landsat, OSM, elevation models) into optimized GeoJSON files served as static assets.
- **Frontend (React + MapLibre GL):** A responsive single-page application with hardware-accelerated map rendering, hash-based routing, and no framework overhead.

---

## Platform Modules

### Home

The entry point of the platform. Serves as a landing and orientation screen for new users:

- **App introduction:** brief description of the platform and its four modules, with clickable module cards (Bootstrap Icons) that navigate directly to each module via hash-based routing
- **Municipal overview map:** OSM base map with the municipal boundary highlighted
- **Frazioni list:** interactive sidebar list of official frazioni (Montereale Valcellina, Grizzo, Malnisio, San Leonardo); clicking a frazione flies the map to that locality
- **Municipal metadata panel:** key indicators from multiple sources, grouped by theme:
  - *Territorio:* area (km²), population density, waterways (Torrente Cellina), peaks with elevation (Monte I Cameroni 1471 m, Monte Fortel 1436 m, Monte Fara 1345 m, Monte Spia 548 m, Monte Gloriassis 468 m), dense vegetation %, CAI trails km, MTB routes km, cycling paths km
  - *Popolazione:* residents + year, households, average household size, average age, old-age index, population 65+ (provincial where municipal not available)
  - *Rischio territorio:* seismic zone 1 — alta pericolosità (national classification); hydrogeological risk class pending PAI FVG data
  - *Servizi:* pharmacy (Farmacia Tre Effe), schools (4 mapped in OSM: primaria, secondaria I grado, 2× infanzia), bank branches (Banca 360 FVG + Unicredit), nearest emergency room (Ospedale 'Immacolata Concezione', Maniago/Manià — 6 km, ~13 min)

All service and geographic data sourced from OpenStreetMap via Nominatim (bounded bounding-box query). ISTAT data fetched via `esploradati.istat.it` SDMX REST API (script: `pipeline/scripts/fetch_istat_stats.py`). Static file: `frontend/public/data/municipality_stats.json`.

### 1. Outdoor

Interactive mapping of CAI hiking trails, mountain biking routes, and regional bike paths (FVG3 / MV 06 cyclepath).

**Implemented:**
- LTS (Level of Traffic Stress) network analysis for urban cycling safety
- Bike infrastructure map: cyclepaths, bike parking, rental, repair stations, e-bike charging
- CAI hiking trails and MTB routes with slope classification
- Drinking water fountains, mountain springs, and picnic areas
- **Natural shade corridors** along roads and trails — trail and road segments colored by vegetation canopy coverage (green gradient from partial to full shade), derived from Sentinel-2 NDVI
- Walking and cycling route planner with elevation profile

### 2. Soccorso ed Emergenza

Overlay di layer di rischio ufficiali e mappatura degli asset di emergenza del territorio.

**UI e struttura layer implementati** (dati attualmente placeholder — in attesa di fonti ufficiali):
- Zone di rischio idraulico (PAI, Direttiva Alluvioni regionale) — *placeholder, dati reali da geoportale.regione.fvg.it*
- Aree a rischio frana (dissesto geologico storico) — *placeholder, dati reali da PAI FVG*
- Defibrillatori DAE/AED — *placeholder, dati reali da OSM*
- Elisuperfici HEMS per elisoccorso — *placeholder, dati reali da OSM*
- Rete idranti antincendio — *placeholder, dati reali da OSM*
- Punti di raccolta per emergenze — *placeholder, dati reali da OSM*

**Da implementare:** vedi [TODO.md](TODO.md) per il dettaglio delle attività in sospeso.

**Future scope:** modelli predittivi localizzati per allagamenti e accumulo acque meteoriche, integrabili con dati pluviometrici ARPA FVG.

### 3. Green

Satellite-based environmental monitoring derived from Sentinel-2 L2A and Landsat 8/9 imagery, processed at 10–30 m resolution and clipped to the municipal boundary.

**Implemented:**
- **NDVI (Normalized Difference Vegetation Index):** vegetation density classification in 6 categories (water, bare soil, sparse, moderate, dense, very dense) at 10 m resolution with area statistics panel
- **Shade corridors:** streets and trails classified by natural canopy coverage percentage, computed by intersecting road/trail buffers with dense vegetation polygons
- **NBR (Normalized Burn Ratio):** vegetation stress and fire risk index (B8A + B12) at 20 m resolution, with SCL-based masking of shadow and water pixels. Classes: healthy → moderate → water stress → degraded → bare/burned
- **LST (Land Surface Temperature):** thermal surface mapping from Landsat 8 at 30 m resolution, classified from cool (forested valleys) to hot (exposed surfaces and built-up areas)

**GIS Pipeline scripts:**
- `process_green_layers.py` — NDVI from Sentinel-2 B04/B08
- `process_nbr.py` — NBR from Sentinel-2 B8A/B12 with SCL masking
- `process_shade_corridors.py` — canopy coverage per road/trail segment
- `process_lst.py` — LST from Landsat 8/9 lwir11 band

### 4. Segnala (Community Participation)

A lightweight, serverless reporting interface inspired by FixMyStreet and Stadt Wien, allowing citizens to submit georeferenced reports directly to the municipality with zero backend infrastructure.

**Implemented:**
- **6 report categories** with Bootstrap Icons: Viabilità e strade, Sentieri e natura, Rifiuti e degrado, Illuminazione, Segnaletica, Proposta
- **Georeferenced reporting:** click on the map to place a pin, then fill in category, title, description, and an optional photo
- **Photo attachment:** client-side image resize (canvas, max 1024 px, JPEG 75%) with thumbnail preview; photo filename included in the email body as a reminder to attach manually
- **Map markers:** white circle with category icon (Bootstrap Icons), hover popup showing title, category, and photo thumbnail
- **Category filters:** chip bar to filter the report list by category
- **Local persistence:** pending reports stored in `localStorage` — visible immediately on the map after submission, survive page refresh
- **Submission via `mailto:`:** pre-filled email to the municipality (subject + body with coordinates and description); no server required
- **Sidebar sync:** clicking a map marker selects and expands the corresponding sidebar item with smooth scroll
- **Upvoting:** each report has a "thumbs up" button with vote count; votes persist in `localStorage` (one vote per report per browser); clicking again removes the vote

**Planned:**
- Citizen upvoting and structured feedback export for local administrators
- Integration of lightweight computer vision models (YOLO) for automatic infrastructure hazard classification from citizen-submitted photographs
- **Cadastral parcel selection:** citizens select their own land parcel to auto-fill foglio/particella; data sourced from [ondata/dati_catastali](https://github.com/ondata/dati_catastali) (Parquet, CC BY 4.0), queryable via DuckDB-Wasm with no additional infrastructure

---

## Directory Structure

```
/frontend       Web application (React, MapLibre GL, DuckDB-Wasm)
/pipeline       Python GIS processing scripts
/functions      Automated build tasks and webhook configurations
```

---

## Data Sources

| Layer | Source | Resolution | License |
|-------|--------|------------|---------|
| Road network, trails, POIs, services, peaks | OpenStreetMap / Nominatim | — | ODbL |
| Demographic and statistical data | ISTAT — esploradati.istat.it SDMX REST | — | CC BY |
| NDVI, NBR | Sentinel-2 L2A (ESA/Copernicus) | 10–20 m | Free/Open |
| LST | Landsat 8/9 Collection 2 L2 (USGS) | 30 m | Public Domain |
| Hydraulic/landslide risk | PAI, Regione FVG | — | Open Data FVG |
| Elevation / slope | DEM/LiDAR | — | Open Data |
| UI icons | Bootstrap Icons | — | MIT |

---

## Contributing

Contributions to data layers, frontend features, or processing pipelines are welcome.

- To report bugs or suggest features: open an Issue
- To submit code or data updates: open a Pull Request targeting the relevant module directory
