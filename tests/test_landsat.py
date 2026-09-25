from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from shapely.geometry import box

from getopendatafvg import NoCleanSceneFoundError, UsgsCredentials, fetch_landsat_scene
from getopendatafvg.landsat import (
    DOWNLOAD_LABEL,
    DOWNLOAD_POLL_TIMEOUT_SECONDS,
    _m2m_post,
    _request_download_url,
    find_band_download,
    select_scene,
)


def make_scene(display_id: str, cloud_cover: float) -> dict:
    return {'displayId': display_id, 'entityId': f'entity-{display_id}', 'cloudCover': cloud_cover}


def test_select_scene_walks_past_cloudy_candidates():
    scenes = [
        make_scene('too-cloudy-1', 96.0),
        make_scene('too-cloudy-2', 38.0),
        make_scene('clean', 14.0),
    ]
    assert select_scene(scenes, cloud_cover_max_pct=20)['displayId'] == 'clean'


def test_select_scene_returns_none_when_all_too_cloudy():
    scenes = [make_scene('a', 50.0), make_scene('b', 90.0)]
    assert select_scene(scenes, cloud_cover_max_pct=20) is None


def test_download_label_fits_m2m_limit():
    # A label built from a scene's own (much longer) entityId blew past
    # M2M's 50-character cap and made download-request fail outright.
    assert len(DOWNLOAD_LABEL) <= 50


def test_find_band_download_matches_on_entity_id_not_just_product_name():
    # Live behaviour: productName is a generic "Landsat Collection 2
    # Level-2 Band File" for every option - the band identifier only shows
    # up in entityId/displayId, so the search has to check every field.
    options = [
        {
            'id': 'bundle-id',
            'productName': 'Landsat Collection 2 Level-2 Product Bundle',
            'entityId': None,
        },
        {
            'id': 'st-b10-id',
            'productName': 'Landsat Collection 2 Level-2 Band File',
            'displayId': 'LC09_L2SP_192028_20260831_20260901_02_T1_ST_B10.TIF',
            'entityId': 'L2ST_LC09_L2SP_192028_20260831_20260901_02_T1_ST_B10_TIF',
        },
    ]
    found = find_band_download(options, 'ST_B10')
    assert found['id'] == 'st-b10-id'


def test_find_band_download_raises_when_no_match():
    with pytest.raises(FileNotFoundError):
        find_band_download([{'id': 'x', 'productName': 'unrelated'}], 'ST_B10')


def test_fetch_landsat_scene_raises_when_nothing_clean_found():
    boundary = box(12.5648, 46.0704, 12.7251, 46.1911)
    credentials = UsgsCredentials('user', 'token')

    with patch('getopendatafvg.landsat._m2m_post') as m2m_post, \
         pytest.raises(NoCleanSceneFoundError):
        m2m_post.side_effect = [
            'fake-api-key',
            {'results': [make_scene('too-cloudy', 90.0)]},
        ]
        fetch_landsat_scene(boundary, credentials, Path('/tmp/does-not-matter'))


def test_fetch_landsat_scene_pairs_the_secondary_downloads_own_entity_id(tmp_path):
    # Regression test: download-request needs the *secondary* download's
    # own entityId, not the parent scene's - pairing the parent's entityId
    # with the secondary's productId came back as an unexplained
    # "invalid scene" with no error message on a live run.
    boundary = box(12.5648, 46.0704, 12.7251, 46.1911)
    credentials = UsgsCredentials('user', 'token')
    scene = make_scene('LC09_L2SP_192028_20260831_20260901_02_T1', 13.2)
    secondary_entity_id = 'L2ST_LC09_L2SP_192028_20260831_20260901_02_T1_ST_B10_TIF'

    responses = [
        'fake-api-key',  # login-token
        {'results': [scene]},  # scene-search
        [  # download-options
            {
                'id': 'bundle-id',
                'productName': 'Landsat Collection 2 Level-2 Product Bundle',
                'secondaryDownloads': [
                    {
                        'id': 'st-b10-id',
                        'productName': 'Landsat Collection 2 Level-2 Band File',
                        'entityId': secondary_entity_id,
                    }
                ],
            }
        ],
        {'availableDownloads': [{'url': 'https://example.com/scene_ST_B10.TIF'}]},  # download-request
    ]

    fake_file_response = MagicMock()
    fake_file_response.iter_content.return_value = [b'fake-tif-bytes']
    fake_file_response.__enter__ = lambda self: fake_file_response
    fake_file_response.__exit__ = lambda self, *a: None

    captured_download_request_args = {}

    def fake_m2m_post(endpoint, api_key, payload):
        if endpoint == 'download-request':
            captured_download_request_args.update(payload)
        return responses.pop(0)

    with patch('getopendatafvg.landsat._m2m_post', side_effect=fake_m2m_post), \
         patch('getopendatafvg.landsat.requests.get', return_value=fake_file_response):
        result = fetch_landsat_scene(boundary, credentials, tmp_path)

    assert captured_download_request_args['downloads'] == [
        {'entityId': secondary_entity_id, 'productId': 'st-b10-id'}
    ]
    assert result.display_id == 'LC09_L2SP_192028_20260831_20260901_02_T1'
    assert result.cloud_cover_pct == 13.2
    assert len(result.tif_paths) == 1
    assert result.tif_paths[0].exists()


def m2m_response(data=None, error_code=None, error_message=None) -> MagicMock:
    resp = MagicMock()
    resp.json.return_value = {'data': data, 'errorCode': error_code, 'errorMessage': error_message}
    resp.raise_for_status.return_value = None
    return resp


def test_m2m_post_sends_the_api_key_as_an_auth_token_header():
    with patch('getopendatafvg.landsat.requests.post', return_value=m2m_response(data=[])) as post:
        _m2m_post('scene-search', 'key-123', {'x': 1})

    assert post.call_args.kwargs['headers'] == {'X-Auth-Token': 'key-123'}
    assert post.call_args.kwargs['json'] == {'x': 1}
    assert post.call_args.args[0].endswith('/scene-search')


def test_m2m_post_omits_the_header_entirely_when_there_is_no_key_yet():
    # login-token is the one call made before a key exists; sending
    # X-Auth-Token: None there would be a header with a null value.
    with patch('getopendatafvg.landsat.requests.post', return_value=m2m_response(data=[])) as post:
        _m2m_post('login-token', None, {})

    assert post.call_args.kwargs['headers'] == {}


def test_m2m_post_raises_on_an_error_code_even_though_the_http_status_was_200():
    # M2M reports application errors in a 200 body, so raise_for_status
    # alone would let them through as a successful, empty result.
    with patch('getopendatafvg.landsat.requests.post',
               return_value=m2m_response(error_code='AUTH_INVALID', error_message='bad token')), \
         pytest.raises(RuntimeError, match='AUTH_INVALID'):
        _m2m_post('login-token', None, {})


def test_request_download_url_returns_an_immediately_available_download():
    with patch('getopendatafvg.landsat._m2m_post',
               return_value={'availableDownloads': [{'url': 'https://example/a.tar'}]}) as post:
        url = _request_download_url('key', 'ENT1', 'PROD1')

    assert url == 'https://example/a.tar'
    assert post.call_count == 1  # no polling needed, so no download-retrieve


def test_request_download_url_polls_until_a_preparing_download_becomes_ready():
    responses = [
        {'availableDownloads': [], 'preparingDownloads': [{'downloadId': 42}]},
        {'available': [{'downloadId': 99, 'url': 'https://example/other.tar'}]},
        {'available': [{'downloadId': 42, 'url': 'https://example/mine.tar'}]},
    ]
    with patch('getopendatafvg.landsat._m2m_post', side_effect=responses), \
         patch('getopendatafvg.landsat.time.sleep') as sleep, \
         patch('getopendatafvg.landsat.time.monotonic', side_effect=[0, 1, 2]):
        url = _request_download_url('key', 'ENT1', 'PROD1')

    # It must wait for its own downloadId, not take the first url offered.
    assert url == 'https://example/mine.tar'
    assert sleep.call_count == 2


def test_request_download_url_gives_up_once_the_deadline_passes():
    responses = [
        {'availableDownloads': [], 'preparingDownloads': [{'downloadId': 42}]},
        {'available': []},
    ]
    with patch('getopendatafvg.landsat._m2m_post', side_effect=responses), \
         patch('getopendatafvg.landsat.time.sleep'), \
         patch('getopendatafvg.landsat.time.monotonic',
               side_effect=[0, 1, DOWNLOAD_POLL_TIMEOUT_SECONDS + 1]), \
         pytest.raises(TimeoutError, match='ENT1'):
        _request_download_url('key', 'ENT1', 'PROD1')


def test_request_download_url_raises_when_there_is_nothing_to_wait_for():
    with patch('getopendatafvg.landsat._m2m_post', return_value={}), \
         pytest.raises(RuntimeError, match='no available or preparing downloads'):
        _request_download_url('key', 'ENT1', 'PROD1')
