"""Query an OGC WFS service and clip the results to a boundary.

Government WFS services disagree on how to filter by area: some (modern
GeoServer, WFS 2.0) accept a plain `bbox` GET parameter; others only
honour a spatial predicate embedded in a `CQL_FILTER` string (e.g.
`BBOX(GEOMETRY,...)`, possibly combined with an attribute filter). Either
way, a bbox filter is a superset of what actually intersects the
boundary, not an exact cut - clip_to_boundary does the precise clip
client-side afterward.
"""

from __future__ import annotations

from typing import Any

import requests
from shapely import force_2d
from shapely.geometry import shape
from shapely.geometry.base import BaseGeometry


def fetch_wfs_features(
    url: str,
    type_name: str,
    boundary: BaseGeometry | None = None,
    cql_filter: str | None = None,
    version: str = '2.0.0',
    count: int = 1000,
    timeout: int = 120,
) -> list[dict[str, Any]]:
    """GetFeature (as GeoJSON) from a WFS.

    If `cql_filter` is given it's sent as-is (build your own BBOX(...) or
    attribute predicate into it if you need one - some services only
    accept the spatial filter this way). Otherwise, if `boundary` is
    given, its bounding box is sent as the `bbox` parameter. Passing
    neither returns every feature of `type_name` - only sensible for
    small layers.
    """
    params: dict[str, str] = {
        'service': 'WFS',
        'version': version,
        'request': 'GetFeature',
        'typeNames': type_name,
        'outputFormat': 'application/json',
        'srsName': 'EPSG:4326',
        'count': str(count),
    }
    if cql_filter is not None:
        params['CQL_FILTER'] = cql_filter
    elif boundary is not None:
        minx, miny, maxx, maxy = boundary.bounds
        params['bbox'] = f'{minx},{miny},{maxx},{maxy},EPSG:4326'

    resp = requests.get(url, params=params, timeout=timeout, headers={'User-Agent': 'getopendatafvg/0.1'})
    resp.raise_for_status()
    return resp.json().get('features', [])


def clip_to_boundary(geometry: dict[str, Any], boundary: BaseGeometry) -> BaseGeometry | None:
    """Clip a GeoJSON geometry dict to `boundary`, repairing minor
    self-intersections first (force_2d + buffer(0), the standard fix for
    real-world boundary/WFS data with mixed ring winding or near-duplicate
    vertices). Returns None if the clipped result is empty - the
    feature's bbox intersected `boundary`'s bbox (why it came back from a
    bbox-filtered fetch at all) but the actual geometry doesn't.
    """
    clipped = force_2d(shape(geometry).buffer(0)).intersection(boundary)
    if clipped.is_empty or clipped.area <= 0:
        return None
    return clipped


def fetch_and_clip_wfs_features(
    url: str,
    type_name: str,
    boundary: BaseGeometry,
    cql_filter: str | None = None,
    **kwargs: Any,
) -> list[tuple[dict[str, Any], BaseGeometry]]:
    """fetch_wfs_features + clip_to_boundary on every result, dropping
    features whose bbox intersected but whose geometry doesn't. Returns
    (properties, clipped_geometry) pairs - geometries as shapely objects,
    left for the caller to simplify/reproject/serialize as needed.
    """
    features = fetch_wfs_features(url, type_name, boundary=boundary, cql_filter=cql_filter, **kwargs)
    result = []
    for feature in features:
        if not feature.get('geometry'):
            continue
        clipped = clip_to_boundary(feature['geometry'], boundary)
        if clipped is None:
            continue
        result.append((feature.get('properties', {}), clipped))
    return result
