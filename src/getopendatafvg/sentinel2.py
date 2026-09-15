"""Search and download Sentinel-2 L2A scenes from the Copernicus Data
Space Ecosystem (CDSE), for a given boundary, walking backward in time
until a sufficiently cloud-free scene is found.

Downloads land in a .SAFE/GRANULE/.../IMG_DATA/Rxxm/ layout matching what
a manual Copernicus Browser download produces, so downstream raster code
(NDVI, NBR, ...) needs no changes regardless of how the scene got there.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import boto3
import requests
from shapely.geometry.base import BaseGeometry

from ._errors import NoCleanSceneFoundError
from .scene_date import sentinel2_scene_date

IDENTITY_TOKEN_URL = (
    'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token'
)
CATALOGUE_URL = 'https://catalogue.dataspace.copernicus.eu/odata/v1/Products'
S3_ENDPOINT = 'https://eodata.dataspace.copernicus.eu'
S3_REGION = 'default'
CANDIDATES_PER_PAGE = 20


@dataclass(frozen=True)
class CdseCredentials:
    """CDSE credentials: username/password for catalogue search and auth,
    S3 access/secret key (generated separately, from the CDSE dashboard's
    S3 Keys Manager) for downloading bands from the eodata object storage.
    """

    username: str
    password: str
    s3_access_key: str
    s3_secret_key: str


@dataclass(frozen=True)
class Band:
    """One Sentinel-2 band to download, at a given resolution."""

    id: str
    resolution_dir: str
    resolution_suffix: str


# Union of what NDVI (B04, B08 @ 10m) and NBR (B8A, B12, SCL @ 20m) need -
# a reasonable default for vegetation/burn-severity work. Pass your own
# `bands` to fetch_sentinel2_scene for anything else.
DEFAULT_BANDS: tuple[Band, ...] = (
    Band('B04', 'R10m', '10m'),
    Band('B08', 'R10m', '10m'),
    Band('B8A', 'R20m', '20m'),
    Band('B12', 'R20m', '20m'),
    Band('SCL', 'R20m', '20m'),
)


@dataclass(frozen=True)
class Sentinel2Scene:
    """A downloaded Sentinel-2 scene."""

    safe_dir: Path
    product_name: str
    scene_date: str
    cloud_cover_pct: float


def select_scene(
    candidates: list[dict[str, Any]], cloud_cover_max_pct: float
) -> dict[str, Any] | None:
    """Pick the first (most recent) candidate under the cloud-cover
    threshold, or None if none qualify. `candidates` must already be
    sorted newest-first. Pulled out of fetch_sentinel2_scene so the
    walk-back logic is unit-testable without hitting the network.
    """
    for product in candidates:
        cloud = _cloud_cover_pct(product)
        if cloud is not None and cloud <= cloud_cover_max_pct:
            return product
    return None


def fetch_sentinel2_scene(
    boundary: BaseGeometry,
    credentials: CdseCredentials,
    out_dir: Path,
    bands: tuple[Band, ...] = DEFAULT_BANDS,
    cloud_cover_max_pct: float = 20,
    lookback_days: int = 90,
) -> Sentinel2Scene:
    """Search CDSE for the most recent Sentinel-2 L2A scene covering
    `boundary`, walking backward in time until one passes
    `cloud_cover_max_pct`, and download `bands` into `out_dir`.

    Raises NoCleanSceneFoundError if nothing qualifies within
    `lookback_days` - callers should treat that as "leave whatever data
    you already have alone", not as a reason to wipe prior output.
    """
    token = _get_access_token(credentials)
    candidates = _search_candidates(token, boundary, lookback_days)
    chosen = select_scene(candidates, cloud_cover_max_pct)
    if chosen is None:
        raise NoCleanSceneFoundError(
            f'No Sentinel-2 scene under {cloud_cover_max_pct}% cloud cover '
            f'in the last {lookback_days} days.'
        )

    client = _s3_client(credentials)
    safe_dir = _download_bands(client, chosen['Name'], chosen['ContentDate']['Start'], out_dir, bands)

    return Sentinel2Scene(
        safe_dir=safe_dir,
        product_name=chosen['Name'],
        scene_date=sentinel2_scene_date(Path(chosen['Name'])) or '',
        cloud_cover_pct=_cloud_cover_pct(chosen) or 0.0,
    )


def _get_access_token(credentials: CdseCredentials) -> str:
    resp = requests.post(
        IDENTITY_TOKEN_URL,
        data={
            'client_id': 'cdse-public',
            'grant_type': 'password',
            'username': credentials.username,
            'password': credentials.password,
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()['access_token']


def _boundary_bbox_wkt(boundary: BaseGeometry) -> str:
    minx, miny, maxx, maxy = boundary.bounds
    return f'POLYGON(({minx} {miny},{maxx} {miny},{maxx} {maxy},{minx} {maxy},{minx} {miny}))'


def _search_candidates(token: str, boundary: BaseGeometry, lookback_days: int) -> list[dict[str, Any]]:
    since = (datetime.now(UTC) - timedelta(days=lookback_days)).strftime('%Y-%m-%dT%H:%M:%SZ')
    filter_expr = (
        "Collection/Name eq 'SENTINEL-2' and "
        "contains(Name,'MSIL2A') and "
        f"OData.CSC.Intersects(area=geography'SRID=4326;{_boundary_bbox_wkt(boundary)}') and "
        f'ContentDate/Start gt {since}'
    )
    resp = requests.get(
        CATALOGUE_URL,
        params={
            '$filter': filter_expr,
            '$orderby': 'ContentDate/Start desc',
            '$top': CANDIDATES_PER_PAGE,
            '$expand': 'Attributes',
        },
        headers={'Authorization': f'Bearer {token}'},
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json().get('value', [])


def _cloud_cover_pct(product: dict[str, Any]) -> float | None:
    for attr in product.get('Attributes', []):
        if attr.get('Name') == 'cloudCover':
            return float(attr['Value'])
    return None


def _s3_client(credentials: CdseCredentials):
    return boto3.client(
        's3',
        endpoint_url=S3_ENDPOINT,
        aws_access_key_id=credentials.s3_access_key,
        aws_secret_access_key=credentials.s3_secret_key,
        region_name=S3_REGION,
    )


def _s3_key_prefix(product_name: str, sensing_start: str) -> str:
    dt = datetime.fromisoformat(sensing_start)
    return f'Sentinel-2/MSI/L2A/{dt:%Y}/{dt:%m}/{dt:%d}/{product_name}'


def _find_granule_dir(client: Any, bucket: str, prefix: str) -> str:
    resp = client.list_objects_v2(Bucket=bucket, Prefix=f'{prefix}/GRANULE/', Delimiter='/')
    granules = [p['Prefix'] for p in resp.get('CommonPrefixes', [])]
    if not granules:
        raise FileNotFoundError(f'No GRANULE directory found under {prefix}')
    return granules[0].rstrip('/').rsplit('/', 1)[-1]


def _download_bands(
    client: Any, product_name: str, sensing_start: str, out_dir: Path, bands: tuple[Band, ...]
) -> Path:
    bucket = 'eodata'
    prefix = _s3_key_prefix(product_name, sensing_start)
    granule = _find_granule_dir(client, bucket, prefix)

    safe_dir = out_dir / product_name
    for band in bands:
        remote_dir = f'{prefix}/GRANULE/{granule}/IMG_DATA/{band.resolution_dir}/'
        resp = client.list_objects_v2(Bucket=bucket, Prefix=remote_dir)
        matches = [
            o['Key']
            for o in resp.get('Contents', [])
            if f'_{band.id}_{band.resolution_suffix}.jp2' in o['Key']
        ]
        if not matches:
            raise FileNotFoundError(f'Band {band.id} at {band.resolution_dir} not found under {remote_dir}')
        remote_key = matches[0]
        local_path = safe_dir / 'GRANULE' / granule / 'IMG_DATA' / band.resolution_dir / Path(remote_key).name
        local_path.parent.mkdir(parents=True, exist_ok=True)
        client.download_file(bucket, remote_key, str(local_path))

    return safe_dir
