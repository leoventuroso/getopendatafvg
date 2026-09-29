"""Opt-in check that every catalog entry still resolves against its live
source. Off by default - it makes 87 real requests and depends on two
government services being up, neither of which belongs in CI on every
push. Run it before adding entries, and periodically to catch a layer
that got renamed or retired upstream:

    GETOPENDATAFVG_LIVE=1 pytest tests/test_catalog_live.py

Five entries were added with a plausible but wrong workspace prefix
(`IDROGRAF:CORSI_ACQUA` for what is really `IRDAT:CORSI_ACQUA`,
`UNIT_AMM:COMUNI_FVG` for `UNITA_AMM:COMUNI_FVG`, ...) and the mistake
survived until something actually asked the server. This is that
something.
"""

import os
import sys
import time
from unittest.mock import patch

import pytest
import requests
from shapely.geometry import box

from getopendatafvg import (
    CATALOG,
    fetch_known_dataset,
    list_known_datasets,
    search_open_data_fvg,
)
from getopendatafvg.catalog import OPEN_DATA_FVG_BASE_URL, WFS_BASE_URL, KnownDataset

live_only = pytest.mark.skipif(
    not os.environ.get('GETOPENDATAFVG_LIVE'),
    reason='hits the live WFS and Socrata endpoints; set GETOPENDATAFVG_LIVE=1 to run',
)

HEADERS = {'User-Agent': 'getopendatafvg/0.1'}


def _ask(entry) -> tuple[bool, str]:
    """One request: does this identifier resolve right now?

    A dropped connection or a timeout is reported as a failure rather
    than raised. Raising would abort the whole sweep on the first blip
    and leave every later entry unchecked, and it is the retry in
    `resolve` that decides whether a blip counts.
    """
    try:
        return _ask_once(entry)
    except requests.RequestException as exc:
        return False, f'{type(exc).__name__}: {str(exc)[:110]}'


def _ask_once(entry) -> tuple[bool, str]:
    if entry.source == 'wfs':
        resp = requests.get(
            WFS_BASE_URL,
            params={
                'service': 'WFS',
                'version': '2.0.0',
                'request': 'GetFeature',
                'typeNames': entry.identifier,
                'outputFormat': 'application/json',
                'srsName': 'EPSG:4326',
                'count': '1',
            },
            timeout=180,
            headers=HEADERS,
        )
    else:
        resp = requests.get(
            f'{OPEN_DATA_FVG_BASE_URL}/resource/{entry.identifier}.json',
            params={'$limit': '1'},
            timeout=60,
            headers=HEADERS,
        )
    if resp.status_code == 200:
        return True, ''
    detail = resp.text
    if '<ows:ExceptionText>' in detail:
        detail = detail.split('<ows:ExceptionText>')[1].split('</')[0]
    return False, f'HTTP {resp.status_code}: {detail.strip()[:120]}'


def resolve(entry, attempts: int = 2, backoff_seconds: float = 5.0) -> tuple[bool, str]:
    """Ask for a single row/feature - enough to tell "this identifier
    exists" from "this identifier is a typo", without pulling the layer.

    Retried once before being called broken. Both services occasionally
    drop a single request under load, and this suite runs unattended on a
    weekly schedule: without the retry a one-off 500 reads exactly like a
    retired layer, and a job that cries wolf gets ignored, which defeats
    the point of running it at all. A genuinely wrong identifier fails
    every attempt, so nothing real is hidden.
    """
    for attempt in range(attempts):
        ok, detail = _ask(entry)
        if ok:
            return True, ''
        if attempt + 1 < attempts:
            time.sleep(backoff_seconds)
    return False, f'{detail} (failed {attempts} attempts)'


@live_only
def test_every_catalog_entry_resolves_against_its_live_source():
    broken = []
    for entry in CATALOG:
        ok, detail = resolve(entry)
        if not ok:
            broken.append(f'{entry.source} {entry.identifier} ({entry.name}) - {detail}')
        time.sleep(0.4)  # both services are public infrastructure; don't hammer them

    assert not broken, 'catalog entries that no longer resolve:\n' + '\n'.join(broken)


@live_only
def test_recorded_geometry_columns_are_really_filterable():
    """A geometry_column that doesn't exist, or isn't a geo type, doesn't
    fail loudly - SODA answers a within_box on it with an error the
    catalog never sees until someone passes a boundary. So ask it: every
    entry that records one must accept the clause and return a strict,
    non-empty subset for a box we know has features in it.
    """
    entries = [d for d in list_known_datasets(source='open_data_fvg') if d.geometry_column]
    assert entries, 'no portal entry records a geometry column; this test would pass vacuously'

    udine = box(13.18, 46.02, 13.30, 46.12)
    for entry in entries:
        total = len(fetch_known_dataset(entry, limit=50000))
        inside = len(fetch_known_dataset(entry, boundary=udine, limit=50000))
        assert inside, f'{entry.name}: within_box({entry.geometry_column}) matched nothing'
        assert inside < total, (
            f'{entry.name}: within_box({entry.geometry_column}) returned all {total} rows, '
            'so it is not actually filtering'
        )
        time.sleep(0.4)


@live_only
def test_portal_search_still_finds_the_budget_families():
    """The 359 per-comune budget assets are reachable through
    search_open_data_fvg rather than through CATALOG, so nothing in the
    catalog fails if the discovery API changes shape or starts hiding
    filters. This is that check.
    """
    hits = search_open_data_fvg('Rendiconto Entrate', limit=50)
    assert len(hits) > 20, f'expected many Rendiconto Entrate assets, got {len(hits)}'

    named = [h for h in hits if h.name.startswith('Rendiconto Entrate')]
    assert named, f'no hit actually named Rendiconto Entrate: {[h.name for h in hits[:5]]}'

    # Most of this portal is type `filter`; a result set of only
    # `dataset` would mean the search silently narrowed again.
    assert any(h.asset_type == 'filter' for h in named), (
        'no filter-type asset came back, which is how only=dataset fails'
    )
    for h in named:
        assert h.resource_id, f'{h.name} came back without a resource id'


# The retry logic itself is not live: it is mocked, so it runs in normal
# CI alongside everything else. Without that, the thing that decides
# whether the weekly job cries wolf would only ever be exercised by hand.

def bogus_entry():
    return KnownDataset('Finto', 'wfs', 'NON_ESISTE:MAI', 'test', 'test')


def test_resolve_retries_before_calling_an_entry_broken():
    replies = [(False, 'HTTP 500: boom'), (True, '')]
    with patch.object(sys.modules[__name__], '_ask', side_effect=replies) as ask:
        ok, detail = resolve(bogus_entry(), backoff_seconds=0)

    assert ok and detail == ''
    assert ask.call_count == 2


def test_resolve_reports_an_identifier_that_fails_every_attempt():
    with patch.object(sys.modules[__name__], '_ask', return_value=(False, 'HTTP 400: typo')) as ask:
        ok, detail = resolve(bogus_entry(), backoff_seconds=0)

    assert not ok
    assert 'HTTP 400: typo' in detail
    assert 'failed 2 attempts' in detail
    assert ask.call_count == 2


def test_ask_turns_a_dropped_connection_into_a_failure_not_an_exception():
    # Raising here would abort the sweep at the first blip and leave every
    # later entry unchecked.
    with patch.object(requests, 'get', side_effect=requests.ConnectionError('reset by peer')):
        ok, detail = _ask(bogus_entry())

    assert not ok
    assert 'ConnectionError' in detail
