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

Planned next, roughly in order: automated Sentinel-2 search and download
with a cloud-cover fallback, the same for Landsat, a generic helper for
querying an OGC WFS service and clipping the result to a boundary,
NDVI/NBR/LST computation from a downloaded scene, and a visualization
layer on top of all of it.

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
