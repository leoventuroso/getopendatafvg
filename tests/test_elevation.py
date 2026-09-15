from unittest.mock import MagicMock, patch

from getopendatafvg import fetch_elevation


def make_response(elevation: float) -> MagicMock:
    resp = MagicMock()
    resp.json.return_value = {'results': [{'latitude': 46.1, 'longitude': 12.6, 'elevation': elevation}]}
    resp.raise_for_status.return_value = None
    return resp


def test_fetch_elevation_returns_the_elevation_value():
    with patch('getopendatafvg.elevation.requests.get', return_value=make_response(412.0)) as get:
        result = fetch_elevation(46.1, 12.6)

    assert result == 412.0
    assert get.call_args.kwargs['params']['locations'] == '46.1,12.6'


def test_fetch_elevation_returns_zero_for_ocean_points():
    with patch('getopendatafvg.elevation.requests.get', return_value=make_response(0.0)):
        assert fetch_elevation(40.0, 10.0) == 0.0
