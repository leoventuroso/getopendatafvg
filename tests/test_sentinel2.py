from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from shapely.geometry import box

from getopendatafvg import (
    DEFAULT_BANDS,
    CdseCredentials,
    NoCleanSceneFoundError,
    fetch_sentinel2_scene,
)
from getopendatafvg.sentinel2 import _boundary_bbox_wkt, _s3_key_prefix, select_scene


def make_candidate(name: str, cloud_cover: float | None) -> dict:
    attributes = [] if cloud_cover is None else [{'Name': 'cloudCover', 'Value': cloud_cover}]
    return {
        'Name': name,
        'ContentDate': {'Start': '2026-09-13T10:00:41.024Z'},
        'Attributes': attributes,
    }


def test_select_scene_walks_past_cloudy_candidates():
    candidates = [
        make_candidate('too-cloudy-1', 96.0),
        make_candidate('too-cloudy-2', 38.0),
        make_candidate('clean', 14.0),
        make_candidate('never-reached', 5.0),
    ]
    chosen = select_scene(candidates, cloud_cover_max_pct=20)
    assert chosen['Name'] == 'clean'


def test_select_scene_returns_none_when_all_too_cloudy():
    candidates = [make_candidate('a', 50.0), make_candidate('b', 90.0)]
    assert select_scene(candidates, cloud_cover_max_pct=20) is None


def test_select_scene_skips_candidates_missing_cloud_cover():
    candidates = [make_candidate('no-attribute', None), make_candidate('clean', 10.0)]
    assert select_scene(candidates, cloud_cover_max_pct=20)['Name'] == 'clean'


def test_boundary_bbox_wkt_uses_lon_lat_order():
    # CDSE's Intersects filter expects lon/lat (x/y) pairs, not lat/lon -
    # this order was wrong once already and produced silent empty results.
    boundary = box(12.5648, 46.0704, 12.7251, 46.1911)
    wkt = _boundary_bbox_wkt(boundary)
    assert wkt == 'POLYGON((12.5648 46.0704,12.7251 46.0704,12.7251 46.1911,12.5648 46.1911,12.5648 46.0704))'


def test_s3_key_prefix_format():
    prefix = _s3_key_prefix('S2A_MSIL2A_20260913T100041_N0512_R122_T32TQS_20260913T164134.SAFE', '2026-09-13T10:00:41.024Z')
    assert prefix == 'Sentinel-2/MSI/L2A/2026/09/13/S2A_MSIL2A_20260913T100041_N0512_R122_T32TQS_20260913T164134.SAFE'


def test_fetch_sentinel2_scene_raises_when_nothing_clean_found():
    boundary = box(12.5648, 46.0704, 12.7251, 46.1911)
    credentials = CdseCredentials('user', 'pass', 'key', 'secret')

    token_response = MagicMock(json=lambda: {'access_token': 'fake-token'})
    search_response = MagicMock(json=lambda: {'value': [make_candidate('too-cloudy', 90.0)]})

    with patch('getopendatafvg.sentinel2.requests.post', return_value=token_response), \
         patch('getopendatafvg.sentinel2.requests.get', return_value=search_response), \
         pytest.raises(NoCleanSceneFoundError):
        fetch_sentinel2_scene(boundary, credentials, Path('/tmp/does-not-matter'))


def test_fetch_sentinel2_scene_downloads_the_selected_scene(tmp_path):
    boundary = box(12.5648, 46.0704, 12.7251, 46.1911)
    credentials = CdseCredentials('user', 'pass', 'key', 'secret')
    product_name = 'S2A_MSIL2A_20260913T100041_N0512_R122_T32TQS_20260913T164134.SAFE'

    token_response = MagicMock(json=lambda: {'access_token': 'fake-token'})
    search_response = MagicMock(json=lambda: {'value': [make_candidate(product_name, 13.2)]})

    fake_s3 = MagicMock()
    fake_s3.list_objects_v2.side_effect = [
        {'CommonPrefixes': [{'Prefix': 'Sentinel-2/MSI/L2A/2026/09/13/' + product_name + '/GRANULE/L2A_T32TQS_A058635_20260913T100317/'}]},
        {'Contents': [{'Key': 'x/T32TQS_20260913T100041_B04_10m.jp2'}]},
        {'Contents': [{'Key': 'x/T32TQS_20260913T100041_B08_10m.jp2'}]},
        {'Contents': [{'Key': 'x/T32TQS_20260913T100041_B8A_20m.jp2'}]},
        {'Contents': [{'Key': 'x/T32TQS_20260913T100041_B12_20m.jp2'}]},
        {'Contents': [{'Key': 'x/T32TQS_20260913T100041_SCL_20m.jp2'}]},
    ]

    with patch('getopendatafvg.sentinel2.requests.post', return_value=token_response), \
         patch('getopendatafvg.sentinel2.requests.get', return_value=search_response), \
         patch('getopendatafvg.sentinel2.boto3.client', return_value=fake_s3):
        scene = fetch_sentinel2_scene(boundary, credentials, tmp_path)

    assert scene.product_name == product_name
    assert scene.scene_date == '2026-09-13'
    assert scene.cloud_cover_pct == 13.2
    assert fake_s3.download_file.call_count == len(DEFAULT_BANDS)
