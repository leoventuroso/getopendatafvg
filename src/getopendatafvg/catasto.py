"""Fetch cadastral parcel points (particelle catastali) for a comune.

Source: onData's national republish of Agenzia delle Entrate INSPIRE
cadastral data (github.com/ondata/dati_catastali, CC BY 4.0, credit
onData) - one representative interior point per parcel (foglio,
particella), no owner names, no rendita. It's "catasto terreni" (land
parcels), not "fabbricati" (buildings), and it's non-probatorio (not the
legally binding boundary).

Queried through DuckDB's httpfs extension with HTTP range requests, so
the full ~18MB-per-region Parquet file is never downloaded - only the
rows matching one comune.
"""

from __future__ import annotations

import re
from typing import Any

import duckdb

BASE_URL = 'https://raw.githubusercontent.com/ondata/dati_catastali/main/S_0000_ITALIA/anagrafica'

# onData's regional Parquet file names - the dataset covers all of Italy,
# not just Friuli Venezia Giulia.
REGION_FILES = [
    '01_Piemonte', '02_ValledAosta', '03_Lombardia', '05_Veneto',
    '06_Friuli-VeneziaGiulia', '07_Liguria', '08_Emilia-Romagna', '09_Toscana',
    '10_Umbria', '11_Marche', '12_Lazio', '13_Abruzzo', '14_Molise',
    '15_Campania', '16_Puglia', '17_Basilicata', '18_Calabria', '19_Sicilia',
    '20_Sardegna',
]


def region_parquet_name(region: str) -> str | None:
    """The onData Parquet file name (without extension) for `region`
    (any casing/spacing - "Friuli-Venezia Giulia", "friuli venezia giulia"
    and "FRIULI-VENEZIA GIULIA" all match "06_Friuli-VeneziaGiulia"), or
    None if it isn't one of the 19 recognised regions.
    """
    want = _normalize(region)
    for name in REGION_FILES:
        if _normalize(name.split('_', 1)[1]) == want:
            return name
    return None


def fetch_cadastral_parcels(comune_cadastral_code: str, region: str) -> list[dict[str, Any]]:
    """GeoJSON Point features (`foglio`, `particella` properties) for
    every cadastral parcel in a comune. Empty list if `region` doesn't
    match a known onData region file.
    """
    fname = region_parquet_name(region)
    if fname is None:
        return []

    url = f'{BASE_URL}/{fname}.parquet'
    con = duckdb.connect()
    con.execute('INSTALL httpfs; LOAD httpfs;')
    rows = con.execute(
        'SELECT foglio, particella, x, y FROM read_parquet(?) WHERE comune = ?',
        [url, comune_cadastral_code],
    ).fetchall()

    features = [
        {
            'type': 'Feature',
            'properties': {
                # leading zeros dropped for display; particella kept verbatim
                'foglio': str(foglio).lstrip('0') or '0',
                'particella': str(particella),
            },
            'geometry': {'type': 'Point', 'coordinates': [round(x / 1_000_000, 6), round(y / 1_000_000, 6)]},
        }
        for foglio, particella, x, y in rows
    ]
    features.sort(key=lambda f: (int(f['properties']['foglio'] or 0), f['properties']['particella']))
    return features


def _normalize(text: str) -> str:
    return re.sub(r'[^a-z]', '', text.lower())
