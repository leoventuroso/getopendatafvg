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
Giulia-specific and national Italian data sources. For ISTAT
specifically, two existing tools were evaluated directly rather than
assumed adequate: istatapi [@istatapi2020] wraps the SDMX API but not
the endpoint-specific bugs and rate limit documented independently by
guida-api-istat [@guidaapiistat2020], which is itself documentation
rather than a library. getopendatafvg's ISTAT module implements the
corrections both describe against ISTAT's modern SDMX endpoint directly
rather than depending on either - specifically, a silent off-by-one in
ISTAT's `endPeriod` query parameter and a 5-requests-per-minute limit
whose violation risks a 1-2 day IP block, both confirmed against live
requests rather than assumed from either source. For the region's own
WFS GeoServer and
Socrata open data portal, no prior Python wrapper of any kind was
found; getopendatafvg adds a curated, live-verified catalog of known
datasets across both, on top of generic fetch functions usable for any
layer or dataset in either source.

# Software design

Every function follows the same convention: a boundary or point in
WGS84 in, data clipped to it out - callers never have to know or match
a source's native coordinate reference system. Raw data extraction and
numeric computation (an NDVI raster, a slope percentage, a WFS feature
list) are kept separate from any classification, color, or other
presentation choice, which is left for the caller to decide; this
mirrors the library's own origin, extracted piece by piece from a civic
mapping platform's data pipeline where that separation had not
originally been made and had to be untangled. Every network-facing
function is covered by unit tests with the HTTP layer mocked, and was
additionally live-verified against the real external service during
development rather than only against a mock.

# Research impact statement

getopendatafvg was first released in September 2026 and has not yet
been cited in published work. Its data-extraction logic was originally
developed inline within Mappa Civica, an open-source civic platform for
the comune of Montereale Valcellina, and is being extracted into this
standalone library specifically so it can be adopted back into that
platform's own pipeline and reused by other municipalities without
duplicating the underlying extraction code - a concrete, near-term
adoption path rather than a hypothetical one.

# AI usage disclosure

Parts of this project's code, tests, and documentation were developed
with the assistance of Claude (Anthropic), including Claude Code, used
for code generation, refactoring, test scaffolding, and documentation
drafting. Every function was directed, reviewed, and live-verified
against the real external service by the author before being merged;
which modules to build, what conventions to follow, and what to reject
were the author's decisions, not delegated to the AI.

# Acknowledgements

getopendatafvg's data-extraction logic originates in the pipeline built
for Mappa Civica, a civic platform for the comune of Montereale
Valcellina.

# References
