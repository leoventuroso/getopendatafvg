"""Fetch datasets from the Friuli Venezia Giulia regional open data portal
(dati.friuliveneziagiulia.it, Socrata/SODA API) - roughly 300 datasets not
on the region's WFS GeoServer (see wfs.py): municipal budgets, election
results, demographic time series, bike paths, pharmacies, and more. Free,
no API key needed for public datasets.

Each dataset has its own schema and, if it has a geometry column at all,
its own name and type for it - unlike wfs.py's consistent GeoJSON
`geometry`/`properties` shape, so this returns each row as a plain dict,
exactly as the portal's own API returns it.
"""

from __future__ import annotations

from typing import Any

import requests
from shapely.geometry.base import BaseGeometry

BASE_URL = 'https://www.dati.friuliveneziagiulia.it'


def fetch_open_data_fvg(
    resource_id: str,
    where: str | None = None,
    select: str | None = None,
    order: str | None = None,
    limit: int = 1000,
    offset: int = 0,
    timeout: int = 60,
) -> list[dict[str, Any]]:
    """GET rows from a dataset on the portal, identified by its resource
    id (the code in the dataset's API link on its page, e.g. `7eat-pecq`
    for "Piste Ciclabili"). `where`, `select` and `order` are raw SoQL
    clauses (SODA's SQL-like query language), sent as-is - build a
    spatial predicate with `within_box_clause` if the dataset has a
    geometry column.
    """
    params: dict[str, str] = {'$limit': str(limit), '$offset': str(offset)}
    if where is not None:
        params['$where'] = where
    if select is not None:
        params['$select'] = select
    if order is not None:
        params['$order'] = order

    resp = requests.get(
        f'{BASE_URL}/resource/{resource_id}.json',
        params=params,
        timeout=timeout,
        headers={'User-Agent': 'getopendatafvg/0.1'},
    )
    resp.raise_for_status()
    return resp.json()


def within_box_clause(geometry_column: str, boundary: BaseGeometry) -> str:
    """SoQL `within_box(...)` predicate for `geometry_column`, from
    `boundary`'s bounding box - a superset of what actually intersects
    (like fetch_wfs_features's own bbox filter), not an exact cut. Clip
    precisely client-side afterward if you need that.
    """
    minx, miny, maxx, maxy = boundary.bounds
    return f'within_box({geometry_column}, {maxy}, {minx}, {miny}, {maxx})'
