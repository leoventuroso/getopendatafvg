# Deploying for another comune

This platform was built for Montereale Valcellina, but the code is not tied to
that comune: everything territory-specific lives in a single config file plus a
handful of raw data files. To adapt it to another comune, source your own raw
data (see below) and fill in the files listed here - you do not need to touch
the application code.

---

## 1. Configuration - `frontend/src/comune.config.json`

The single source of truth, read both by the frontend (`frontend/src/config.ts`)
and by every Python pipeline script (`pipeline/lib/comune_config.py`).

```jsonc
{
  "name": "Comune name",
  "province": "Province name",
  "region": "Region name",
  "istatCode": "123456",          // comune ISTAT code
  "provinceIstatCode": "ITDxx",   // province NUTS3 ISTAT code
  "cadastralCode": "X000",        // codice catastale / Belfiore (for the parcels layer)
  "osmAreaId": 3600000000,        // OSM relation + 3600000000, see below
  "email": "info@comune.example.it",
  "boundaryFile": "frontend/src/data/municipalBoundary.json",
  "map": { "center": [lon, lat], "zoom": 12 },
  "ltsEmbedView": { "lat": 0, "lon": 0, "zoom": 12.86 }
}
```

**Finding the values:**
- `osmAreaId` - look the comune up on [openstreetmap.org](https://www.openstreetmap.org),
  open the administrative boundary relation, take its ID and add `3600000000`
  (the Overpass convention for area queries: `relation id + 3600000000`).
- `istatCode` / `provinceIstatCode` - [ISTAT statistical codes of administrative units](https://www.istat.it/it/archivio/6789).
- `cadastralCode` - the comune's codice catastale (a.k.a. codice Belfiore, e.g. `F596`). Used by `make catasto` to pull the parcels layer; omit it (or leave outside FVG-style regions with no AdE cadastre, e.g. Bolzano/Trento) and the layer is simply empty. Look it up in the ISTAT "Codici statistici" table (it lists the cadastral code alongside the ISTAT one).
- `ltsEmbedView` - lat/lon/zoom of any point inside the comune: the
  [stressinbici.it](https://stressinbici.it) embed swaps to the right comune on
  its own, no slug needed.

---

## 2. Municipal boundary - `frontend/src/data/municipalBoundary.json`

A single GeoJSON `Feature` (`Polygon`/`MultiPolygon` geometry, EPSG:4326) with
the administrative boundary. Used to clip NDVI, NBR and LST to the comune area,
and the fire-danger overlay.

**Where to get it:** export the boundary from the comune's OSM relation (e.g.
via Nominatim: `https://nominatim.openstreetmap.org/search?q=<comune>&polygon_geojson=1&format=jsonv2`),
or from ISTAT administrative boundaries.

---

## 3. Frazioni and hamlets - `frontend/src/data/localities.json`

A hand-curated list of frazioni/hamlets with name, coordinates and an
approximate radius (in metres) for the Home panel. It cannot be derived
reliably from OSM for every comune - it is curated data, not a downloadable
raw dataset. Format: use the existing file as an example.

If your comune has no frazioni, leave `"localities": []`.

---

## 4. Exclusion zones (optional) - `frontend/src/data/exclusions.json`

Only if you need to manually exclude a specific area from some layers (e.g. a
zone OSM tags inconsistently with reality). If you don't need it, delete the
file or leave it with `"features": []` - no error, the pipeline simply excludes
nothing.

---

## 5. Municipal statistics - `frontend/public/data/municipality_stats.json`

This file is a seed you fill in by hand once (name, province, region, ISTAT
code, and the facts no API provides: peaks, pharmacy, schools, nearest
emergency room, seismic zone). `pipeline/scripts/fetch_istat_stats.py` reads it
and updates **only** the fields available via the ISTAT SDMX API (population,
households, density, average age), leaving the manual fields untouched. Copy
the structure of the existing file, blank out the Montereale Valcellina values
and fill in your own.

---

## 6. Raw satellite and DEM data (you source these)

These files are **not in the repo** (gitignored, too large) and must be
downloaded for your comune's area:

| File | Used for | Where to download |
|---|---|---|
| `frontend/src/data/*.SAFE/` (Sentinel-2 L2A scene) | NDVI, NBR (Verde module) | [Copernicus Browser](https://browser.dataspace.copernicus.eu/) |
| `frontend/src/data/*.tif` (Landsat lwir11 band) | LST - surface temperature | [USGS EarthExplorer](https://earthexplorer.usgs.gov/), Collection 2 L2 |
| `frontend/src/data/dem.tif` (DEM/LiDAR) | Trail / cycleway slope | Your region's LiDAR/DEM portal, or [Copernicus DEM](https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model) |

Once downloaded, run the pipeline (`cd pipeline && make all` - see
[pipeline/README.md](pipeline/README.md) for individual targets).

---

## 7. Deploy

GitHub Pages always publishes at the root of the repo name
(`<user>.github.io/<repo-name>/`). Two options:

**A - the comune name is not in the link** (repo dedicated to one comune, e.g.
`mappa-civica-<comune>`):
1. Fork/rename the repo to that name.
2. Update `frontend/vite.config.ts` -> `base: '/<repo-name>/'`.
3. `.github/workflows/deploy.yml` stays as is (publishes `frontend/dist`
   directly).

**B - generic repo name, comune as an extra URL segment** (e.g. repo
`mappa-civica`, link `.../mappa-civica/<comune>/` - this repo's own setup):
1. Update `frontend/vite.config.ts` -> `base: '/<repo-name>/<comune>/'`.
2. In `.github/workflows/deploy.yml`, the "Assemble Pages artifact" step copies
   `frontend/dist` into `publish/<comune>/` instead of publishing it at the
   root - change `montereale-valcellina` to your comune slug in that step (the
   only comune-specific point left in the workflow).

`refresh-data.yml` works unchanged in both cases: it has nothing
comune-specific, it just runs `make <target>`.

Beyond that, you don't need to touch any React component or Python script other
than the files listed above: they all read from `comune.config.json` or the
data files.
