# getopendatafvg

A Python toolkit for extracting and visualizing open geographic,
socio-economic and environmental data for Friuli Venezia Giulia: a comune,
a custom boundary, or a bounding box. It grew out of the data pipeline
behind [Mappa Civica](https://github.com/BeneComune/mappa-civica), a civic
mapping platform for the comune of Montereale Valcellina, and is being
pulled out into a standalone, reusable library one piece at a time.

This repository used to host an earlier Vite/React prototype of Mappa
Civica itself. That history is still here (see the commit log before this
README), but the code has moved on to
[the Next.js rewrite](https://github.com/BeneComune/mappa-civica); this
repository is now dedicated to the extraction and visualization library
instead.

## Status

Early and incremental. The pipeline it comes from already does quite a lot
in production (searching and downloading the most recent, cloud-free
Sentinel-2 and Landsat scenes over a boundary with an automatic fallback
when the newest pass is too cloudy, querying government WFS services and
clipping the results, computing vegetation and land-surface-temperature
indices), but each of those is being ported here separately, generalized
away from anything specific to one deployment, and given real tests before
it counts as done. What's implemented so far:

- `sentinel2_scene_date` / `landsat_scene_date`: parse the acquisition date
  out of a Sentinel-2 or Landsat product's official filename.
- `fetch_sentinel2_scene`: search the Copernicus Data Space Ecosystem for
  the most recent Sentinel-2 L2A scene covering a boundary, walking
  backward in time until one passes a cloud-cover threshold, and download
  the requested bands.
- `fetch_landsat_scene`: the same idea for Landsat Collection 2 Level-2,
  via the USGS M2M API.
- `fetch_wfs_features` / `fetch_and_clip_wfs_features`: query an OGC WFS
  service (bbox or CQL filter, whichever the service actually honours)
  and clip each result precisely to a boundary.
- `compute_ndvi` / `compute_nbr` / `compute_lst`: continuous-valued
  vegetation/burn-severity/temperature index rasters from downloaded
  bands, clipped to a boundary.
- `classify_and_vectorize`: classify an index raster into named classes
  (your own breakpoints, not baked in) and vectorize it to plain
  GeoJSON - a `class` label and an area, no color. Useful on its own in
  QGIS or any other tool, not tied to one particular renderer.
- `plot_index` (needs the `viz` extra): a quick static matplotlib preview
  of an index raster, for exploration in a notebook. Not a substitute for
  a real interactive map - Mappa Civica's own web map already covers
  that, with colors and a legend this module doesn't try to duplicate.
- `fetch_population_series` / `fetch_demographic_balance` /
  `fetch_demographic_indicators` / `fetch_bank_branches`: ISTAT
  statistics via the modern SDMX REST API only - no dependency on
  `istatapi` or the legacy `sdmx.istat.it` endpoint it wraps, which now
  redirects every data query to its own homepage instead of serving
  data (confirmed live, not assumed). Built-in client-side throttling
  keeps every request under ISTAT's 5-requests-per-minute limit
  (exceeding it risks a 1-2 *day* IP block), and a documented
  `endPeriod` server bug (returns one year more than requested) is
  corrected internally.

- `fetch_overpass_elements` / `query_overpass`: OSM features within a
  boundary via the Overpass API, trying multiple public mirrors in order.
  Filters by the boundary geometry directly (Overpass QL's `poly:`
  filter), not a pre-known OSM relation id, so it works for any area.
- `line_coverage_pct` / `build_coverage_union`: what percentage of a
  buffered line falls inside a polygon coverage layer. Originally "how
  much of this road/trail is shaded by tree canopy", generalized to any
  buffer-and-overlap question (flood-risk exposure, protected-area
  overlap, ...) - the caller decides what `coverage` means by choosing
  what polygons go into it.

- `DemSampler` / `compute_line_slope` / `compute_line_grade`: sample a
  DEM along a line and derive its average slope and net grade. The DEM's
  own CRS is read from the file and used internally - a caller passes
  lines in WGS84 and never needs to know or match whatever projected CRS
  a particular DEM happens to use.

- `fetch_cadastral_parcels`: cadastral parcel points (foglio, particella)
  for a comune, from onData's national republish of the Agenzia delle
  Entrate cadastral data, queried by HTTP range request via DuckDB so the
  full per-region file is never downloaded.
- `build_pmtiles` (needs the separate `tippecanoe` binary on PATH):
  convert a GeoJSON file to PMTiles vector tiles. A missing tippecanoe
  raises `TippecanoeNotFoundError` instead of failing deep inside a
  subprocess call with no clear cause.

That's every piece of the original roadmap ported, plus ISTAT, Overpass,
the shade-corridor coverage calculation, DEM slope, and cadastral data.
From here, growth is demand-driven rather than following a fixed list.

## Installation

Not yet published to PyPI. For now:

```bash
pip install git+https://github.com/leoventuroso/getopendatafvg.git
```

## Development

```bash
pip install -e ".[dev]"
pytest
ruff check .
```

## License

[MIT](LICENSE)
