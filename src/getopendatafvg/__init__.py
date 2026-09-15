"""getopendatafvg: extract and visualize open geographic, socio-economic and
environmental data for Friuli Venezia Giulia.

This is an early, incremental extraction from the data pipeline behind
Mappa Civica (https://github.com/BeneComune/mappa-civica), a civic mapping
platform for the comune of Montereale Valcellina. Modules are being ported
and generalized one at a time rather than all at once, so the surface area
here will keep growing.
"""

from ._errors import NoCleanSceneFoundError
from .indices import IndexRaster, compute_lst, compute_nbr, compute_ndvi
from .landsat import LandsatScene, UsgsCredentials, fetch_landsat_scene
from .scene_date import landsat_scene_date, sentinel2_scene_date
from .sentinel2 import DEFAULT_BANDS, Band, CdseCredentials, Sentinel2Scene, fetch_sentinel2_scene
from .vectorize import ClassBreak, classify_and_vectorize
from .viz import plot_index
from .wfs import clip_to_boundary, fetch_and_clip_wfs_features, fetch_wfs_features

__all__ = [
    'DEFAULT_BANDS',
    'Band',
    'CdseCredentials',
    'ClassBreak',
    'IndexRaster',
    'LandsatScene',
    'NoCleanSceneFoundError',
    'Sentinel2Scene',
    'UsgsCredentials',
    'classify_and_vectorize',
    'clip_to_boundary',
    'compute_lst',
    'compute_nbr',
    'compute_ndvi',
    'fetch_and_clip_wfs_features',
    'fetch_landsat_scene',
    'fetch_sentinel2_scene',
    'fetch_wfs_features',
    'landsat_scene_date',
    'plot_index',
    'sentinel2_scene_date',
]
