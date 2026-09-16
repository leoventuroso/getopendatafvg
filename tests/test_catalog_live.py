"""Opt-in check that every catalog entry still resolves against its live
source. Off by default - it makes 43 real requests and depends on two
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
import time

import pytest
import requests

from getopendatafvg import CATALOG
from getopendatafvg.catalog import OPEN_DATA_FVG_BASE_URL, WFS_BASE_URL

live_only = pytest.mark.skipif(
    not os.environ.get('GETOPENDATAFVG_LIVE'),
    reason='hits the live WFS and Socrata endpoints; set GETOPENDATAFVG_LIVE=1 to run',
)

HEADERS = {'User-Agent': 'getopendatafvg/0.1'}


def resolve(entry) -> tuple[bool, str]:
    """Ask for a single row/feature - enough to tell "this identifier
    exists" from "this identifier is a typo", without pulling the layer.
    """
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


@live_only
def test_every_catalog_entry_resolves_against_its_live_source():
    broken = []
    for entry in CATALOG:
        ok, detail = resolve(entry)
        if not ok:
            broken.append(f'{entry.source} {entry.identifier} ({entry.name}) - {detail}')
        time.sleep(0.4)  # both services are public infrastructure; don't hammer them

    assert not broken, 'catalog entries that no longer resolve:\n' + '\n'.join(broken)
