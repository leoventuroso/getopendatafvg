"""Avalanche sites in Friuli Venezia Giulia, merged from the region's two
avalanche layers into one list.

The region publishes the Catasto Valanghe as two WFS layers, and the
split is by survey method rather than by area: `CV_VALANGHE_RILEVATE`
holds sites surveyed on the ground (3875 features) and
`CV_VALANGHE_FOTOINT` sites mapped from aerial photography (3255). They
do not overlap - checked live, the two share not one `ID_SITO` - so a
caller wanting "avalanche sites here" needs both and has no way to tell
from either layer alone that the other exists. That is what this module
is for.

Deliberately not a hazard model. The region publishes perimeters and
site attributes, not a hazard class, so this exposes what the data says
(release and runout elevations, aspect, site type, which survey it came
from) and stops there. Anything resembling a danger rating would be
invented here rather than sourced, and the catalog entries are still the
way to get at the raw layers.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from shapely.geometry import shape
from shapely.geometry.base import BaseGeometry

from .catalog import WFS_BASE_URL
from .wfs import fetch_and_clip_wfs_features, fetch_wfs_features

SURVEYED_LAYER = 'ZONE_RISC:CV_VALANGHE_RILEVATE'
PHOTO_INTERPRETED_LAYER = 'ZONE_RISC:CV_VALANGHE_FOTOINT'

# Both layers are several thousand features and fetch_wfs_features caps
# at 1000 by default, which would silently truncate to a quarter of the
# catasto. This is above the current totals with room to grow.
DEFAULT_COUNT = 10000


@dataclass(frozen=True)
class AvalancheSite:
    """One avalanche site. `geometries` is a tuple because a site is
    occasionally stored as more than one polygon row sharing an
    `ID_SITO` - two such sites exist in the surveyed layer - and dropping
    the extra rows would quietly shrink the site's footprint.
    """

    site_id: int | None
    comune: str
    toponym: str
    site_type: str
    release_elevation_max_m: int | None
    runout_elevation_min_m: int | None
    aspect: str
    photo_interpreted: bool
    geometries: tuple[BaseGeometry, ...]


def fetch_avalanche_sites(
    boundary: BaseGeometry | None = None,
    photo_interpreted: bool | None = None,
    count: int = DEFAULT_COUNT,
) -> list[AvalancheSite]:
    """Avalanche sites from both layers as one list, sorted by comune then
    toponym.

    With a `boundary` the geometries come back clipped to it, exactly,
    and sites falling outside are dropped. Without one, every site in the
    region is returned - about 7100 of them.

    `photo_interpreted` filters by survey method: `False` for
    ground-surveyed sites only, `True` for photo-interpreted only, `None`
    (the default) for both, which is the point of the module.
    """
    sites: list[AvalancheSite] = []
    layers = {SURVEYED_LAYER: False, PHOTO_INTERPRETED_LAYER: True}
    for type_name, from_photo in layers.items():
        if photo_interpreted is not None and photo_interpreted != from_photo:
            continue
        sites.extend(_sites_from_layer(type_name, from_photo, boundary, count))
    return sorted(sites, key=lambda s: (s.comune, s.toponym))


def _sites_from_layer(
    type_name: str,
    from_photo: bool,
    boundary: BaseGeometry | None,
    count: int,
) -> list[AvalancheSite]:
    if boundary is not None:
        pairs = fetch_and_clip_wfs_features(
            WFS_BASE_URL, type_name, boundary, count=count
        )
    else:
        pairs = [
            (feature.get('properties', {}), shape(feature['geometry']))
            for feature in fetch_wfs_features(WFS_BASE_URL, type_name, count=count)
            if feature.get('geometry')
        ]

    # Group the multi-row sites back together before building anything.
    grouped: dict[Any, list[tuple[dict[str, Any], BaseGeometry]]] = {}
    for props, geometry in pairs:
        grouped.setdefault(props.get('ID_SITO'), []).append((props, geometry))

    sites = []
    for site_id, rows in grouped.items():
        props = rows[0][0]
        sites.append(
            AvalancheSite(
                site_id=site_id,
                comune=str(props.get('COMUNE') or ''),
                toponym=str(props.get('TOPONIMO') or ''),
                site_type=str(props.get('TIPO_SITO') or ''),
                release_elevation_max_m=_as_int(props.get('QUOTA_DISTACCO_MAX')),
                runout_elevation_min_m=_as_int(props.get('QUOTA_ARRESTO_MIN')),
                aspect=str(props.get('ESPOSIZIONE_SITO') or ''),
                photo_interpreted=from_photo,
                geometries=tuple(geometry for _, geometry in rows),
            )
        )
    return sites


def _as_int(value: Any) -> int | None:
    """Elevations arrive as numbers, but a missing one can be an empty
    string rather than null, which int() would raise on.
    """
    if value in (None, ''):
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None
