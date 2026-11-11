"""Opt-in check that the upstream defects in docs/upstream-defects.md
still exist. Off by default, like the live catalog check:

    GETOPENDATAFVG_LIVE=1 pytest tests/test_upstream_defects_live.py

Each test asserts the defect, not the figure recorded when it was found:
row counts grow, so "every ozone row since May 2020 lacks a geometry" is
checked, not "130,903 rows". A failure here means either the service
changed or the registry is wrong, and in both cases the entry needs
revisiting - an upstream fix is good news, but the workaround may then
be dead code.

About 13 requests: 8 to the portal, 2 to the WFS, 3 to ISTAT. The ISTAT
ones are spaced at least 16 seconds apart, on top of the library's own
throttle, so the suite stays under 4 requests a minute.
"""

import os
import time
from collections import Counter

import pytest
import requests

from getopendatafvg import fetch_istat_dataflow, fetch_open_data_fvg
from getopendatafvg.avalanche import PHOTO_INTERPRETED_LAYER, SURVEYED_LAYER
from getopendatafvg.catalog import OPEN_DATA_FVG_BASE_URL, WFS_BASE_URL
from getopendatafvg.open_data_fvg import DOMAIN

pytestmark = pytest.mark.skipif(
    not os.environ.get('GETOPENDATAFVG_LIVE'),
    reason='hits the live portal, WFS and ISTAT; set GETOPENDATAFVG_LIVE=1 to run',
)

HEADERS = {'User-Agent': 'getopendatafvg/0.1'}

OZONE = '7vnx-28uy'
CARBON_MONOXIDE = 't274-vki6'
SUSPENDED_PARTICULATE = 'dayp-qnyx'
PARAFARMACIE = 'b3xh-hm8p'

# The ARPA series carry five date columns (station and siting validity
# among them); this is the one each measurement is dated by.
MEASURED_ON = 'data_misura'

ISTAT_SPACING_SECONDS = 16
_last_istat_call = [0.0]


def _istat_pause() -> None:
    wait = ISTAT_SPACING_SECONDS - (time.monotonic() - _last_istat_call[0])
    if wait > 0:
        time.sleep(wait)
    _last_istat_call[0] = time.monotonic()


def _schema(resource_id: str) -> dict[str, str]:
    """Column field name -> SoQL type, from the dataset's view metadata."""
    resp = requests.get(f'{OPEN_DATA_FVG_BASE_URL}/api/views/{resource_id}.json', timeout=60, headers=HEADERS)
    resp.raise_for_status()
    return {c['fieldName']: c['dataTypeName'] for c in resp.json()['columns']}




def _count(resource_id: str, where: str | None = None) -> int:
    return int(fetch_open_data_fvg(resource_id, where=where, select='count(*)')[0]['count'])


def _max_date(resource_id: str) -> str:
    return fetch_open_data_fvg(resource_id, select=f'max({MEASURED_ON}) AS latest')[0]['latest'][:10]


def _site_ids(layer: str) -> list[int]:
    resp = requests.get(
        WFS_BASE_URL,
        params={
            'service': 'WFS',
            'version': '2.0.0',
            'request': 'GetFeature',
            'typeNames': layer,
            'propertyName': 'ID_SITO',
            'outputFormat': 'application/json',
            'count': '20000',
        },
        timeout=180,
        headers=HEADERS,
    )
    resp.raise_for_status()
    return [int(f['properties']['ID_SITO']) for f in resp.json()['features']]


# ISTAT


@pytest.mark.quirk('UD-01')
def test_istat_end_period_still_returns_one_year_too_many():
    _istat_pause()
    # endPeriod passed raw through extra_params, so the library's
    # correction is bypassed and the server's own behaviour shows.
    rows = fetch_istat_dataflow(
        '22_289', 'A.093042....', start_period='2019', timeout=180, endPeriod='2019'
    )
    years = {row['TIME_PERIOD'] for row in rows}
    assert '2020' in years, f'asked for 2019 only and got {sorted(years)}: the off-by-one may be fixed'


@pytest.mark.quirk('UD-04')
def test_istat_employment_still_rejects_the_current_nuts_code():
    _istat_pause()
    with pytest.raises(requests.HTTPError) as error:
        fetch_istat_dataflow('150_915', 'A.ITH4.....')
    assert error.value.response.status_code == 404


@pytest.mark.quirk('UD-06')
def test_istat_tourism_still_has_capacity_but_no_flows_for_a_comune():
    _istat_pause()
    rows = fetch_istat_dataflow('122_54', 'A.030129' + '.' * 9, start_period='2023')
    indicators = {row.get('DATA_TYPE') for row in rows}
    assert indicators, 'Udine returned no 122_54 rows at all, not even capacity'
    assert not indicators & {'AR', 'NI'}, f'arrivals or nights now published per comune: {sorted(indicators)}'


# Open Data FVG portal


@pytest.mark.quirk('UD-09')
def test_portal_still_has_more_saved_views_than_datasets():
    def total(asset_type: str) -> int:
        resp = requests.get(
            f'{OPEN_DATA_FVG_BASE_URL}/api/catalog/v1',
            params={'domains': DOMAIN, 'search_context': DOMAIN, 'only': asset_type, 'limit': '1'},
            timeout=60,
            headers=HEADERS,
        )
        resp.raise_for_status()
        return int(resp.json()['resultSetSize'])

    datasets, filters = total('dataset'), total('filter')
    assert filters > datasets > 0, f'{filters} filters against {datasets} datasets'


@pytest.mark.quirk('UD-10')
def test_ozone_rows_after_may_19_2020_still_have_no_geometry():
    after = f"{MEASURED_ON} > '2020-05-19'"
    rows_after = _count(OZONE, after)
    without_geometry = _count(OZONE, f'{after} AND geocoded_column IS NULL')
    assert rows_after > 0
    assert without_geometry == rows_after, f'{without_geometry} of {rows_after} rows after 2020-05-19 lack a geometry'


@pytest.mark.quirk('UD-12')
def test_parafarmacie_coordinates_are_still_text_with_a_decimal_comma():
    schema = _schema(PARAFARMACIE)
    assert schema.get('latitudine') == 'text' and schema.get('longitudine') == 'text', schema
    row = fetch_open_data_fvg(PARAFARMACIE, where='latitudine IS NOT NULL', limit=1)[0]
    assert ',' in row['latitudine'], f'latitudine is {row["latitudine"]!r}'


@pytest.mark.quirk('UD-14')
def test_suspended_particulate_is_still_closed_and_carbon_monoxide_still_stalled():
    assert _max_date(SUSPENDED_PARTICULATE) < '2019-01-01'
    assert _max_date(CARBON_MONOXIDE) <= '2026-01-15', 'CO has resumed: update UD-14 and its catalog entry'


# Regional WFS


@pytest.mark.quirk('UD-15')
@pytest.mark.quirk('UD-16')
def test_avalanche_layers_still_split_and_one_still_repeats_sites():
    surveyed, photo = _site_ids(SURVEYED_LAYER), _site_ids(PHOTO_INTERPRETED_LAYER)
    assert surveyed and photo
    assert not set(surveyed) & set(photo), 'the two layers now share sites: merging needs deduplication'
    repeated = {site for site, n in Counter(surveyed).items() if n > 1}
    assert {1060, 3668} <= repeated, f'sites stored as more than one row: {sorted(repeated)}'
