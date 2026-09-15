"""Fetch the elevation of a single point via Open-Elevation
(https://open-elevation.com/) - free, no API key, backed by SRTM data.

For elevation along a line or over an area, prefer `DemSampler` against a
downloaded DEM (`dem.py`) - this is for the case where downloading and
opening a whole DEM file is overkill and you just need one point's height.
"""

from __future__ import annotations

import requests

LOOKUP_URL = 'https://api.open-elevation.com/api/v1/lookup'


def fetch_elevation(latitude: float, longitude: float, timeout: int = 30) -> float:
    """Elevation in meters at a point. Open-Elevation covers the whole
    globe via SRTM, so ocean/no-data points come back as 0.0 rather than
    a missing value.
    """
    resp = requests.get(LOOKUP_URL, params={'locations': f'{latitude},{longitude}'}, timeout=timeout)
    resp.raise_for_status()
    return float(resp.json()['results'][0]['elevation'])
