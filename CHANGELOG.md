# Changelog

All notable changes to getopendatafvg are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html): 0.x until
the first stable release, with the public API defined as exactly
`getopendatafvg.__all__`.

Every public name must appear somewhere in this file:
`tests/test_public_api.py` fails otherwise. A new export therefore needs an
entry here in the same change.

## [Unreleased]

### Added

- `fetch_known_dataset`, which dispatches a catalog entry to the right
  client (WFS or portal) so callers no longer branch on `entry.source`.
- Boundary filtering for portal entries:
  - through `KnownDataset.geometry_column`, using SoQL `within_box`;
  - through `KnownDataset.lon_lat_columns` plus `lon_lat_box_clause`, for
    datasets that store points as numeric longitude/latitude columns.
- `search_open_data_fvg` and `PortalAsset`, a full-text search over the
  portal's own catalog. It covers every asset type, including the saved
  views (`filter`) that `only=dataset` hides.
- ISTAT:
  - `fetch_employment_rate` and `FVG_NUTS_AREAS`. The flow has no comune
    granularity, and it uses the pre-2013 NUTS codes (`ITD4`).
  - `fetch_tourism_capacity` (down to comune) and `fetch_tourism_flows`
    (down to province).
  - `fetch_consumer_price_index` (down to province).
- `fetch_avalanche_sites` and `AvalancheSite`. These merge the
  ground-surveyed and photo-interpreted avalanche layers, grouped by site.
- Catalog grown from 43 to 94 entries:
  - 32 WFS layers;
  - 9 portal datasets;
  - one example entry per municipal budget family;
  - 7 ARPA FVG air-quality series under a new `aria` category.
- CI:
  - Python 3.11–3.13 matrix;
  - branch coverage with a 95% floor;
  - a weekly scheduled run of the live catalog checks.

### Fixed

- Five catalog entries pointed at the wrong WFS workspace, for example
  `IDROGRAF:CORSI_ACQUA` instead of `IRDAT:CORSI_ACQUA`.

## [0.1.0] - 2026-09-15

First release of the library, repurposed from an earlier project in this
repository.

### Added

- Satellite imagery:
  - `fetch_sentinel2_scene`, `CdseCredentials`, `Band`, `DEFAULT_BANDS`,
    `Sentinel2Scene`;
  - `fetch_landsat_scene`, `UsgsCredentials`, `LandsatScene`;
  - `NoCleanSceneFoundError`;
  - `sentinel2_scene_date`, `landsat_scene_date`.
- Indices and rasters: `compute_ndvi`, `compute_nbr`, `compute_lst`,
  `IndexRaster`, `classify_and_vectorize`, `ClassBreak`, `plot_index`.
- WFS: `fetch_wfs_features`, `fetch_and_clip_wfs_features`,
  `clip_to_boundary`.
- Open Data FVG portal: `fetch_open_data_fvg`, `within_box_clause`.
- Catalog: `CATALOG`, `KnownDataset`, `list_known_datasets`,
  `search_known_datasets`, starting with 43 entries.
- ISTAT SDMX:
  - `fetch_istat_dataflow`, `fetch_population_series`,
    `fetch_demographic_balance`, `fetch_demographic_indicators`,
    `fetch_bank_branches`, `fetch_income_series`;
  - a client-side rate limit;
  - the end-period off-by-one correction.
- OpenStreetMap: `query_overpass`, `fetch_overpass_elements`,
  `boundary_poly_filter`, `element_point`.
- Cadastre: `fetch_cadastral_parcels`, `region_parquet_name`.
- Terrain and geometry:
  - `DemSampler`, `compute_line_slope`, `compute_line_grade`,
    `slope_class_for_value`;
  - `build_coverage_union`, `line_coverage_pct`;
  - `build_pmtiles`, `TippecanoeNotFoundError`.
- Other sources: `fetch_historical_weather`, `DailyWeather`,
  `fetch_elevation`, `fetch_wikipedia_summary`.

[Unreleased]: https://github.com/leoventuroso/getopendatafvg/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/leoventuroso/getopendatafvg/releases/tag/v0.1.0
