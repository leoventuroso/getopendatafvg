# Montereale Valcellina Open

An open-source, serverless, and multi-modular Civic Tech platform for the territory of Montereale Valcellina (Friuli-Venezia Giulia, Italy). The platform provides interactive tools for sustainable mobility, outdoor activities, environmental resilience, and community-driven data collection — with zero hosting costs and no backend infrastructure.

---

## Architecture

The system is built on a 100% Jamstack architecture, deployed for free on GitHub Pages:

- **Static Base Layer (PMTiles):** Cloud-optimized vector tiles containing road networks, mountain trails, contour lines, and regional flood risk layers, served via HTTP Range Requests.
- **Live Basemap (Maptoolkit):** Hosted vector tiles/styles (`styles.maptoolkit.org`) provide the map background — light, summer (default), cycling, and dark variants, switchable at runtime (see [Shared map controls](#shared-map-controls) below).
- **Dynamic Strata (DuckDB-Wasm):** An embedded DuckDB database queried directly in the browser via WebAssembly, used for read-only access to municipality data. Community reports are stored locally via `localStorage` and submitted to the municipality via pre-filled `mailto:` links — no backend required.
- **GIS Pipeline (Python):** Offline processing scripts that transform raw data (Sentinel-2, Landsat, OSM, elevation models) into optimized GeoJSON files served as static assets.
- **Frontend (React + MapLibre GL 6):** A mobile-first, fully responsive single-page application (hamburger navigation below 700px, single-column layouts, 44px touch targets) with hardware-accelerated map rendering, hash-based routing, and no framework overhead.
- **CI/CD (GitHub Actions):** automated build+deploy to GitHub Pages on every push to `main`, plus a scheduled workflow that refreshes GIS data and commits it back to the repo (see [Deployment & Data Refresh](#deployment--data-refresh)).

### Shared map controls

Every module's map ships the same control set, matching the integrated [LTSBikePlan](https://github.com/dclfbk/LTSBikePlan) reference implementation exactly:

- **Style switcher** (top-left): a collapsible "Legenda" panel (− to collapse, + to expand) to pick Sfondo chiaro / estivo / ciclabile / scuro. Switching style preserves any active overlay (NDVI, LST, risk layers, etc.) and the current 3D terrain state.
- **3D terrain toggle**: elevation exaggeration via a free terrarium-encoded DEM (Mapterhorn), independent of which basemap style is active.
- **Address/place search**: Nominatim geocoding restricted to Italy, flies to the result's own bounding box.
- **PDF/image export**: snapshots the map's own WebGL canvas (`canvas.toDataURL()`) and lays it out on an A4 page via `jspdf`, with title and date footer.
- **Attribution**: `MapLibre | © Maptoolkit © Openstreetmap`.

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

### 1. Modulo Outdoor

A guided journey rather than an all-at-once map: opening the module shows only the top-level choice (🚲 Percorsi in bici / 🪧 Sentieri) — no default sub-tab is auto-selected.

**Percorsi in bici** (3 sub-tabs, each with its own icon and collapsible FAQ):
- **⚠ Stress da traffico:** live iframe embed of [stressinbici.it](https://stressinbici.it) (the [LTSBikePlan](https://github.com/dclfbk/LTSBikePlan) project) rather than a locally computed layer — `area=italia` auto-swaps to Montereale Valcellina's own data based on the configured lat/lon/zoom (`APP_CONFIG.municipality.ltsEmbedView`), no comune slug needed
- **🚏 Infrastrutture ciclabili:** cyclepaths, bike parking, rental, repair stations, e-bike charging
- **🧭 Pianifica percorso:** cycling route planner with elevation profile

**Sentieri** (3 sub-tabs):
- **🗺 Sentieri e punti acqua:** CAI hiking trails and MTB routes, drinking water fountains, mountain springs, and picnic areas, plus **natural shade corridors** — trail and road segments colored by vegetation canopy coverage (green gradient from partial to full shade), derived from Sentinel-2 NDVI
- **📈 Pendenza:** slope classification for trails (kept only here — cycling infrastructure has no separate slope legend, since LTS already captures cycling stress)
- **🧭 Pianifica percorso:** walking route planner with elevation profile

Every legend/layer group (LTS levels, bike infrastructure categories, slope classes) has plain-language explanations plus a collapsible "Cos'è e come è calcolato?" FAQ.

### 2. Modulo Soccorso ed Emergenza

Overlay di layer di rischio ufficiali e mappatura degli asset di emergenza del territorio. Due sotto-sezioni con icona (⚠ Zone a rischio / 💗 Presidi di soccorso).

**⚠ Zone a rischio** — a visible in-app warning banner (not just a note in this file) tells users the data is preliminary:
- Zone di rischio idraulico (PAI, Direttiva Alluvioni regionale) — *placeholder, dati reali da geoportale.regione.fvg.it*
- Aree a rischio frana (dissesto geologico storico) — *placeholder, dati reali da PAI FVG*
- Collapsible FAQ explains the PAI/Direttiva Alluvioni methodology and that shown boundaries are placeholders, not a safety reference

**💗 Presidi di soccorso:**
- Defibrillatori DAE/AED — *placeholder, dati reali da OSM*
- Elisuperfici HEMS per elisoccorso — *placeholder, dati reali da OSM*
- Rete idranti antincendio — *placeholder, dati reali da OSM*
- Punti di raccolta per emergenze — *placeholder, dati reali da OSM*

**Da implementare:** vedi [TODO.md](TODO.md) per il dettaglio delle attività in sospeso.

**Future scope:** modelli predittivi localizzati per allagamenti e accumulo acque meteoriche, integrabili con dati pluviometrici ARPA FVG.

### 3. Modulo Green

Satellite-based environmental monitoring derived from Sentinel-2 L2A and Landsat 8/9 imagery, processed at 10–30 m resolution and clipped to the municipal boundary. Presented as 4 tabs, one indicator at a time, each with an icon, plain-language label, and a collapsible "Cos'è e come è calcolato?" FAQ:

- **🌸 Vegetazione (NDVI):** vegetation density classification in 6 categories (water, bare soil, sparse, moderate, dense, very dense) at 10 m resolution with area statistics panel
- **🌳 Ombra naturale:** streets and trails classified by natural canopy coverage percentage, computed by intersecting road/trail buffers with dense vegetation polygons
- **💗 Salute vegetazione (NBR):** vegetation stress and fire risk index (B8A + B12) at 20 m resolution, with SCL-based masking of shadow and water pixels. Classes: healthy → moderate → water stress → degraded → bare/burned
- **🌡 Temperatura suolo (LST):** thermal surface mapping from Landsat 8 at 30 m resolution, classified from cool (forested valleys) to hot (exposed surfaces and built-up areas)

**GIS Pipeline scripts:**
- `process_green_layers.py` — NDVI from Sentinel-2 B04/B08
- `process_nbr.py` — NBR from Sentinel-2 B8A/B12 with SCL masking
- `process_shade_corridors.py` — canopy coverage per road/trail segment
- `process_lst.py` — LST from Landsat 8/9 lwir11 band

### 4. Segnala (Community Participation)

A lightweight, serverless reporting interface inspired by FixMyStreet and Stadt Wien, allowing citizens to submit georeferenced reports directly to the municipality with zero backend infrastructure. Redesigned as a guided, step-by-step flow: instructions and an empty map come first, and the report form only appears once a pin has been placed — the map stays clickable throughout so the pin can be repositioned without a separate "change location" step.

**Implemented:**
- **6 report categories** with Bootstrap Icons: Viabilità e strade, Sentieri e natura, Rifiuti e degrado, Illuminazione, Segnaletica, Proposta
- **Georeferenced reporting:** click on the map to place a pin; the form (category, title, description, optional photo) appears only after placement, and the pin can still be dragged/re-clicked to reposition
- **Photo attachment:** client-side image resize (canvas, max 1024 px, JPEG 75%) with thumbnail preview; photo filename included in the email body as a reminder to attach manually
- **Map markers:** white circle with category icon (Bootstrap Icons), hover popup showing title, category, and photo thumbnail
- **Category filters:** chip bar to filter the report list by category
- **Local persistence:** pending reports stored in `localStorage` — visible immediately on the map after submission, survive page refresh
- **Submission via `mailto:`:** pre-filled email to the municipality (subject + body with coordinates and description); no server required
- **Sidebar sync:** clicking a map marker selects and expands the corresponding sidebar item with smooth scroll
- **Upvoting:** each report has a "thumbs up" button with vote count; votes persist in `localStorage` (one vote per report per browser); clicking again removes the vote

**Planned:**
- Structured feedback export for local administrators
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
| Live basemap tiles/styles | Maptoolkit (`styles.maptoolkit.org`) | — | See provider terms |
| LTS (traffic stress) map | stressinbici.it / [LTSBikePlan](https://github.com/dclfbk/LTSBikePlan) (live iframe embed) | — | See project's own license |
| 3D terrain DEM | Mapterhorn terrarium-encoded DEM | — | Free/Open |
| UI icons | Bootstrap Icons | — | MIT |

---

## Deployment & Data Refresh

The site is a static build published on **GitHub Pages**, no server to run or maintain.

- **`.github/workflows/deploy.yml`** — on every push to `main`: `npm ci` + `npm run build` in `frontend/`, then publishes `frontend/dist` to Pages. Also triggerable manually (`workflow_dispatch`).
- **`.github/workflows/refresh-data.yml`** — scheduled GIS data refresh, committed straight back to the repo (`frontend/public/data/`):
  - Weekly (Mondays 03:00 UTC): `make rescue cyclepaths`
  - Monthly (1st of the month, 03:00 UTC): `make base community`
  - Also triggerable manually for any single target (`rescue`, `cyclepaths`, `base`, `community`)

Local dev: `cd frontend && npm run dev` (Vite, default port 5173). Production build: `npm run build` (`tsc -b && vite build`); preview it with `npm run preview`.

---

## Contributing

Contributions to data layers, frontend features, or processing pipelines are welcome.

- To report bugs or suggest features: open an Issue
- To submit code or data updates: open a Pull Request targeting the relevant module directory
