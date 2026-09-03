# TODO - Montereale Valcellina Open

Open work: external data to receive, field surveys, future integrations.

---

## Soccorso ed Emergenza module

### Rii a rischio - to validate with the Gruppo Comunale di Protezione Civile
- Exact position of the Cian/Cjasarile/Bennata system (currently a zone point, faded marker).
- Whether "Rio Cao Malnisio" / "Rio Bala Busa" are the same survey as Cjasarile.
- The "06" rio (no name, no coordinates, 2007 photos), currently excluded from the map.

### Emergency assets - missing data
- **Hydrants** and **assembly points**: no data (placeholders emptied). Need a list from the water utility / comune or a survey, then mapping on OpenStreetMap and `make rescue`.
- **AEDs**: the `geocoded: true` points in `aed_comune.geojson` are placed from an address - verify them on the ground or replace them with OSM nodes as they get refined (the ~60 m dedup absorbs them). Add `access`, `opening_hours`, `defibrillator:location`, `operator` where known.

### Forest fires - possible extensions (same IRDAT FVG WFS)
- `ZONE_RISC:SUPERFICIE_BOSCATA_BRUCIATA` / `_PASCOLO` / `_NON_BOSCATA_BRUCIATA` - burned area by land cover (more granular than the perimeters; not used yet).

### Hydrometric part of the weather widget - needs a server-side feed
- The current-conditions + 24h rainfall widget on Home is done (Open-Meteo, client-side, cached).
- The river level of the Torrente Cellina still needs a source: OSMER (`dev.meteo.fvg.it/xml/stazioni/<COD>.xml`) sends **no CORS header** (a `fetch` from the static site is blocked) and carries meteo only. Options: (a) a scheduled GitHub Actions job that queries the FVG civil-protection hydro network CI-side and commits a small JSON the widget reads; (b) a tiny serverless proxy (Cloudflare Worker) that adds CORS.

---

## Segnala module (community participation)

### Reports shared between users - needs a backend
- Today every report lives only in its author's `localStorage` (+ `mailto:` email); nobody sees anyone else's, and only local "Delete" works.
- Options: (a) a managed backend such as Supabase (Postgres + API + RLS, anon key in the frontend) - real CRUD and deletion, but breaks the "no backend / zero cost" model; (b) `repository_dispatch` -> GitHub Actions rebuilding a shared file in the repo (sketched in `functions/`) - minutes of latency, needs a token proxy.
- "Real" deletion and shared votes depend on this choice.

### Report export for the administration
- CSV/PDF download of reports ordered by votes and area, to prioritise work.

### Automatic photo classification
- Lightweight in-browser model (YOLO/MobileNet) to suggest the category from the attached photo (e.g. pothole -> "Viabilità e strade").

### Cadastral (parcel) integration
- **In Segnala:** when the citizen drops the pin, look up which cadastral parcel it falls in and pre-fill the report with `foglio` + `particella` (and optionally show the parcel outline). Gives the comune an unambiguous legal reference for the location.
- **Dedicated view:** add a "Particelle catastali" toggle layer in the **Home** module (off by default; click a parcel to see foglio/particella and area). Home already shows the boundary, so the parcels fit its "know your territory" theme without adding a top-level nav item. A full standalone module would be overkill for how niche this is.
- Source: [ondata/dati_catastali](https://github.com/ondata/dati_catastali) - vector parcels for all of Italy as GeoParquet, CC BY 4.0 (credit OnData). Queryable via DuckDB-Wasm over HTTP Parquet, already used in the project. Caveats: parcel geometry is tens of MB per comune (Montereale is small, manageable), needs the DuckDB spatial extension in Wasm, and cadastral data has its own accuracy limits (a legal map, not a survey).
