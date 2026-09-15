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
