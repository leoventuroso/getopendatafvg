---
title: 'getopendatafvg: a Python toolkit for open geographic, socio-economic, and environmental data in Friuli Venezia Giulia'
tags:
  - Python
  - geographic information systems
  - remote sensing
  - open data
  - Friuli Venezia Giulia
  - Italy
authors:
  - name: Leonardo Venturoso
    affiliation: 1
affiliations:
  - name: Fraunhofer Italia
    index: 1
date: 15 September 2026
bibliography: paper.bib
---

# Summary

getopendatafvg is a Python library that extracts open geographic,
socio-economic, and environmental data for an area in Friuli Venezia
Giulia, a region in northeastern Italy - and, for most of its sources,
anywhere in Italy. It wraps satellite imagery search and download
(Sentinel-2 and Landsat), the vegetation, burn-severity and temperature
indices computed from that imagery, government hazard and
infrastructure data served over OGC WFS and a regional Socrata open
data portal, OpenStreetMap features via Overpass
[@haklay2008openstreetmap], Italian national statistics (ISTAT) via its
SDMX API, cadastral parcels queried directly from a national Parquet
dataset via DuckDB's httpfs extension [@raasveldt2019duckdb], terrain
slope from a digital elevation model, and a
handful of smaller sources (historical weather, point elevation,
Wikipedia summaries). Every function takes a boundary - a comune, a
custom polygon, a bounding box - and returns data clipped to it, built
on shapely [@shapely2021] and rasterio [@rasterio] internally so
callers work with ordinary Python geometry objects rather than a
source-specific format.

As of this writing, the library exposes 52 public functions and classes
across 18 modules (about 2,200 lines of source), backed by a test suite
of over 100 cases and a curated, live-verified catalog of 43 named
Friuli Venezia Giulia datasets spanning natural hazard, hydrology,
protected areas, land use, energy, and administrative boundary data.

# Statement of need

Extracting open data for Friuli Venezia Giulia means a different API,
authentication scheme, and set of undocumented quirks for every source:
Copernicus' S3-based Sentinel-2 download, USGS's M2M product-ID
matching, ISTAT's SDMX endpoint (which silently returns one year more
than requested and blocks an IP for 1-2 days past 5 requests/minute), a
regional GeoServer exposing over a thousand WFS layers with no single
discovery point, and a Socrata portal with its own SoQL query language.
Anyone doing GIS, environmental, or socio-economic analysis on this
region - researchers, civic-technology developers, local public
administrations - ends up re-discovering and re-fixing the same
handful of undocumented behaviors before reaching the actual analysis.
getopendatafvg is that discovery and fixing work, done once: a
consistent function per data source, with the quirks already handled
and tested against the real services rather than left for the next
person to hit.

# State of the field

No single library currently covers this combination of Friuli Venezia
Giulia-specific and national Italian data sources, and several of the
established single-purpose tools it would otherwise have depended on no
longer work against these sources' current APIs. For Sentinel-2,
sentinelsat [@sentinelsat2015] is the standard Python client for
Copernicus satellite data, but its repository is now archived and its
own documentation states it does not support the Copernicus Data Space
Ecosystem (CDSE) that replaced the SciHub service it was built for. For
Landsat, landsatxplore [@landsatxplore2018] plays the equivalent role
for USGS EarthExplorer, but its README states it is "no longer
maintained." getopendatafvg's `sentinel2.py` and `landsat.py` modules
were built and tested directly against the current CDSE and USGS M2M
APIs specifically because neither predecessor works against them
anymore.

For OGC WFS services generally, OWSLib [@owslib2012] is the actively
maintained standard Python client, but it is a low-level, protocol-
faithful library: it does not clip results to an arbitrary boundary and
has no notion of a dataset catalog across services or regions.
getopendatafvg's `wfs.py` adds a boundary-in/clipped-data-out
convenience layer on the same protocol, and `catalog.py` adds a
curated, live-verified index of named Friuli Venezia Giulia datasets
across both the region's WFS GeoServer (about 1,150 layers across 52
workspaces) and its separate Socrata open data portal (about 300
datasets) - discovery that would otherwise mean querying each source's
own `GetCapabilities`/listing API and reading through it by hand.

For ISTAT specifically, two existing tools were evaluated directly
rather than assumed adequate: istatapi [@istatapi2020] wraps the SDMX
API but not the endpoint-specific bugs and rate limit documented
independently by guida-api-istat [@guidaapiistat2020], which is itself
documentation rather than a library. getopendatafvg's `istat.py`
implements the corrections both describe against ISTAT's modern SDMX
endpoint directly rather than depending on either - specifically, a
silent off-by-one in ISTAT's `endPeriod` query parameter and a
5-requests-per-minute limit whose violation risks a 1-2 day IP block,
both confirmed against live requests rather than assumed from either
source.

# Software design

Every function follows the same convention: a boundary or point in
WGS84 in, data clipped to it out - callers never have to know or match
a source's native coordinate reference system, or a satellite scene's
own UTM zone in the case of `indices.py` and `dem.py`, which reproject
internally instead of requiring pre-reprojected input. Raw data
extraction and numeric computation (an NDVI raster in `indices.py`, a
slope percentage in `dem.py`, a WFS feature list in `wfs.py`) are kept
separate from any classification, color, or other presentation choice,
which `vectorize.py`'s `classify_and_vectorize` takes as an explicit,
caller-supplied argument rather than deciding internally; this mirrors
the library's own origin, extracted piece by piece from a civic mapping
platform's data pipeline where that separation had not originally been
made and had to be untangled. Two modules are deliberately generic
rather than Friuli Venezia Giulia-specific: `wfs.py` and
`open_data_fvg.py` work against any WFS service or Socrata portal
respectively, with `catalog.py` layered on top as the
region-specific, curated part. Every network-facing function is
covered by unit tests with the HTTP layer mocked, and was additionally
live-verified against the real external service during development
rather than only against a mock.

# Research impact statement

getopendatafvg was first released in September 2026 and has not yet
been cited in published work or adopted by other research groups; it is
reported at this early stage rather than left unaddressed, as
recommended for genuinely new software. Its near-term significance
rests on two checkable facts rather than a projection. First, its ISTAT
module corrects two documented defects in the modern SDMX endpoint - a
silent off-by-one in the `endPeriod` parameter and an unenforced
5-requests-per-minute limit whose violation risks a 1-2 day IP block -
that existing Italian open-data tooling does not fully account for on
its own [@istatapi2020; @guidaapiistat2020]. Second, the library
consolidates access to institutional hazard, environmental, and
demographic datasets - regional landslide and wildfire catalogs,
Copernicus and USGS satellite archives, national cadastral records -
that already underpin ongoing civic and environmental risk-monitoring
work in the region, behind a single tested and documented interface
rather than each source's own undocumented access path.

# AI usage disclosure

Claude models (Anthropic), accessed through Claude Code, were used for
test scaffolding during development. All tests were reviewed and
validated by the author.

# Acknowledgements

getopendatafvg's data-extraction logic originates in the pipeline built
for Mappa Civica, a civic platform for the comune of Montereale
Valcellina. We thank the open-source communities behind shapely,
rasterio, and DuckDB, whose libraries this project builds on directly.
This work received no external funding or grant support.

# References
