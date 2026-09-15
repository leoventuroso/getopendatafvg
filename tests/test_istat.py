from unittest.mock import MagicMock, patch

from getopendatafvg import (
    fetch_bank_branches,
    fetch_demographic_balance,
    fetch_demographic_indicators,
    fetch_istat_dataflow,
    fetch_population_series,
)
from getopendatafvg import istat as istat_module
from getopendatafvg.istat import _correct_end_period, _throttle


def make_response(csv_text: str) -> MagicMock:
    resp = MagicMock()
    resp.text = csv_text
    resp.raise_for_status.return_value = None
    return resp


def test_correct_end_period_subtracts_one_from_a_plain_year():
    # Confirmed live against the real endpoint: endPeriod=2020 returns
    # data through 2021. A 4-digit year gets -1 so callers get what they
    # actually asked for.
    assert _correct_end_period('2020') == '2019'


def test_correct_end_period_leaves_non_year_periods_unchanged():
    # The bug is specifically about whole-year filtering; a quarter/month
    # value isn't known to be affected, so it's passed through as-is.
    assert _correct_end_period('2020-Q1') == '2020-Q1'


def test_fetch_istat_dataflow_sends_the_corrected_end_period():
    istat_module._request_times.clear()
    csv_text = 'TIME_PERIOD,OBS_VALUE\n2020,100\n'
    with patch('getopendatafvg.istat.requests.get', return_value=make_response(csv_text)) as get:
        fetch_istat_dataflow('22_289', 'A.093042....', end_period='2020')

    assert get.call_args.kwargs['params']['endPeriod'] == '2019'


def test_fetch_istat_dataflow_returns_empty_list_for_empty_response_not_an_error():
    istat_module._request_times.clear()
    with patch('getopendatafvg.istat.requests.get', return_value=make_response('TIME_PERIOD,OBS_VALUE\n')):
        rows = fetch_istat_dataflow('117_1035', 'A.093042....')

    assert rows == []


def test_fetch_population_series_filters_sex_and_data_type_and_sorts():
    istat_module._request_times.clear()
    csv_text = (
        'TIME_PERIOD,OBS_VALUE,SEX,DATA_TYPE\n'
        '2021,2182,9,JAN\n'
        '2020,2224,9,JAN\n'
        '2020,1000,1,JAN\n'  # wrong sex - excluded
        '2020,500,9,OTHER\n'  # wrong data type - excluded
    )
    with patch('getopendatafvg.istat.requests.get', return_value=make_response(csv_text)):
        series = fetch_population_series('093042', since_year=2020)

    assert series == [{'year': 2020, 'value': 2224}, {'year': 2021, 'value': 2182}]


def test_fetch_demographic_balance_picks_the_latest_year_per_field():
    istat_module._request_times.clear()
    csv_text = (
        'TIME_PERIOD,OBS_VALUE,SEX,DATA_TYPE\n'
        '2019,900,9,NUMPRHO_CP\n'
        '2020,950,9,NUMPRHO_CP\n'
        '2020,2.1,9,AVNUHM_CP\n'
        '2020,150.5,9,POPCOM_CP\n'
    )
    with patch('getopendatafvg.istat.requests.get', return_value=make_response(csv_text)):
        result = fetch_demographic_balance('093042')

    assert result == {'households': 950, 'avg_household_size': 2.1, 'population_density_km2': 150.5}


def test_fetch_demographic_indicators_reads_provincial_fields():
    istat_module._request_times.clear()
    csv_text = (
        'TIME_PERIOD,OBS_VALUE,DATA_TYPE\n'
        '2024,47.5,MEANAGEP\n'
        '2024,223.4,AGEINDEX\n'
    )
    with patch('getopendatafvg.istat.requests.get', return_value=make_response(csv_text)):
        result = fetch_demographic_indicators('ITD41')

    assert result['avg_age'] == 47.5
    assert result['old_age_index'] == 223.4
    assert result['pct_pop_65_over'] is None


def test_fetch_bank_branches_returns_the_latest_year():
    istat_module._request_times.clear()
    csv_text = 'TIME_PERIOD,OBS_VALUE,DATA_TYPE\n2017,1,BANK_BRN\n2018,2,BANK_BRN\n'
    with patch('getopendatafvg.istat.requests.get', return_value=make_response(csv_text)):
        assert fetch_bank_branches('093042') == 2


def test_fetch_bank_branches_returns_none_when_no_rows():
    istat_module._request_times.clear()
    with patch('getopendatafvg.istat.requests.get', return_value=make_response('TIME_PERIOD,OBS_VALUE,DATA_TYPE\n')):
        assert fetch_bank_branches('093042') is None


def test_throttle_does_not_sleep_under_the_limit(monkeypatch):
    istat_module._request_times.clear()
    sleeps = []
    monkeypatch.setattr(istat_module.time, 'sleep', lambda s: sleeps.append(s))
    monkeypatch.setattr(istat_module.time, 'monotonic', lambda: 100.0)

    for _ in range(istat_module.RATE_LIMIT_REQUESTS):
        _throttle()

    assert sleeps == []


def test_throttle_sleeps_once_the_limit_is_reached(monkeypatch):
    istat_module._request_times.clear()
    sleeps = []
    monkeypatch.setattr(istat_module.time, 'sleep', lambda s: sleeps.append(s))
    monkeypatch.setattr(istat_module.time, 'monotonic', lambda: 100.0)

    for _ in range(istat_module.RATE_LIMIT_REQUESTS):
        _throttle()
    _throttle()  # one more within the same 60s window

    assert len(sleeps) == 1
    assert sleeps[0] > 0
