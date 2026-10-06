from unittest.mock import MagicMock, patch

from getopendatafvg import (
    FVG_NUTS_AREAS,
    fetch_bank_branches,
    fetch_consumer_price_index,
    fetch_demographic_balance,
    fetch_demographic_indicators,
    fetch_employment_rate,
    fetch_income_series,
    fetch_istat_dataflow,
    fetch_population_series,
    fetch_tourism_capacity,
    fetch_tourism_flows,
)
from getopendatafvg import istat as istat_module
from getopendatafvg.istat import TOURISM_TOTAL_KEYS, _correct_end_period, _throttle


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


def test_fetch_income_series_computes_the_average_from_total_and_filer_count():
    istat_module._request_times.clear()
    csv_text = (
        'TIME_PERIOD,OBS_VALUE,DATA_TYPE,AMOUNT_CLASS\n'
        '2023,38168024,TAXABINCR,TOTAL\n'
        '2023,1712,TAXABINCF,TOTAL\n'
        '2023,999,TAXABINCR,E0-10000\n'  # bracket row, not TOTAL - excluded
    )
    with patch('getopendatafvg.istat.requests.get', return_value=make_response(csv_text)):
        series = fetch_income_series('093042', since_year=2023)

    assert series == [
        {
            'year': 2023,
            'total_taxable_income_eur': 38168024.0,
            'taxpayer_count': 1712,
            'average_taxable_income_eur': round(38168024 / 1712, 2),
        }
    ]


def test_fetch_income_series_leaves_the_average_none_when_a_value_is_redacted():
    istat_module._request_times.clear()
    csv_text = 'TIME_PERIOD,OBS_VALUE,DATA_TYPE,AMOUNT_CLASS\n2023,,TAXABINCR,TOTAL\n2023,50,TAXABINCF,TOTAL\n'
    with patch('getopendatafvg.istat.requests.get', return_value=make_response(csv_text)):
        series = fetch_income_series('093042', since_year=2023)

    assert series == [
        {
            'year': 2023,
            'total_taxable_income_eur': None,
            'taxpayer_count': 50,
            'average_taxable_income_eur': None,
        }
    ]


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


EMPLOYMENT_HEADER = (
    'DATA_TYPE,REF_AREA,SEX,AGE,EDU_LEV_HIGHEST,CITIZENSHIP,TIME_PERIOD,OBS_VALUE\n'
)


def employment_csv(*rows: str) -> str:
    return EMPLOYMENT_HEADER + ''.join(rows)


def test_fetch_employment_rate_builds_a_seven_position_key():
    # 150_915 has 7 dimensions; a key with the wrong arity is a 404, not
    # a filtered result.
    istat_module._request_times.clear()
    with patch('getopendatafvg.istat.requests.get',
               return_value=make_response(employment_csv())) as get:
        fetch_employment_rate('ITD4')

    assert get.call_args.args[0].endswith('/data/150_915/A.ITD4.....')


def test_fetch_employment_rate_keeps_only_the_headline_total_series():
    istat_module._request_times.clear()
    csv_text = employment_csv(
        'EMP_R,ITD4,9,Y15-64,99,TOTAL,2023,68.7\n',
        'EMP_R,ITD4,1,Y15-64,99,TOTAL,2023,74.0\n',       # solo maschi
        'EMP_R,ITD4,9,Y15-24,99,TOTAL,2023,28.7\n',       # altra fascia d'eta
        'EMP_R,ITD4,9,Y15-64,3,TOTAL,2023,80.1\n',        # un solo titolo di studio
        'EMP_R,ITD4,9,Y15-64,99,ITL,2023,70.2\n',         # soli cittadini italiani
        'UNEMP_R,ITD4,9,Y15-64,99,TOTAL,2023,4.5\n',      # altro indicatore
    )
    with patch('getopendatafvg.istat.requests.get', return_value=make_response(csv_text)):
        series = fetch_employment_rate('ITD4')

    assert series == [{'year': 2023, 'employment_rate_pct': 68.7}]


def test_fetch_employment_rate_sorts_oldest_to_newest():
    istat_module._request_times.clear()
    csv_text = employment_csv(
        'EMP_R,ITD4,9,Y15-64,99,TOTAL,2024,69.8\n',
        'EMP_R,ITD4,9,Y15-64,99,TOTAL,2019,66.6\n',
        'EMP_R,ITD4,9,Y15-64,99,TOTAL,2022,68.5\n',
    )
    with patch('getopendatafvg.istat.requests.get', return_value=make_response(csv_text)):
        series = fetch_employment_rate('ITD4')

    assert [r['year'] for r in series] == [2019, 2022, 2024]


def test_fetch_employment_rate_can_select_another_age_band():
    istat_module._request_times.clear()
    csv_text = employment_csv(
        'EMP_R,ITD4,9,Y15-64,99,TOTAL,2023,68.7\n',
        'EMP_R,ITD4,9,Y15-24,99,TOTAL,2023,28.7\n',
    )
    with patch('getopendatafvg.istat.requests.get', return_value=make_response(csv_text)):
        series = fetch_employment_rate('ITD4', age='Y15-24')

    assert series == [{'year': 2023, 'employment_rate_pct': 28.7}]


def test_fetch_employment_rate_skips_a_suppressed_observation():
    istat_module._request_times.clear()
    csv_text = employment_csv(
        'EMP_R,ITD4,9,Y15-64,99,TOTAL,2023,\n',
        'EMP_R,ITD4,9,Y15-64,99,TOTAL,2024,69.8\n',
    )
    with patch('getopendatafvg.istat.requests.get', return_value=make_response(csv_text)):
        series = fetch_employment_rate('ITD4')

    # A blank OBS_VALUE would be a ValueError from float(), not a 0.0.
    assert series == [{'year': 2024, 'employment_rate_pct': 69.8}]


def test_fvg_nuts_areas_use_the_pre_2013_vintage_this_dataflow_needs():
    # The modern codes (ITH4, ITH41...) 404 on 150_915. If this mapping
    # ever gets "modernised", every employment call breaks.
    assert FVG_NUTS_AREAS['fvg'] == 'ITD4'
    assert set(FVG_NUTS_AREAS) == {'fvg', 'pordenone', 'udine', 'gorizia', 'trieste'}
    assert all(code.startswith('ITD4') for code in FVG_NUTS_AREAS.values())


TOURISM_DIMS = (
    'DATA_TYPE,REF_AREA,TYPE_ACCOMMODATION,ECON_ACTIVITY_NACE_2007,COUNTRY_RES_GUESTS,'
    'LOCALITY_TYPE,URBANIZ_DEGREE,COASTAL_AREA,SIZE_BY_NUMBER_ROOMS,TIME_PERIOD,OBS_VALUE\n'
)


def tourism_row(data_type, value, country='WORLD', locality='ALL', year='2023',
                accommodation='ALL', nace='551_553', size='TOT'):
    return (f'{data_type},ITD4,{accommodation},{nace},{country},{locality},ALL,ALL,'
            f'{size},{year},{value}\n')


def tourism_csv(*rows: str) -> str:
    return TOURISM_DIMS + ''.join(rows)


def test_fetch_tourism_flows_builds_an_eleven_position_key():
    istat_module._request_times.clear()
    with patch('getopendatafvg.istat.requests.get',
               return_value=make_response(tourism_csv())) as get:
        fetch_tourism_flows('ITD4')

    key = get.call_args.args[0].rsplit('/', 1)[1]
    assert key == 'A.ITD4' + '.' * 9
    assert len(key.split('.')) == 11


def test_fetch_tourism_flows_takes_the_all_localities_total_not_a_subtotal():
    # The real failure this guards: for ITD4 in 2023 the LOCALITY_TYPE
    # dimension returns 11 rows for one year. ALL is 2,910,023 arrivals,
    # TOUR_THRM is 21,334, and letting the last row win produced a
    # plausible-looking number 100x out.
    istat_module._request_times.clear()
    csv_text = tourism_csv(
        tourism_row('AR', '2910023', locality='ALL'),
        tourism_row('AR', '1280414', locality='TOUR_SEASD'),
        tourism_row('AR', '233734', locality='TOUR_MOUNT'),
        tourism_row('AR', '21334', locality='TOUR_THRM'),
        tourism_row('NI', '9946875', locality='ALL'),
        tourism_row('NI', '60767', locality='TOUR_THRM'),
    )
    with patch('getopendatafvg.istat.requests.get', return_value=make_response(csv_text)):
        series = fetch_tourism_flows('ITD4')

    assert series == [{'year': 2023, 'arrivals': 2910023, 'nights': 9946875,
                       'average_stay_nights': round(9946875 / 2910023, 2)}]


def test_fetch_tourism_flows_ignores_a_single_country_of_residence():
    istat_module._request_times.clear()
    csv_text = tourism_csv(
        tourism_row('AR', '2910023', country='WORLD'),
        tourism_row('AR', '1500000', country='IT'),
        tourism_row('AR', '1410023', country='WRL_X_ITA'),
    )
    with patch('getopendatafvg.istat.requests.get', return_value=make_response(csv_text)):
        series = fetch_tourism_flows('ITD4')

    assert series[0]['arrivals'] == 2910023


def test_fetch_tourism_flows_returns_empty_for_a_comune_rather_than_failing():
    # 122_54 has comune rows, but only capacity ones: AR and NI are absent
    # at comune level, so this is the documented empty result, not an error.
    istat_module._request_times.clear()
    csv_text = tourism_csv(tourism_row('BEDS', '193', country='NAP'))
    with patch('getopendatafvg.istat.requests.get', return_value=make_response(csv_text)):
        assert fetch_tourism_flows('093042') == []


def test_fetch_tourism_capacity_collects_the_three_indicators_per_year():
    istat_module._request_times.clear()
    csv_text = tourism_csv(
        tourism_row('NUM_EST', '15', country='NAP', year='2023'),
        tourism_row('BEDS', '193', country='NAP', year='2023'),
        tourism_row('BED_RMS', '60', country='NAP', year='2023'),
        tourism_row('BTH_RMS', '58', country='NAP', year='2023'),  # non esposto
        tourism_row('NUM_EST', '16', country='NAP', year='2024'),
    )
    with patch('getopendatafvg.istat.requests.get', return_value=make_response(csv_text)):
        series = fetch_tourism_capacity('093042')

    assert series == [
        {'year': 2023, 'establishments': 15, 'beds': 193, 'rooms': 60},
        {'year': 2024, 'establishments': 16, 'beds': None, 'rooms': None},
    ]


def test_fetch_tourism_capacity_skips_a_star_rating_subtotal():
    istat_module._request_times.clear()
    csv_text = tourism_csv(
        tourism_row('BEDS', '193', country='NAP', accommodation='ALL'),
        tourism_row('BEDS', '40', country='NAP', accommodation='2_STARSHOTELS'),
    )
    with patch('getopendatafvg.istat.requests.get', return_value=make_response(csv_text)):
        series = fetch_tourism_capacity('093042')

    assert series == [{'year': 2023, 'establishments': None, 'beds': 193, 'rooms': None}]


def test_tourism_total_keys_pin_every_breakdown_dimension():
    # If a dimension is dropped from here, its subtotals start leaking
    # into the series silently.
    assert TOURISM_TOTAL_KEYS == {
        'TYPE_ACCOMMODATION': 'ALL',
        'ECON_ACTIVITY_NACE_2007': '551_553',
        'LOCALITY_TYPE': 'ALL',
        'URBANIZ_DEGREE': 'ALL',
        'COASTAL_AREA': 'ALL',
        'SIZE_BY_NUMBER_ROOMS': 'TOT',
    }


CPI_HEADER = 'DATA_TYPE,REF_AREA,MEASURE,E_COICOP_REV_ISTAT,TIME_PERIOD,OBS_VALUE\n'


def cpi_row(measure, value, period='2024-01', coicop='00', data_type='39'):
    return f'{data_type},ITD42,{measure},{coicop},{period},{value}\n'


def test_fetch_consumer_price_index_builds_a_five_position_monthly_key():
    istat_module._request_times.clear()
    with patch('getopendatafvg.istat.requests.get',
               return_value=make_response(CPI_HEADER)) as get:
        fetch_consumer_price_index('ITD42', since_year=2024)

    key = get.call_args.args[0].rsplit('/', 1)[1]
    assert key == 'M.ITD42...'
    assert len(key.split('.')) == 5
    # Monthly flow, so the window starts at a month, not a bare year.
    assert get.call_args.kwargs['params']['startPeriod'] == '2024-01'


def test_fetch_consumer_price_index_pairs_the_index_with_its_yoy_change():
    istat_module._request_times.clear()
    csv_text = CPI_HEADER + ''.join([
        cpi_row('4', '120.3'),
        cpi_row('7', '1.2'),
        cpi_row('6', '0.3'),  # congiunturale: non esposta
    ])
    with patch('getopendatafvg.istat.requests.get', return_value=make_response(csv_text)):
        series = fetch_consumer_price_index('ITD42')

    assert series == [{'period': '2024-01', 'index': 120.3, 'yoy_change_pct': 1.2}]


def test_fetch_consumer_price_index_sorts_by_period_and_keeps_months_distinct():
    istat_module._request_times.clear()
    csv_text = CPI_HEADER + ''.join([
        cpi_row('4', '120.4', period='2024-06'),
        cpi_row('4', '120.3', period='2024-01'),
        cpi_row('4', '120.2', period='2024-02'),
    ])
    with patch('getopendatafvg.istat.requests.get', return_value=make_response(csv_text)):
        series = fetch_consumer_price_index('ITD42')

    assert [r['period'] for r in series] == ['2024-01', '2024-02', '2024-06']


def test_fetch_consumer_price_index_ignores_other_coicop_divisions():
    istat_module._request_times.clear()
    csv_text = CPI_HEADER + ''.join([
        cpi_row('4', '120.3', coicop='00'),
        cpi_row('4', '134.9', coicop='01'),   # alimentari
        cpi_row('4', '131.2', coicop='011'),
    ])
    with patch('getopendatafvg.istat.requests.get', return_value=make_response(csv_text)):
        assert fetch_consumer_price_index('ITD42') == [
            {'period': '2024-01', 'index': 120.3, 'yoy_change_pct': None}
        ]


def test_fetch_consumer_price_index_can_select_a_coicop_division():
    istat_module._request_times.clear()
    csv_text = CPI_HEADER + ''.join([
        cpi_row('4', '120.3', coicop='00'),
        cpi_row('4', '134.9', coicop='01'),
    ])
    with patch('getopendatafvg.istat.requests.get', return_value=make_response(csv_text)):
        series = fetch_consumer_price_index('ITD42', coicop='01')

    assert series[0]['index'] == 134.9
