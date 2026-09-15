"""Query the OSM Overpass API for features within a boundary.

Posts raw Overpass QL, trying multiple public mirrors in order (any one
instance can be temporarily rate-limited or down) and raising only if
every mirror fails. Filters by an arbitrary boundary geometry via
Overpass QL's `poly:` filter, rather than requiring a pre-known OSM
relation id (Overpass's own `area()` shortcut) - consistent with every
other boundary-shaped parameter in this library, and it works for any
area, not just ones that happen to have a mapped OSM relation.
"""

from __future__ import annotations

from typing import Any

import requests
from shapely.geometry.base import BaseGeometry

DEFAULT_MIRRORS = (
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
)


def query_overpass(
    query: str,
    mirrors: tuple[str, ...] = DEFAULT_MIRRORS,
    timeout: int = 180,
) -> dict[str, Any]:
    """POST raw Overpass QL to the first mirror that responds successfully.
    Raises the last error if every mirror fails.
    """
    last_error: Exception | None = None
    for url in mirrors:
        try:
            resp = requests.post(
                url, data=query.encode('utf-8'), headers={'User-Agent': 'getopendatafvg/0.1'}, timeout=timeout
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as exc:  # noqa: BLE001 - any failure moves on to the next mirror
            last_error = exc
    assert last_error is not None
    raise last_error


def boundary_poly_filter(boundary: BaseGeometry) -> str:
    """Overpass QL `poly:"lat lon lat lon ..."` filter for `boundary`'s
    exterior ring. Overpass has no notion of a shapely geometry or GeoJSON
    - only this space-separated lat/lon pair string, and in lat/lon order,
    the opposite of shapely's (lon, lat).
    """
    if boundary.geom_type == 'Polygon':
        ring = boundary.exterior.coords
    else:
        ring = max(boundary.geoms, key=lambda g: g.area).exterior.coords
    pairs = ' '.join(f'{lat} {lon}' for lon, lat in ring)
    return f'poly:"{pairs}"'


def fetch_overpass_elements(
    selectors: list[str],
    boundary: BaseGeometry,
    out: str = 'tags center',
    timeout: int = 180,
    mirrors: tuple[str, ...] = DEFAULT_MIRRORS,
) -> list[dict[str, Any]]:
    """Fetch OSM elements matching any of `selectors` (each a full
    element-type-plus-tag-filter string, e.g. `node["natural"="peak"]`)
    within `boundary`.

    Returns the raw `elements` list from Overpass - a node carries
    `lat`/`lon` directly; a way or relation carries a `center` point only
    when `out` includes "center" (the default) - use element_point() to
    read either shape without checking which one you got.
    """
    poly = boundary_poly_filter(boundary)
    body = '\n'.join(f'  {selector}({poly});' for selector in selectors)
    query = f'[out:json][timeout:{timeout}];\n(\n{body}\n);\nout {out};'
    data = query_overpass(query, mirrors=mirrors, timeout=timeout)
    return data.get('elements', [])


def element_point(element: dict[str, Any]) -> tuple[float, float] | None:
    """(lon, lat) for an Overpass element: direct for a node, from
    `center` for a way/relation fetched with `out center`. None if
    neither is present.
    """
    if 'lat' in element and 'lon' in element:
        return element['lon'], element['lat']
    center = element.get('center')
    if center:
        return center.get('lon'), center.get('lat')
    return None
