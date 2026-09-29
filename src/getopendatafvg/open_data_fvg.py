"""Fetch datasets from the Friuli Venezia Giulia regional open data portal
(dati.friuliveneziagiulia.it, Socrata/SODA API) - about 850 published
assets not on the region's WFS GeoServer (see wfs.py): municipal budgets,
election results, demographic time series, bike paths, pharmacies, and
more. Free, no API key needed for public datasets.

Only 266 of those assets are of Socrata type `dataset`; most of the rest
(551) are of type `filter`, a saved view over another dataset. Both are
fetched the same way, by resource id through `/resource/<id>.json`, and
several catalog entries are filters - so do not filter a portal search
down to `only=dataset` or you will miss them.

Each dataset has its own schema and, if it has a geometry column at all,
its own name and type for it - unlike wfs.py's consistent GeoJSON
`geometry`/`properties` shape, so this returns each row as a plain dict,
exactly as the portal's own API returns it.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import requests
from shapely.geometry.base import BaseGeometry

BASE_URL = 'https://www.dati.friuliveneziagiulia.it'
DOMAIN = 'www.dati.friuliveneziagiulia.it'


@dataclass(frozen=True)
class PortalAsset:
    """One search hit from the portal's catalog. `resource_id` is what
    `fetch_open_data_fvg` takes. `asset_type` is Socrata's own type -
    usually `'dataset'` or `'filter'`, both fetched identically.
    """

    resource_id: str
    name: str
    asset_type: str
    description: str


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


def search_open_data_fvg(query: str, limit: int = 20, timeout: int = 60) -> list[PortalAsset]:
    """Full-text search over the portal's own catalog, for the families of
    dataset too numerous to enumerate by hand - the per-comune budgets
    above all, where there is one asset per comune per period (114
    `Rendiconto Entrate`, 113 `Rendiconto Spese`, 132 `Bilancio - Comune
    ...` at the time of writing) all sharing a schema within a family.
    `getopendatafvg.CATALOG` lists one example of each; this finds the
    rest:

        search_open_data_fvg('Rendiconto Entrate Tolmezzo')

    Every asset type is searched, deliberately. Socrata's discovery API
    takes an `only=` filter, and narrowing it to `only=dataset` hides
    most of this portal: of about 850 published assets only 266 are type
    `dataset`, while 551 are type `filter` - a saved view over another
    dataset, fetched by resource id exactly like one. Several catalog
    entries are filters, so that filter would make them look missing.
    """
    resp = requests.get(
        f'{BASE_URL}/api/catalog/v1',
        params={'domains': DOMAIN, 'search_context': DOMAIN, 'q': query, 'limit': str(limit)},
        timeout=timeout,
        headers={'User-Agent': 'getopendatafvg/0.1'},
    )
    resp.raise_for_status()
    return [
        PortalAsset(
            resource_id=r['id'],
            name=r.get('name', ''),
            asset_type=r.get('type', ''),
            description=r.get('description') or '',
        )
        for r in (hit.get('resource', {}) for hit in resp.json().get('results', []))
        if r.get('id')
    ]
