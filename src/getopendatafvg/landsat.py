"""Search and download Landsat Collection 2 Level-2 bands from the USGS
M2M API, for a given boundary, walking backward in time until a
sufficiently cloud-free scene is found.

The M2M download flow has two sharp edges this module exists to hide:
a band you want is often not a top-level download option but nested
under a bundle's secondaryDownloads, carrying its own entityId distinct
from the parent scene's - pairing the wrong entityId with it comes back
as an unexplained "invalid scene", not a clear error. And download-request
needs a short `label` (50 characters max) to actually queue anything; a
missing or overlong one fails silently or with a cryptic INPUT_INVALID.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import requests
from shapely.geometry.base import BaseGeometry

from ._errors import NoCleanSceneFoundError
from .scene_date import landsat_scene_date

M2M_BASE = 'https://m2m.cr.usgs.gov/api/api/json/stable'
DATASET_NAME = 'landsat_ot_c2_l2'

# M2M caps download-request labels at 50 characters; this module only ever
# requests one label's worth of downloads per fetch_landsat_scene call, so
# a fixed short label is enough - no need to encode the (much longer)
# entityId into it.
DOWNLOAD_LABEL = 'getopendatafvg'

DOWNLOAD_POLL_SECONDS = 10
DOWNLOAD_POLL_TIMEOUT_SECONDS = 300


@dataclass(frozen=True)
class UsgsCredentials:
    """USGS EROS credentials: your ERS username, and an application token
    generated from your USGS profile (M2M no longer accepts your raw
    account password).
    """

    username: str
    token: str


@dataclass(frozen=True)
class LandsatScene:
    """A downloaded Landsat scene: one file per requested band."""

    tif_paths: tuple[Path, ...]
    display_id: str
    scene_date: str
    cloud_cover_pct: float


def select_scene(scenes: list[dict[str, Any]], cloud_cover_max_pct: float) -> dict[str, Any] | None:
    """Pick the first (most recent) scene under the cloud-cover threshold,
    or None if none qualify. `scenes` must already be sorted newest-first.
    """
    for scene in scenes:
        cloud = scene.get('cloudCover')
        if cloud is not None and float(cloud) <= cloud_cover_max_pct:
            return scene
    return None


def find_band_download(options: list[dict[str, Any]], band: str) -> dict[str, Any]:
    """Find the download option for `band` (e.g. 'ST_B10') among a flat
    list combining top-level and secondaryDownloads options. Matches on
    any string field, not just productName - that field is often a
    generic label like "Landsat Collection 2 Level-2 Band File" here, with
    the actual band identifier living in displayId or entityId instead.
    """
    for option in options:
        haystack = ' '.join(str(v) for v in option.values() if isinstance(v, str)).upper()
        if band.upper() in haystack:
            return option
    raise FileNotFoundError(f'No download option matching {band!r} found among {len(options)} candidates.')


def fetch_landsat_scene(
    boundary: BaseGeometry,
    credentials: UsgsCredentials,
    out_dir: Path,
    bands: tuple[str, ...] = ('ST_B10',),
    cloud_cover_max_pct: float = 20,
    lookback_days: int = 90,
) -> LandsatScene:
    """Search the USGS M2M API for the most recent Landsat Collection 2
    Level-2 scene covering `boundary`, walking backward in time until one
    passes `cloud_cover_max_pct`, and download `bands` into `out_dir`.

    Raises NoCleanSceneFoundError if nothing qualifies within
    `lookback_days` - callers should treat that as "leave whatever data
    you already have alone", not as a reason to wipe prior output.
    """
    api_key = _get_api_key(credentials)
    scenes = _search_scenes(api_key, boundary, lookback_days)
    chosen = select_scene(scenes, cloud_cover_max_pct)
    if chosen is None:
        raise NoCleanSceneFoundError(
            f'No Landsat scene under {cloud_cover_max_pct}% cloud cover '
            f'in the last {lookback_days} days.'
        )

    options = _download_options(api_key, chosen['entityId'])
    display_id = chosen['displayId']
    out_dir.mkdir(parents=True, exist_ok=True)

    tif_paths = []
    for band in bands:
        option = find_band_download(options, band)
        url = _request_download_url(api_key, option.get('entityId') or chosen['entityId'], option['id'])
        tif_path = out_dir / f'{display_id}_{band}.TIF'
        _download_file(url, tif_path)
        tif_paths.append(tif_path)

    return LandsatScene(
        tif_paths=tuple(tif_paths),
        display_id=display_id,
        scene_date=landsat_scene_date(Path(display_id)) or '',
        cloud_cover_pct=float(chosen.get('cloudCover', 0.0)),
    )


def _m2m_post(endpoint: str, api_key: str | None, payload: dict[str, Any]) -> Any:
    headers = {'X-Auth-Token': api_key} if api_key else {}
    resp = requests.post(f'{M2M_BASE}/{endpoint}', json=payload, headers=headers, timeout=60)
    resp.raise_for_status()
    body = resp.json()
    if body.get('errorCode'):
        raise RuntimeError(f"M2M {endpoint} error: {body['errorCode']} - {body.get('errorMessage')}")
    return body['data']


def _get_api_key(credentials: UsgsCredentials) -> str:
    return _m2m_post('login-token', None, {
        'username': credentials.username,
        'token': credentials.token,
    })


def _search_scenes(api_key: str, boundary: BaseGeometry, lookback_days: int) -> list[dict[str, Any]]:
    minx, miny, maxx, maxy = boundary.bounds
    since = datetime.now(UTC) - timedelta(days=lookback_days)
    result = _m2m_post('scene-search', api_key, {
        'datasetName': DATASET_NAME,
        'maxResults': 20,
        'sceneFilter': {
            'spatialFilter': {
                'filterType': 'mbr',
                'lowerLeft': {'latitude': miny, 'longitude': minx},
                'upperRight': {'latitude': maxy, 'longitude': maxx},
            },
            'acquisitionFilter': {
                'start': since.strftime('%Y-%m-%d'),
                'end': datetime.now(UTC).strftime('%Y-%m-%d'),
            },
        },
    })
    scenes = result.get('results', [])
    scenes.sort(key=lambda s: s.get('temporalCoverage', {}).get('startDate', ''), reverse=True)
    return scenes


def _download_options(api_key: str, entity_id: str) -> list[dict[str, Any]]:
    options = _m2m_post('download-options', api_key, {
        'datasetName': DATASET_NAME,
        'entityIds': [entity_id],
    })
    combined = list(options)
    for option in options:
        combined.extend(option.get('secondaryDownloads') or [])
    return combined


def _request_download_url(api_key: str, entity_id: str, product_id: str) -> str:
    result = _m2m_post('download-request', api_key, {
        'downloads': [{'entityId': entity_id, 'productId': product_id}],
        'label': DOWNLOAD_LABEL,
    })
    for item in result.get('availableDownloads', []):
        return item['url']

    preparing = result.get('preparingDownloads', [])
    if not preparing:
        raise RuntimeError(f'download-request returned no available or preparing downloads: {result}')
    download_id = preparing[0]['downloadId']

    deadline = time.monotonic() + DOWNLOAD_POLL_TIMEOUT_SECONDS
    while time.monotonic() < deadline:
        time.sleep(DOWNLOAD_POLL_SECONDS)
        retrieve = _m2m_post('download-retrieve', api_key, {'label': DOWNLOAD_LABEL})
        for item in retrieve.get('available', []):
            if item.get('downloadId') == download_id:
                return item['url']
    raise TimeoutError(f'Download for entity {entity_id} did not become ready in time')


def _download_file(url: str, out_path: Path) -> None:
    with requests.get(url, stream=True, timeout=300) as resp:
        resp.raise_for_status()
        with out_path.open('wb') as fh:
            for chunk in resp.iter_content(chunk_size=1024 * 1024):
                fh.write(chunk)
