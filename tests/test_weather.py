from unittest.mock import MagicMock, patch

from getopendatafvg import DailyWeather, fetch_historical_weather


def make_response(json_data: dict) -> MagicMock:
    resp = MagicMock()
    resp.json.return_value = json_data
    resp.raise_for_status.return_value = None
    return resp


def test_fetch_historical_weather_parses_the_daily_series():
    json_data = {
        'daily': {
            'time': ['2024-01-01', '2024-01-02'],
            'temperature_2m_mean': [4.2, 3.8],
            'precipitation_sum': [0.0, 2.5],
        }
    }
    with patch('getopendatafvg.weather.requests.get', return_value=make_response(json_data)) as get:
        result = fetch_historical_weather(46.10, 12.65, '2024-01-01', '2024-01-02')

    assert result == DailyWeather(
        dates=['2024-01-01', '2024-01-02'],
        temperature_mean_c=[4.2, 3.8],
        precipitation_mm=[0.0, 2.5],
    )
    assert get.call_args.kwargs['params']['latitude'] == 46.10
    assert get.call_args.kwargs['params']['daily'] == 'temperature_2m_mean,precipitation_sum'
    assert get.call_args.kwargs['params']['timezone'] == 'Europe/Rome'


def test_fetch_historical_weather_passes_through_a_custom_timezone():
    json_data = {'daily': {'time': [], 'temperature_2m_mean': [], 'precipitation_sum': []}}
    with patch('getopendatafvg.weather.requests.get', return_value=make_response(json_data)) as get:
        fetch_historical_weather(46.10, 12.65, '2024-01-01', '2024-01-02', timezone='UTC')

    assert get.call_args.kwargs['params']['timezone'] == 'UTC'


def test_fetch_historical_weather_returns_empty_lists_when_no_data():
    with patch('getopendatafvg.weather.requests.get', return_value=make_response({})):
        result = fetch_historical_weather(46.10, 12.65, '2024-01-01', '2024-01-02')

    assert result == DailyWeather(dates=[], temperature_mean_c=[], precipitation_mm=[])
