"""The public API is exactly `getopendatafvg.__all__`, so a change to it is
a change to the API, and should never happen by accident.

The snapshot below makes every addition or removal a deliberate edit, and
the CHANGELOG check makes sure that edit is documented. Removing a name is
a breaking change: under the deprecation policy in docs/PLAN.md it must
first ship with a `DeprecationWarning` for at least one minor release.
"""

import re
from pathlib import Path

import getopendatafvg

ROOT = Path(__file__).resolve().parent.parent
CHANGELOG = ROOT / 'CHANGELOG.md'
API_DOCS = ROOT / 'docs' / 'api'

PUBLIC_API = frozenset({
    'AvalancheSite',
    'Band',
    'CATALOG',
    'CdseCredentials',
    'ClassBreak',
    'DEFAULT_BANDS',
    'DailyWeather',
    'DemSampler',
    'FVG_NUTS_AREAS',
    'IndexRaster',
    'KnownDataset',
    'LandsatScene',
    'NoCleanSceneFoundError',
    'PortalAsset',
    'Sentinel2Scene',
    'TippecanoeNotFoundError',
    'UsgsCredentials',
    'boundary_poly_filter',
    'build_coverage_union',
    'build_pmtiles',
    'classify_and_vectorize',
    'clip_to_boundary',
    'compute_line_grade',
    'compute_line_slope',
    'compute_lst',
    'compute_nbr',
    'compute_ndvi',
    'element_point',
    'fetch_and_clip_wfs_features',
    'fetch_avalanche_sites',
    'fetch_bank_branches',
    'fetch_cadastral_parcels',
    'fetch_consumer_price_index',
    'fetch_demographic_balance',
    'fetch_demographic_indicators',
    'fetch_elevation',
    'fetch_employment_rate',
    'fetch_historical_weather',
    'fetch_income_series',
    'fetch_istat_dataflow',
    'fetch_known_dataset',
    'fetch_landsat_scene',
    'fetch_open_data_fvg',
    'fetch_overpass_elements',
    'fetch_population_series',
    'fetch_sentinel2_scene',
    'fetch_tourism_capacity',
    'fetch_tourism_flows',
    'fetch_wfs_features',
    'fetch_wikipedia_summary',
    'landsat_scene_date',
    'line_coverage_pct',
    'list_known_datasets',
    'lon_lat_box_clause',
    'plot_index',
    'query_overpass',
    'region_parquet_name',
    'search_known_datasets',
    'search_open_data_fvg',
    'sentinel2_scene_date',
    'slope_class_for_value',
    'within_box_clause',
})


def test_public_api_matches_the_snapshot():
    exported = set(getopendatafvg.__all__)
    added = sorted(exported - PUBLIC_API)
    removed = sorted(PUBLIC_API - exported)
    assert not added and not removed, (
        f'public API changed - added {added}, removed {removed}. If deliberate, update '
        'PUBLIC_API here and record the change in CHANGELOG.md; a removal needs a '
        'deprecation period first.'
    )


def test_all_lists_each_name_once():
    assert len(getopendatafvg.__all__) == len(set(getopendatafvg.__all__))


def test_every_public_name_is_importable():
    missing = [name for name in getopendatafvg.__all__ if not hasattr(getopendatafvg, name)]
    assert not missing, f'listed in __all__ but not defined: {missing}'


def test_every_public_name_is_recorded_in_the_changelog():
    # Whole-word match in backticks, so `fetch_wfs_features` does not count
    # as a mention of `fetch_wfs_feature`.
    text = CHANGELOG.read_text(encoding='utf-8')
    unrecorded = sorted(
        name for name in getopendatafvg.__all__ if not re.search(rf'`{re.escape(name)}`', text)
    )
    assert not unrecorded, f'public names missing from CHANGELOG.md: {unrecorded}'


def test_every_public_name_is_in_the_api_reference():
    # The pages list members explicitly, one `- name` line each, so a new
    # export does not appear on the documentation site by itself.
    listed = set()
    for page in API_DOCS.glob('*.md'):
        listed.update(re.findall(r'^\s+- (\w+)$', page.read_text(encoding='utf-8'), flags=re.MULTILINE))
    missing = sorted(set(getopendatafvg.__all__) - listed)
    assert not missing, f'public names missing from docs/api/: {missing}'
