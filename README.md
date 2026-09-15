<div align="center">
  <img src="getopendatafvglogo.png" alt="getopendatafvg" width="700" style="margin-bottom: -30px;">
</div>

# getopendatafvg

Python toolkit to extract open geographic, socio-economic and
environmental data for an area in Friuli Venezia Giulia (or, for most of
these sources, anywhere in Italy): satellite imagery and the vegetation/
burn-severity/temperature indices computed from it, government hazard and
infrastructure data via WFS, OpenStreetMap features, ISTAT statistics,
cadastral parcels, and terrain slope. Every function takes a boundary
(comune, custom polygon, bounding box) and returns data clipped to it.

## Statement of need

Extracting open data for Friuli Venezia Giulia means a different API,
auth scheme, and set of undocumented quirks for every source: Copernicus'
S3-based Sentinel-2 download, USGS's M2M product-ID matching, ISTAT's
SDMX endpoint (which silently returns one year more than requested and
blocks an IP for 1-2 days past 5 requests/minute), a regional GeoServer
with over a thousand WFS layers and no single discovery point, and a
Socrata portal with its own SoQL query language. Anyone doing GIS,
environmental, or socio-economic analysis on this region - researchers,
civic-tech developers, local public administrations - ends up
re-discovering and re-fixing the same handful of undocumented behaviors
before getting to the actual analysis. getopendatafvg is that discovery
and fixing work, done once: a consistent function per data source
(boundary in, clipped data out), with the quirks already handled and
tested against the real services rather than left for the next person
to hit.

## Installation

```bash
pip install git+https://github.com/leoventuroso/getopendatafvg.git
```

Add `[viz]` for the optional matplotlib-based preview function:

```bash
pip install "getopendatafvg[viz] @ git+https://github.com/leoventuroso/getopendatafvg.git"
```

## Satellite imagery: Sentinel-2 and Landsat

Search for the most recent, sufficiently cloud-free scene over a
boundary - walking backward in time automatically until one passes the
threshold - and download only the bands you need.

```python
from pathlib import Path
from shapely.geometry import box
from getopendatafvg import fetch_sentinel2_scene, CdseCredentials

boundary = box(12.5648, 46.0704, 12.7251, 46.1911)

credentials = CdseCredentials(
    username="you@example.com", password="...",
    s3_access_key="...", s3_secret_key="...",  # from CDSE's S3 Keys Manager
)
scene = fetch_sentinel2_scene(boundary, credentials, out_dir=Path("data/raw"))
print(scene.scene_date, scene.cloud_cover_pct, scene.safe_dir)
```

Credentials: a free [Copernicus Data Space Ecosystem](https://dataspace.copernicus.eu/)
account (`username`/`password`), plus S3 keys generated separately from
its dashboard's S3 Keys Manager.

```python
from getopendatafvg import fetch_landsat_scene, UsgsCredentials

credentials = UsgsCredentials(username="your-ers-username", token="...")
scene = fetch_landsat_scene(boundary, credentials, out_dir=Path("data/raw"))
```

Credentials: a free [USGS EROS](https://ers.cr.usgs.gov/register) account
with M2M access approved, and an application token from your USGS profile.

Both respect the source's rate limits and never overwrite existing output
if no scene qualifies within the lookback window.

## Vegetation, burn severity and temperature indices

Compute a continuous-valued raster from downloaded bands, then optionally
classify it into named classes and vectorize to GeoJSON - no color or
palette baked in, so the output is plain data usable in QGIS or any
renderer of your choice.

```python
from getopendatafvg import compute_ndvi, ClassBreak, classify_and_vectorize

raster = compute_ndvi(red_band_path, nir_band_path, boundary)

breaks = [
    ClassBreak(-1.0, 0.15, "bare"),
    ClassBreak(0.15, 0.5, "moderate"),
    ClassBreak(0.5, 1.0, "dense"),
]
features = classify_and_vectorize(raster, breaks, min_area_m2=2500)
```

`compute_nbr` (burn severity / vegetation stress) and `compute_lst` (land
surface temperature, from a Landsat thermal band) work the same way.

A quick static preview, for exploration in a notebook (needs the `viz` extra):

```python
from getopendatafvg import plot_index

fig = plot_index(raster, title="NDVI")
fig.savefig("ndvi.png")
```

## Finding a dataset

Both the WFS GeoServer below and the Open Data FVG portal further down
need you to already know a layer's type_name or a dataset's resource
id. A small curated catalog of the ones worth knowing about ships with
the library, so you don't have to rediscover them yourself:

```python
from getopendatafvg import list_known_datasets, search_known_datasets

list_known_datasets(category="rischio naturale")
search_known_datasets("incendi")
```

Each result is a `KnownDataset(name, source, identifier, category,
description)` - `source` and `identifier` are exactly what
`fetch_wfs_features`/`fetch_and_clip_wfs_features` (with
`catalog.WFS_BASE_URL`) or `fetch_open_data_fvg` need. It's a curated
subset, not the full underlying catalogs (about 1150 WFS layers, about
300 portal datasets) - most of what's left out is either a near-duplicate
of a listed entry, split across many per-tile/per-comune files, or a
technical code not usable without its own legend.

## Government data via WFS

Query any OGC WFS service (bbox or CQL filter, whichever it honours) and
clip results precisely to your boundary:

```python
from getopendatafvg import fetch_and_clip_wfs_features

results = fetch_and_clip_wfs_features(
    "https://serviziogc.regione.fvg.it/geoserver/ZONE_RISC/wfs",
    "ZONE_RISC:V_INCENDI_CT",
    boundary,
    cql_filter="COMUNE='Montereale Valcellina'",
)
for properties, geometry in results:
    print(properties["ANNO_FNIB"], properties["LOCALITA"])
```

Works the same way against national services, e.g. ISPRA's landslide
hazard WFS - no comune-specific setup needed, it's the same function.

## OpenStreetMap data

```python
from getopendatafvg import fetch_overpass_elements, element_point

elements = fetch_overpass_elements(['node["natural"="peak"]'], boundary)
for el in elements:
    print(el["tags"].get("name"), element_point(el))
```

Any Overpass QL selector works: trails, bike infrastructure, defibrillators,
water points, hospitals - filtered by your boundary geometry directly, not
a pre-known OSM relation id, so it works for any area. Tries multiple
public Overpass mirrors automatically if one is down.

## ISTAT statistics

```python
from getopendatafvg import fetch_population_series, fetch_demographic_balance, fetch_bank_branches, fetch_income_series

fetch_population_series("093042")        # yearly population, 2019 onward
fetch_demographic_balance("093042")      # households, density
fetch_bank_branches("093042")            # comune ISTAT code
fetch_income_series("093042")            # yearly aggregate + average taxable income (IRPEF)
```

No extra setup - ISTAT's API needs no authentication. Requests are
throttled automatically to stay under its rate limit.

## Cadastral parcels

```python
from getopendatafvg import fetch_cadastral_parcels

parcels = fetch_cadastral_parcels("F596", "Friuli-Venezia Giulia")  # comune's codice catastale
```

One point per parcel (foglio, particella) - land parcels only, no owner
names or valuations. Covers all of Italy, not just FVG.

To publish the result as vector tiles (needs the separate `tippecanoe`
binary on PATH):

```python
from getopendatafvg import build_pmtiles

build_pmtiles(Path("parcels.geojson"), Path("parcels.pmtiles"), "catasto")
```

## Terrain slope

```python
from shapely.geometry import LineString
from getopendatafvg import DemSampler, compute_line_slope, compute_line_grade

trail = LineString([(12.60, 46.10), (12.61, 46.11)])
with DemSampler.open("dem.tif") as dem:
    distances, elevations = dem.sample_line(trail)

slope_pct = compute_line_slope(distances, elevations)   # average, unsigned
grade_pct = compute_line_grade(distances, elevations)   # net, start-to-end, signed
```

Give it a DEM in whatever projected CRS it's in - it's read from the file
and used internally, so lines can stay in WGS84.

For a single point, downloading a whole DEM is overkill:

```python
from getopendatafvg import fetch_elevation

elevation_m = fetch_elevation(46.0704, 12.6289)
```

Backed by [Open-Elevation](https://open-elevation.com/) (SRTM data,
free, no API key), covers anywhere in the world.

## Open Data FVG portal

The region's own open data portal (dati.friuliveneziagiulia.it) hosts
about 300 datasets not on its WFS GeoServer above: municipal budgets,
election results, demographic time series, bike paths, pharmacies, and
more.

```python
from shapely.geometry import box
from getopendatafvg import fetch_open_data_fvg, within_box_clause

boundary = box(12.5648, 46.0704, 12.7251, 46.1911)
rows = fetch_open_data_fvg(
    "7eat-pecq",  # "Piste Ciclabili" - the resource id from the dataset's page
    where=within_box_clause("the_geom", boundary),
)
```

Every dataset has its own schema (and, if it has one at all, its own
geometry column name and type), so rows come back as plain dicts, as
the portal returns them - not the uniform shape `fetch_wfs_features`
returns. `where`/`select`/`order` are raw
[SoQL](https://dev.socrata.com/docs/queries/) clauses, e.g.
`where="comune='UDINE'"`.

## Coverage analysis

What percentage of a buffered line (a road, a trail) falls inside a
polygon layer - originally built for tree-canopy shade, works for any
buffer-and-overlap question:

```python
from getopendatafvg import build_coverage_union, line_coverage_pct

coverage = build_coverage_union(dense_vegetation_polygons)
shade_pct = line_coverage_pct(road_geometry, buffer_m=15, coverage=coverage)
```

## Historical weather

```python
from getopendatafvg import fetch_historical_weather

weather = fetch_historical_weather(46.1055, 12.6289, "2024-01-01", "2024-01-31")
for date, temp, rain in zip(weather.dates, weather.temperature_mean_c, weather.precipitation_mm):
    print(date, temp, rain)
```

Daily mean temperature and total precipitation for a point, from
[Open-Meteo](https://open-meteo.com/)'s historical archive - free, no
API key, global coverage back to 1940. Useful for correlating other
data (a landslide event, a fire, a satellite scene) with the weather
around it.

## Wikipedia summaries

```python
from getopendatafvg import fetch_wikipedia_summary

summary = fetch_wikipedia_summary("Montereale Valcellina")
```

Plain-text page summary, free and no API key. Tries the given title
first, then falls back to Wikipedia's own search if it doesn't exist
or is a disambiguation page. Returns `None` if nothing matches - no
classification (touristic, notable, ...) is done here, that's a
decision for the caller.

## License

[MIT](LICENSE)
