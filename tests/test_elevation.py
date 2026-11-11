from unittest.mock import MagicMock, patch

import pytest

from getopendatafvg import fetch_elevation

# The rest of this file tests behaviour, not the deprecation.
pytestmark = pytest.mark.filterwarnings('ignore:fetch_elevation is deprecated:DeprecationWarning')


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


def test_fetch_elevation_warns_that_it_is_deprecated():
    resp = make_response(412.0)
    with (
        patch('getopendatafvg.elevation.requests.get', return_value=resp),
        pytest.warns(DeprecationWarning, match='removed in getopendatafvg 1.0'),
    ):
        fetch_elevation(46.1, 12.6)
