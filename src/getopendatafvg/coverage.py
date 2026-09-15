"""What percentage of a buffered line intersects a polygon coverage layer.

Originally built for "how much of this road/trail is shaded by tree
canopy" (buffer the road, intersect with dense-vegetation polygons), but
the operation itself has nothing to do with shade specifically - buffer a
line, see how much of it falls inside some area of interest. The same
shape answers "how much of this trail is inside a flood-risk zone" or
"how much of this road is within a protected area", so it's kept generic:
callers decide what `coverage` means by choosing what polygons go into it
(dense vegetation, a hazard zone, anything).
"""

from __future__ import annotations

from typing import Any

from rasterio.crs import CRS
from rasterio.warp import transform_geom
from shapely.geometry import shape
from shapely.geometry.base import BaseGeometry
from shapely.ops import unary_union
from shapely.validation import make_valid

WGS84 = CRS.from_epsg(4326)

# UTM zone 33N - appropriate for Friuli Venezia Giulia. Pass your own `crs`
# for other areas; buffering and area math need a projected CRS to be
# metrically correct, so this can't default to WGS84 itself.
DEFAULT_CRS = CRS.from_epsg(32633)

MIN_LINE_LENGTH_M = 10


def build_coverage_union(
    polygons: list[dict[str, Any]],
    crs: CRS = DEFAULT_CRS,
) -> BaseGeometry:
    """Union a list of GeoJSON polygon geometries (WGS84) into one
    coverage area, reprojected to `crs`. Invalid geometries are repaired
    (the same make_valid fix used elsewhere in this library for
    real-world boundary data) rather than skipped.
    """
    polys = []
    for geom in polygons:
        geom_proj = make_valid(shape(transform_geom(WGS84, crs, geom)))
        if not geom_proj.is_empty:
            polys.append(geom_proj)
    return make_valid(unary_union(polys))


def line_coverage_pct(
    line: dict[str, Any],
    buffer_m: float,
    coverage: BaseGeometry,
    crs: CRS = DEFAULT_CRS,
    min_line_length_m: float = MIN_LINE_LENGTH_M,
) -> float:
    """Percentage (0-100) of `line` (a GeoJSON LineString, WGS84),
    buffered by `buffer_m` on each side, that intersects `coverage` (a
    geometry already in `crs`, e.g. from build_coverage_union).

    Returns 0 for a line shorter than `min_line_length_m` or an empty
    buffer, rather than raising - a line with no meaningful length simply
    has no meaningful coverage to report.
    """
    geom_proj = shape(transform_geom(WGS84, crs, line))
    if geom_proj.is_empty or geom_proj.length < min_line_length_m:
        return 0.0

    buffer_geom = geom_proj.buffer(buffer_m, cap_style='flat')
    if buffer_geom.is_empty or buffer_geom.area == 0:
        return 0.0

    intersection = buffer_geom.intersection(coverage)
    return (intersection.area / buffer_geom.area) * 100
