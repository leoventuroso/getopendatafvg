"""Fetch ISTAT statistics for a comune or province via the SDMX REST API
(esploradati.istat.it - the modern endpoint). The legacy sdmx.istat.it
endpoint some older tooling falls back to for less common datasets isn't
used here: querying it directly now redirects every data request to its
own homepage instead of serving data, confirmed live rather than assumed,
so it's treated as gone rather than as a resilience target.

Two server-side quirks of the modern endpoint this module works around,
both confirmed against live requests (documented independently by
ondata/guida-api-istat):

- `endPeriod` returns one year *more* than requested - pass the year you
  actually want; the correction happens internally.
- ISTAT enforces 5 requests/minute per IP, with a 1-2 *day* block if
  exceeded - every request here goes through a client-side throttle to
  stay under that rather than risk it.
"""

from __future__ import annotations

import csv
import io
import time
from collections import deque

import requests

BASE_URL = 'https://esploradati.istat.it/SDMXWS/rest'
CSV_ACCEPT_HEADER = 'application/vnd.sdmx.data+csv;version=1.0.0'

RATE_LIMIT_REQUESTS = 5
RATE_LIMIT_WINDOW_SECONDS = 60

_request_times: deque[float] = deque()


def fetch_istat_dataflow(
    flow: str,
    key: str = '....',
    start_period: str | None = None,
    end_period: str | None = None,
    timeout: int = 60,
    **extra_params: str,
) -> list[dict[str, str]]:
    """GET a dataflow from ISTAT's SDMX REST API as a list of row dicts
    (one per observation, string values - callers convert types). Empty
    results come back as an empty list, not an error - "no rows" is a
    legitimate answer (e.g. a comune with genuinely no bank branches),
    not necessarily a failure.

    `end_period`, if given, is the last period you actually want
    included. ISTAT's API takes a year-granularity value one year
    further than requested (a confirmed, documented server bug), so a
    plain 4-digit year has 1 subtracted before being sent; anything else
    (a quarter like "2020-Q1", a month, ...) is passed through unchanged
    since the bug is specifically about whole-year filtering.
    """
    _throttle()

    params: dict[str, str] = dict(extra_params)
    if start_period is not None:
        params['startPeriod'] = start_period
    if end_period is not None:
        params['endPeriod'] = _correct_end_period(end_period)

    url = f'{BASE_URL}/data/{flow}/{key}'
    resp = requests.get(url, headers={'Accept': CSV_ACCEPT_HEADER}, params=params, timeout=timeout)
    resp.raise_for_status()
    return list(csv.DictReader(io.StringIO(resp.text)))


def fetch_population_series(comune_code: str, since_year: int = 2019) -> list[dict[str, int]]:
    """Yearly resident population (1 January) for a comune, from
    dataflow 22_289, sorted oldest to newest. Only covers `since_year`
    onward (2019 at the earliest) - ISTAT's pre-2019 population history
    lived on the now-unreachable legacy endpoint and isn't available
    here; there's no reliable API source for it anymore.
    """
    rows = fetch_istat_dataflow('22_289', f'A.{comune_code}....', start_period=str(since_year))
    series = [
        {'year': int(row['TIME_PERIOD']), 'value': int(float(row['OBS_VALUE']))}
        for row in rows
        if row.get('SEX') == '9' and row.get('DATA_TYPE') == 'JAN'
    ]
    return sorted(series, key=lambda r: r['year'])


def fetch_demographic_balance(comune_code: str) -> dict[str, float | None]:
    """Households, average household size, and population density for a
    comune, from the latest year available in dataflow 22_315.
    """
    rows = fetch_istat_dataflow('22_315', f'A.{comune_code}....')
    latest = _latest_by_data_type(rows, sex='9')
    return {
        'households': _as_int(latest.get('NUMPRHO_CP')),
        'avg_household_size': _as_float(latest.get('AVNUHM_CP')),
        'population_density_km2': _as_float(latest.get('POPCOM_CP')),
    }


def fetch_demographic_indicators(province_code: str) -> dict[str, float | None]:
    """Average age, old-age index, and age-group percentages, from the
    latest year available in dataflow 22_293_DF_DCIS_INDDEMOG1_1. Only
    published at province level, not per comune.
    """
    rows = fetch_istat_dataflow('22_293_DF_DCIS_INDDEMOG1_1', f'A.{province_code}....')
    latest = _latest_by_data_type(rows)
    return {
        'avg_age': _as_float(latest.get('MEANAGEP')),
        'old_age_index': _as_float(latest.get('AGEINDEX')),
        'pct_pop_65_over': _as_float(latest.get('POP65OVER')),
        'pct_pop_0_14': _as_float(latest.get('POP014')),
    }


def fetch_bank_branches(comune_code: str) -> int | None:
    """Number of bank branches in a comune, from the latest year
    available in dataflow 117_1035. This dataset has migrated to the
    modern endpoint since older tooling was written against it (confirmed
    live) - no legacy endpoint or third-party SDMX client needed to reach
    it anymore. Returns None if the comune has no data for this dataset.
    """
    rows = fetch_istat_dataflow('117_1035', f'A.{comune_code}....')
    by_year = {
        int(row['TIME_PERIOD']): row['OBS_VALUE'] for row in rows if row.get('DATA_TYPE') == 'BANK_BRN'
    }
    if not by_year:
        return None
    return _as_int(by_year[max(by_year)])


def fetch_income_series(comune_code: str, since_year: int = 2014) -> list[dict[str, float | int | None]]:
    """Yearly aggregate taxable income (IRPEF) for a comune, from dataflow
    30_1008 (MEF income-tax return data, republished by ISTAT), sorted
    oldest to newest.

    The source publishes the total taxable income and the number of tax
    filers as separate observations (DATA_TYPE `TAXABINCR`/`TAXABINCF`),
    not a pre-computed average - `average_taxable_income_eur` is derived
    here by dividing the two. A year with a redacted total (ISTAT
    suppresses values from very small comuni for privacy) comes back
    with `None` fields rather than a wrong or missing entry.
    """
    rows = fetch_istat_dataflow('30_1008', f'A.{comune_code}..', start_period=str(since_year))

    by_year: dict[int, dict[str, float]] = {}
    for row in rows:
        if row.get('AMOUNT_CLASS') != 'TOTAL':
            continue
        value = row.get('OBS_VALUE')
        if value in (None, ''):
            continue
        year = int(row['TIME_PERIOD'])
        data_type = row.get('DATA_TYPE')
        if data_type == 'TAXABINCR':
            by_year.setdefault(year, {})['total_taxable_income_eur'] = float(value)
        elif data_type == 'TAXABINCF':
            by_year.setdefault(year, {})['taxpayer_count'] = int(float(value))

    series = []
    for year, values in sorted(by_year.items()):
        total = values.get('total_taxable_income_eur')
        count = values.get('taxpayer_count')
        average = round(total / count, 2) if total is not None and count else None
        series.append(
            {
                'year': year,
                'total_taxable_income_eur': total,
                'taxpayer_count': count,
                'average_taxable_income_eur': average,
            }
        )
    return series


FVG_NUTS_AREAS = {
    'fvg': 'ITD4',
    'pordenone': 'ITD41',
    'udine': 'ITD42',
    'gorizia': 'ITD43',
    'trieste': 'ITD44',
}


def fetch_employment_rate(
    area_code: str,
    since_year: int = 2019,
    age: str = 'Y15-64',
) -> list[dict[str, float | int]]:
    """Yearly employment rate (%) for a NUTS region or province, from
    dataflow 150_915, sorted oldest to newest.

    Two things about this dataflow had to be established against the live
    endpoint, and both will bite anyone who assumes otherwise:

    - **There is no comune granularity.** Of the 133 `REF_AREA` values
      that carry data, the finest is NUTS3 (province); not one is a
      comune code. Unlike most of this module, which is per comune, this
      function cannot be.
    - **It uses pre-2013 NUTS codes.** Friuli Venezia Giulia is `ITD4`
      here, not the current `ITH4`, and its provinces are `ITD41`
      Pordenone, `ITD42` Udine, `ITD43` Gorizia, `ITD44` Trieste. A
      modern code fails loudly - the endpoint answers 404 - but says
      nothing about why, so `FVG_NUTS_AREAS` holds the five that matter
      rather than leaving callers to guess the vintage.

    `age` selects the age band - ISTAT publishes several (`Y15-64`,
    `Y15-24`, `Y15-29`, ...), and `Y15-64` is the conventional headline
    rate. The series returned is the total for both sexes, all education
    levels and all citizenships.
    """
    rows = fetch_istat_dataflow('150_915', f'A.{area_code}.....', start_period=str(since_year))
    series = [
        {'year': int(row['TIME_PERIOD']), 'employment_rate_pct': float(row['OBS_VALUE'])}
        for row in rows
        if row.get('DATA_TYPE') == 'EMP_R'
        and row.get('SEX') == '9'
        and row.get('AGE') == age
        and row.get('EDU_LEV_HIGHEST') == '99'
        and row.get('CITIZENSHIP') == 'TOTAL'
        and row.get('OBS_VALUE') not in (None, '')
    ]
    return sorted(series, key=lambda r: r['year'])


def fetch_tourism_capacity(
    area_code: str,
    since_year: int = 2019,
) -> list[dict[str, int | None]]:
    """Yearly accommodation capacity - establishments, bed places and
    rooms - for a comune, province or region, from dataflow 122_54,
    sorted oldest to newest.

    This half of 122_54 *is* published per comune (225 FVG comuni carry
    data), unlike `fetch_tourism_flows` below. Totals are taken across
    all accommodation types and the combined NACE aggregate `551_553`, so
    hotels and non-hotel accommodation are counted together rather than
    one star rating at a time - see `TOURISM_TOTAL_KEYS` for every
    dimension that has to be pinned to its total, and why.

    A year ISTAT suppressed comes back with `None` for that field rather
    than a zero.
    """
    rows = _tourism_rows(area_code, since_year)
    wanted = {'NUM_EST': 'establishments', 'BEDS': 'beds', 'BED_RMS': 'rooms'}
    by_year: dict[int, dict[str, int | None]] = {}
    for row in rows:
        field = wanted.get(row.get('DATA_TYPE', ''))
        if field is None or row.get('COUNTRY_RES_GUESTS') != 'NAP':
            continue
        by_year.setdefault(int(row['TIME_PERIOD']), {})[field] = _as_int(row.get('OBS_VALUE'))
    return [
        {'year': year, **{f: values.get(f) for f in wanted.values()}}
        for year, values in sorted(by_year.items())
    ]


def fetch_tourism_flows(
    area_code: str,
    since_year: int = 2019,
) -> list[dict[str, float | int | None]]:
    """Yearly tourist arrivals and overnight stays for a province or
    region, from dataflow 122_54, sorted oldest to newest.

    Province is the floor here. 122_54 carries comune-level rows, but
    only for the capacity indicators - at comune level the arrivals and
    nights indicators (`AR`, `NI`) are simply absent, so a comune code
    returns an empty series rather than an error. Use
    `fetch_tourism_capacity` for comune granularity, and
    `FVG_NUTS_AREAS` for the region and its four provinces.

    Guests of every residence are counted together
    (`COUNTRY_RES_GUESTS='WORLD'`; the dataflow also breaks the same
    figures down by about 80 countries of origin, which this does not
    expose), and every other breakdown is pinned to its total via
    `TOURISM_TOTAL_KEYS`. `average_stay_nights` is derived from nights over arrivals -
    ISTAT does define a `PM` indicator for it, but it was not published
    for any area checked here, so deriving it is more reliable than
    depending on it.
    """
    rows = _tourism_rows(area_code, since_year)
    by_year: dict[int, dict[str, int | None]] = {}
    for row in rows:
        data_type = row.get('DATA_TYPE')
        if data_type not in ('AR', 'NI') or row.get('COUNTRY_RES_GUESTS') != 'WORLD':
            continue
        field = 'arrivals' if data_type == 'AR' else 'nights'
        by_year.setdefault(int(row['TIME_PERIOD']), {})[field] = _as_int(row.get('OBS_VALUE'))

    series: list[dict[str, float | int | None]] = []
    for year, values in sorted(by_year.items()):
        arrivals, nights = values.get('arrivals'), values.get('nights')
        average = round(nights / arrivals, 2) if arrivals and nights is not None else None
        series.append(
            {
                'year': year,
                'arrivals': arrivals,
                'nights': nights,
                'average_stay_nights': average,
            }
        )
    return series


# 122_54 slices the same figure along several dimensions at once, and
# every one of them has to be pinned to its total or the series silently
# becomes a subtotal. For Friuli Venezia Giulia in 2023 the LOCALITY_TYPE
# dimension alone returns 11 rows for one year: ALL is 2,910,023 arrivals
# while TOUR_THRM (thermal localities) is 21,334, and taking the wrong one
# produces a plausible-looking number two orders of magnitude out.
TOURISM_TOTAL_KEYS = {
    'TYPE_ACCOMMODATION': 'ALL',
    'ECON_ACTIVITY_NACE_2007': '551_553',
    'LOCALITY_TYPE': 'ALL',
    'URBANIZ_DEGREE': 'ALL',
    'COASTAL_AREA': 'ALL',
    'SIZE_BY_NUMBER_ROOMS': 'TOT',
}


def _tourism_rows(area_code: str, since_year: int) -> list[dict[str, str]]:
    """The shared 122_54 query, narrowed to the fully aggregated rows. Its
    key takes 11 positions, and the two public functions above differ only
    in which indicators they keep.
    """
    rows = fetch_istat_dataflow(
        '122_54', f'A.{area_code}' + '.' * 9, start_period=str(since_year)
    )
    return [
        row
        for row in rows
        if all(row.get(dim) == total for dim, total in TOURISM_TOTAL_KEYS.items())
    ]


def fetch_consumer_price_index(
    area_code: str,
    since_year: int = 2019,
    coicop: str = '00',
) -> list[dict[str, str | float | None]]:
    """Monthly consumer price index (NIC, base 2015=100) for a province or
    region, from dataflow 167_744, oldest month first.

    Province is the floor: not one of the 132 `REF_AREA` values carrying
    data is a comune, so the comune-level index this was originally
    wanted for does not exist at ISTAT in any form. The Open Data FVG
    portal does publish one for Comune di Udine alone (resource
    `fz2e-423g`, in `CATALOG`) - that is the comune's own publication,
    not ISTAT's, which is why it exists where this does not.

    Like 150_915 this dataflow uses pre-2013 NUTS codes, so FVG is `ITD4`
    and its provinces `ITD41`-`ITD44`; use `FVG_NUTS_AREAS`.

    `coicop` selects the spending category - `'00'` is the all-items
    headline index, and the dataflow also carries the COICOP divisions
    (`'01'` food, `'011'` food excluding drinks, ...). Each entry carries
    the index level and the year-on-year change ISTAT publishes for the
    same month, which is the inflation rate for that area.
    """
    rows = fetch_istat_dataflow(
        '167_744', f'M.{area_code}...', start_period=f'{since_year}-01'
    )
    by_period: dict[str, dict[str, float | None]] = {}
    for row in rows:
        if row.get('E_COICOP_REV_ISTAT') != coicop or row.get('DATA_TYPE') != '39':
            continue
        # MEASURE 4 is the index itself, 7 the year-on-year percentage
        # change; 6 is month-on-month and is not exposed here.
        field = {'4': 'index', '7': 'yoy_change_pct'}.get(row.get('MEASURE', ''))
        if field is None:
            continue
        by_period.setdefault(row['TIME_PERIOD'], {})[field] = _as_float(row.get('OBS_VALUE'))
    return [
        {'period': period, 'index': values.get('index'),
         'yoy_change_pct': values.get('yoy_change_pct')}
        for period, values in sorted(by_period.items())
    ]


def _throttle() -> None:
    """Block just long enough to keep this process under ISTAT's
    5-requests-per-minute limit. Exceeding it risks a 1-2 day IP block,
    so this errs toward waiting rather than risking that.
    """
    now = time.monotonic()
    while _request_times and now - _request_times[0] > RATE_LIMIT_WINDOW_SECONDS:
        _request_times.popleft()
    if len(_request_times) >= RATE_LIMIT_REQUESTS:
        sleep_for = RATE_LIMIT_WINDOW_SECONDS - (now - _request_times[0])
        if sleep_for > 0:
            time.sleep(sleep_for)
    _request_times.append(time.monotonic())


def _correct_end_period(end_period: str) -> str:
    if end_period.isdigit() and len(end_period) == 4:
        return str(int(end_period) - 1)
    return end_period


def _latest_by_data_type(rows: list[dict[str, str]], sex: str | None = None) -> dict[str, str]:
    """For each DATA_TYPE, keep the value from the row with the latest
    TIME_PERIOD - a groupby().last() without depending on pandas.
    """
    filtered = rows if sex is None else [r for r in rows if r.get('SEX') == sex]
    latest: dict[str, tuple[str, str]] = {}
    for row in filtered:
        data_type, period = row.get('DATA_TYPE'), row.get('TIME_PERIOD')
        if data_type is None or period is None:
            continue
        if data_type not in latest or period > latest[data_type][0]:
            latest[data_type] = (period, row.get('OBS_VALUE', ''))
    return {data_type: value for data_type, (_, value) in latest.items()}


def _as_int(value: str | None) -> int | None:
    return int(float(value)) if value not in (None, '') else None


def _as_float(value: str | None) -> float | None:
    return float(value) if value not in (None, '') else None
