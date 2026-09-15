"""getopendatafvg: extract and visualize open geographic, socio-economic and
environmental data for Friuli Venezia Giulia.

This is an early, incremental extraction from the data pipeline behind
Mappa Civica (https://github.com/BeneComune/mappa-civica), a civic mapping
platform for the comune of Montereale Valcellina. Modules are being ported
and generalized one at a time rather than all at once, so the surface area
here will keep growing.
"""

from .scene_date import landsat_scene_date, sentinel2_scene_date
from .sentinel2 import (
    DEFAULT_BANDS,
    Band,
    CdseCredentials,
    NoCleanSceneFoundError,
    Sentinel2Scene,
    fetch_sentinel2_scene,
)

__all__ = [
    'DEFAULT_BANDS',
    'Band',
    'CdseCredentials',
    'NoCleanSceneFoundError',
    'Sentinel2Scene',
    'fetch_sentinel2_scene',
    'landsat_scene_date',
    'sentinel2_scene_date',
]
