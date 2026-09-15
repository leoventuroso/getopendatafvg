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
  bands, clipped to a boundary. Deliberately stop at the raw numbers -
  classification into named classes, colors, and vectorization to
  polygons are visualization choices left to the caller.

Planned next: a visualization layer (classification, palettes,
vectorization to polygons) on top of the indices above.

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
