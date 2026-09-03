# Platform Modules

Detailed feature breakdown of each module. For the high-level overview, see the [README](../README.md).

---

## Home

The entry point of the platform. Serves as a landing and orientation screen for new users:

- **App introduction:** brief description of the platform and its four modules, with clickable module cards (Bootstrap Icons) that navigate directly to each module via hash-based routing
- **Municipal overview map:** OSM base map with the municipal boundary highlighted
- **Frazioni list:** interactive sidebar list of official frazioni; clicking a frazione flies the map to that locality
- **Municipal metadata panel:** key indicators from multiple sources, grouped by theme:
  - *Territorio:* area (km²), population density, waterways, peaks with elevation, dense vegetation %, CAI trails km, MTB routes km, cycling paths km
  - *Popolazione:* residents + year, households, average household size, average age, old-age index, population 65+ (provincial where municipal not available)
  - *Rischio territorio:* seismic zone (national classification); hydrogeological risk class pending official regional data
  - *Servizi:* pharmacy, schools, bank branches, nearest emergency room

All service and geographic data sourced from OpenStreetMap via Nominatim (bounded bounding-box query). ISTAT data fetched via `esploradati.istat.it` SDMX REST API (script: `pipeline/scripts/fetch_istat_stats.py`). Static file: `frontend/public/data/municipality_stats.json`.

## 1. Modulo Outdoor

A guided journey rather than an all-at-once map: opening the module shows only the top-level choice (Percorsi in bici / Sentieri) - no default sub-tab is auto-selected.

**Percorsi in bici** (3 sub-tabs, each with its own icon and collapsible FAQ):
- **Stress da traffico:** live iframe embed of [stressinbici.it](https://stressinbici.it) (the [LTSBikePlan](https://github.com/dclfbk/LTSBikePlan) project) rather than a locally computed layer - `area=italia` auto-swaps to the configured comune's own data based on `APP_CONFIG.municipality.ltsEmbedView` (lat/lon/zoom), no comune slug needed
- **Infrastrutture ciclabili:** cyclepaths, bike parking, rental, repair stations, e-bike charging
- **Pianifica percorso:** route planner over the bike network. Left panel has only the on/off switch; everything else lives in a floating panel on the map (modelled on LTSBikePlan's routing control, collapsible): draggable start/end/waypoint markers (click to add, drag to move), point list with per-point remove + Inverti/Indietro/Pulisci, then once a route is computed - length, estimated time for **a piedi / bici / bici elettrica**, road-type (`highway`/`surface`) breakdown, elevation profile, and GeoJSON/GPX/KML/CSV download. Slope/grade still read from the precomputed pipeline fields.

**Sentieri** (3 sub-tabs):
- **Sentieri e punti acqua:** CAI hiking trails and MTB routes, drinking water fountains, mountain springs, and picnic areas, plus **natural shade corridors** - trail and road segments colored by vegetation canopy coverage (green gradient from partial to full shade), derived from Sentinel-2 NDVI
- **Pendenza:** slope classification for trails (kept only here - cycling infrastructure has no separate slope legend, since LTS already captures cycling stress)
- **Pianifica percorso:** same planner over the walking network (roads + trails); same on-map floating panel and features (3 travel-mode times, road-type breakdown, elevation profile, GeoJSON/GPX/KML/CSV export, draggable markers)

Every legend/layer group (LTS levels, bike infrastructure categories, slope classes) has plain-language explanations plus a collapsible "Cos'è e come è calcolato?" FAQ.

## 2. Modulo Soccorso ed Emergenza

Censimento dei rii a rischio esondazione, perimetri degli incendi boschivi e mappatura degli asset di emergenza. Tre sotto-sezioni (Rii a rischio / Incendi boschivi / Presidi di soccorso).

**Rii a rischio esondazione** - `frontend/public/data/rescue/rii.geojson`, generato da `pipeline/scripts/build_rii_geojson.py`:
- Un rio per feature, dal Censimento RII del Gruppo Comunale di Protezione Civile (rilievo 2013, ri-rilievo parziale 2024); ogni rio ha un marcatore `Point` (bersaglio del clic) e, dove OpenStreetMap mappa il corso d'acqua, anche il `LineString` del tracciato reale
- Colore di linea/marcatore per attualità del dato (rilievo 2024 / dati fermi al 2013 / 2007 / solo foto); punti sbiaditi = posizione solo indicativa
- Filtri per vintage del rilievo; clic su marcatore o linea apre un popup sulla mappa (dimensionato sul viewport, con scroll interno) con foto, criticità, punti critici, interventi proposti ed eventi recenti
- A visible in-app caveat banner ricorda che è una ricognizione volontaria, non uno studio tecnico né un riferimento per decisioni in caso di allerta
- FAQ: storia del censimento, uso dei tracciati OpenStreetMap, il rio senza coordinate escluso dalla mappa, e il nome del documento («Censimento RII») in gestione alla Protezione Civile

**Incendi boschivi** - `frontend/public/data/rescue/fire_perimeters.geojson`, generato da `pipeline/scripts/build_fire_geojson.py`:
- Perimetri degli incendi boschivi dalla Regione FVG (IRDAT, dataset 1232 "Perimetro degli incendi boschivi"), estratti dal geoservizio regionale (WFS `ZONE_RISC:V_INCENDI_CT`) filtrando per comune
- Poligoni colorati per causa dell'innesco (dolosa / colposa / naturale da fulmine / ignota); filtri per causa
- Clic su un'area → popup con data di inizio, durata, luogo di innesco, stato della vegetazione, vincoli, codice foglio notizie
- Overlay opzionale: **NBR** (`data/nbr.geojson`, stesso layer del modulo Verde) come traccia satellitare di vegetazione secca/degradata/bruciata, disegnato sotto i perimetri con legenda inline
- Caveat: archivio storico (dal 1990), non una mappa previsionale di pericolosità; precisione geometrica variabile per i rilievi più vecchi
- CI-safe: singola GET HTTPS, nessun file locale (target `make fire`); per comuni fuori FVG la query torna vuota e la sotto-sezione resta senza dati

**Presidi di soccorso:**
- Defibrillatori (DAE) - elenco del Comune di Montereale Valcellina geocodificato (`aed_comune.geojson`), unito ai nodi OSM `emergency=defibrillator` da `build_rescue_geojson.py` (`merge_curated`, dedup ~60 m); popup con indirizzo, orari, accesso, e caveat per i punti geocodificati
- Elisuperfici HEMS per elisoccorso - *placeholder, dati reali da OSM*
- Rete idranti antincendio - *placeholder, dati reali da OSM*
- Punti di raccolta per emergenze - *placeholder, dati reali da OSM*
- Clic su un presidio → popup con i dettagli disponibili (nome/indirizzo, orari, gestore…)

**Da implementare:** vedi [TODO.md](../TODO.md) per il dettaglio delle attività in sospeso.

**Future scope:** modelli predittivi localizzati per allagamenti e accumulo acque meteoriche, integrabili con dati pluviometrici regionali.

## 3. Modulo Verde

Satellite-based environmental monitoring derived from Sentinel-2 L2A and Landsat 8/9 imagery, processed at 10-30 m resolution and clipped to the municipal boundary. Presented as 4 tabs, one indicator at a time, each with an icon, plain-language label, and a collapsible "Cos'è e come è calcolato?" FAQ:

- **Vegetazione (NDVI):** vegetation density classification in 6 categories (water, bare soil, sparse, moderate, dense, very dense) at 10 m resolution with area statistics panel
- **Ombra naturale:** streets and trails classified by natural canopy coverage percentage, computed by intersecting road/trail buffers with dense vegetation polygons
- **Salute vegetazione (NBR):** vegetation stress and fire risk index (B8A + B12) at 20 m resolution, with SCL-based masking of shadow and water pixels. Classes: healthy -> moderate -> water stress -> degraded -> bare/burned
- **Temperatura suolo (LST):** thermal surface mapping from Landsat 8 at 30 m resolution, classified from cool (forested valleys) to hot (exposed surfaces and built-up areas)

**GIS Pipeline scripts:**
- `process_green_layers.py` - NDVI from Sentinel-2 B04/B08
- `process_nbr.py` - NBR from Sentinel-2 B8A/B12 with SCL masking
- `process_shade_corridors.py` - canopy coverage per road/trail segment
- `process_lst.py` - LST from Landsat 8/9 lwir11 band

## 4. Segnala (Community Participation)

A lightweight, serverless reporting interface inspired by FixMyStreet and Stadt Wien, allowing citizens to submit georeferenced reports directly to the municipality with zero backend infrastructure. Designed as a guided, step-by-step flow: instructions and an empty map come first, and the report form only appears once a pin has been placed - the map stays clickable throughout so the pin can be repositioned without a separate "change location" step.

**Implemented:**
- **6 report categories** with Bootstrap Icons: Viabilità e strade, Sentieri e natura, Rifiuti e degrado, Illuminazione, Segnaletica, Proposta
- **Georeferenced reporting:** click on the map to place a pin; the form (category, title, description, optional photo) appears only after placement, and the pin can still be dragged/re-clicked to reposition
- **Photo attachment:** client-side image resize (canvas, max 1024 px, JPEG 75%) with thumbnail preview; photo filename included in the email body as a reminder to attach manually
- **Map markers:** white circle with category icon (Bootstrap Icons), hover popup showing title, category, and photo thumbnail
- **Category filters:** chip bar to filter the report list by category
- **Local persistence:** pending reports stored in `localStorage` - visible immediately on the map after submission, survive page refresh. Each own report can be deleted from its expanded detail ("Elimina segnalazione"), which also drops its vote state. There is no shared backend, so reports are per-device: one browser does not see another's.
- **Submission via `mailto:`:** pre-filled email to the municipality (subject + body with coordinates and description); no server required
- **Sidebar sync:** clicking a map marker selects and expands the corresponding sidebar item with smooth scroll
- **Upvoting:** each report has a "thumbs up" button with vote count; votes persist in `localStorage` (one vote per report per browser); clicking again removes the vote

**Planned:**
- Structured feedback export for local administrators
- Integration of lightweight computer vision models (YOLO) for automatic infrastructure hazard classification from citizen-submitted photographs
- **Cadastral parcel selection:** citizens select their own land parcel to auto-fill foglio/particella; data sourced from [ondata/dati_catastali](https://github.com/ondata/dati_catastali) (Parquet, CC BY 4.0), queryable via DuckDB-Wasm with no additional infrastructure

---

## Shared map controls

Every module's map ships the same control set, matching the integrated [LTSBikePlan](https://github.com/dclfbk/LTSBikePlan) reference implementation:

- **Style switcher** (top-left): a collapsible "Legenda" panel to pick Sfondo chiaro / estivo / ciclabile / scuro. Switching style preserves any active overlay (NDVI, LST, risk layers, etc.) and the current 3D terrain state.
- **3D terrain toggle**: elevation exaggeration via a free terrarium-encoded DEM (Mapterhorn), independent of which basemap style is active.
- **Address/place search**: Nominatim geocoding restricted to Italy, flies to the result's own bounding box.
- **PDF/image export**: snapshots the map's own WebGL canvas (`canvas.toDataURL()`) and lays it out on an A4 page via `jspdf`, with title and date footer.
- **Attribution**: `MapLibre | © Maptoolkit © Openstreetmap`.
