"""getopendatafvg: extract and visualize open geographic, socio-economic and
environmental data for Friuli Venezia Giulia.

This is an early, incremental extraction from the data pipeline behind
Mappa Civica (https://github.com/BeneComune/mappa-civica), a civic mapping
platform for the comune of Montereale Valcellina. Modules are being ported
and generalized one at a time rather than all at once, so the surface area
here will keep growing.
"""

from ._errors import NoCleanSceneFoundError
from .coverage import build_coverage_union, line_coverage_pct
from .dem import DemSampler, compute_line_grade, compute_line_slope, slope_class_for_value
from .indices import IndexRaster, compute_lst, compute_nbr, compute_ndvi
from .istat import (
    fetch_bank_branches,
    fetch_demographic_balance,
    fetch_demographic_indicators,
    fetch_istat_dataflow,
    fetch_population_series,
)
from .landsat import LandsatScene, UsgsCredentials, fetch_landsat_scene
from .overpass import boundary_poly_filter, element_point, fetch_overpass_elements, query_overpass
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
    'DemSampler',
    'IndexRaster',
    'LandsatScene',
    'NoCleanSceneFoundError',
    'Sentinel2Scene',
    'UsgsCredentials',
    'boundary_poly_filter',
    'build_coverage_union',
    'classify_and_vectorize',
    'clip_to_boundary',
    'compute_line_grade',
    'compute_line_slope',
    'compute_lst',
    'compute_nbr',
    'compute_ndvi',
    'element_point',
    'fetch_and_clip_wfs_features',
    'fetch_bank_branches',
    'fetch_demographic_balance',
    'fetch_demographic_indicators',
    'fetch_istat_dataflow',
    'fetch_landsat_scene',
    'fetch_overpass_elements',
    'fetch_population_series',
    'fetch_sentinel2_scene',
    'fetch_wfs_features',
    'landsat_scene_date',
    'line_coverage_pct',
    'plot_index',
    'query_overpass',
    'sentinel2_scene_date',
    'slope_class_for_value',
]
