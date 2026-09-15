"""Fetch historical daily weather for a point via Open-Meteo's archive API
(https://open-meteo.com/) - free, no API key, global coverage back to 1940.
"""

from __future__ import annotations

from dataclasses import dataclass

import requests

ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive'


@dataclass(frozen=True)
class DailyWeather:
    """Daily weather series for a point, aligned by index (`dates[i]`
    corresponds to `temperature_mean_c[i]` and `precipitation_mm[i]`). A
    day with no observation yet (e.g. too recent) comes back as `None`
    rather than being dropped, so the series stays aligned.
    """

    dates: list[str]
    temperature_mean_c: list[float | None]
    precipitation_mm: list[float | None]


def fetch_historical_weather(
    latitude: float,
    longitude: float,
    start_date: str,
    end_date: str,
    timezone: str = 'Europe/Rome',
    timeout: int = 30,
) -> DailyWeather:
    """Fetch daily mean temperature (°C) and total precipitation (mm) for
    a point between `start_date` and `end_date` (both "YYYY-MM-DD").
    `timezone` determines which local day each daily aggregate belongs to.
    """
    params = {
        'latitude': latitude,
        'longitude': longitude,
        'start_date': start_date,
        'end_date': end_date,
        'daily': 'temperature_2m_mean,precipitation_sum',
        'timezone': timezone,
    }
    resp = requests.get(ARCHIVE_URL, params=params, timeout=timeout)
    resp.raise_for_status()
    daily = resp.json().get('daily', {})
    return DailyWeather(
        dates=daily.get('time', []),
        temperature_mean_c=daily.get('temperature_2m_mean', []),
        precipitation_mm=daily.get('precipitation_sum', []),
    )
