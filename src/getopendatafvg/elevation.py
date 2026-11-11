"""Fetch the elevation of a single point via Open-Elevation
(https://open-elevation.com/) - free, no API key, backed by SRTM data.

For elevation along a line or over an area, prefer `DemSampler` against a
downloaded DEM (`dem.py`) - this is for the case where downloading and
opening a whole DEM file is overkill and you just need one point's height.

Deprecated: nothing here is specific to Friuli Venezia Giulia, so the module
is outside the library's scope, and it will be removed in 1.0.
"""

from __future__ import annotations

import warnings

import requests

LOOKUP_URL = 'https://api.open-elevation.com/api/v1/lookup'


def fetch_elevation(latitude: float, longitude: float, timeout: int = 30) -> float:
    """Elevation in meters at a point. Open-Elevation covers the whole
    globe via SRTM, so ocean/no-data points come back as 0.0 rather than
    a missing value.

    Deprecated, removed in 1.0: use `DemSampler` for lines and areas, or
    call Open-Elevation directly for a single point.
    """
    warnings.warn(
        'fetch_elevation is deprecated and will be removed in getopendatafvg 1.0. '
        'Use DemSampler for lines and areas, or call Open-Elevation directly for a single point.',
        DeprecationWarning,
        stacklevel=2,
    )
    resp = requests.get(LOOKUP_URL, params={'locations': f'{latitude},{longitude}'}, timeout=timeout)
    resp.raise_for_status()
    return float(resp.json()['results'][0]['elevation'])
