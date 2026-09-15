from unittest.mock import MagicMock, patch

import pytest
from shapely.geometry import box

from getopendatafvg import (
    boundary_poly_filter,
    element_point,
    fetch_overpass_elements,
    query_overpass,
)


def make_response(payload: dict) -> MagicMock:
    resp = MagicMock()
    resp.json.return_value = payload
    resp.raise_for_status.return_value = None
    return resp


def test_boundary_poly_filter_formats_lat_lon_pairs_not_lon_lat():
    # shapely stores (lon, lat); Overpass's poly: filter wants lat/lon,
    # the opposite order - this was easy to get backwards silently, same
    # class of bug as CDSE's bbox axis order earlier in this project.
    boundary = box(12.0, 46.0, 12.01, 46.01)
    result = boundary_poly_filter(boundary)
    assert result == 'poly:"46.0 12.01 46.01 12.01 46.01 12.0 46.0 12.0 46.0 12.01"'


def test_query_overpass_falls_back_to_the_next_mirror_on_failure():
    calls = []

    def fake_post(url, **kwargs):
        calls.append(url)
        if url == 'https://mirror-a':
            raise ConnectionError('mirror-a is down')
        return make_response({'elements': ['ok']})

    with patch('getopendatafvg.overpass.requests.post', side_effect=fake_post):
        result = query_overpass('[out:json];', mirrors=('https://mirror-a', 'https://mirror-b'))

    assert calls == ['https://mirror-a', 'https://mirror-b']
    assert result == {'elements': ['ok']}


def test_query_overpass_raises_the_last_error_when_every_mirror_fails():
    with patch('getopendatafvg.overpass.requests.post', side_effect=ConnectionError('all down')), \
         pytest.raises(ConnectionError):
        query_overpass('[out:json];', mirrors=('https://mirror-a', 'https://mirror-b'))


def test_fetch_overpass_elements_builds_a_query_with_selector_and_poly_and_out():
    boundary = box(12.0, 46.0, 12.01, 46.01)
    captured = {}

    def fake_post(url, data, **kwargs):
        captured['query'] = data.decode('utf-8')
        return make_response({'elements': [{'type': 'node', 'lat': 46.005, 'lon': 12.005}]})

    with patch('getopendatafvg.overpass.requests.post', side_effect=fake_post):
        elements = fetch_overpass_elements(['node["natural"="peak"]'], boundary)

    assert 'node["natural"="peak"](poly:' in captured['query']
    assert 'out tags center;' in captured['query']
    assert len(elements) == 1


def test_element_point_reads_a_node_directly():
    assert element_point({'type': 'node', 'lat': 46.1, 'lon': 12.5}) == (12.5, 46.1)


def test_element_point_reads_a_way_center():
    assert element_point({'type': 'way', 'center': {'lat': 46.1, 'lon': 12.5}}) == (12.5, 46.1)


def test_element_point_returns_none_without_coordinates():
    assert element_point({'type': 'way', 'tags': {}}) is None
