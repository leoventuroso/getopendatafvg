"""Fetch a Wikipedia page's plain-text summary - free, no API key.

Returns the raw extract only; classifying what it means (touristic,
notable, historic, ...) is a decision for the caller, not this library.
"""

from __future__ import annotations

from urllib.parse import quote

import requests

HEADERS = {'User-Agent': 'getopendatafvg/0.1', 'Accept': 'application/json'}


def fetch_wikipedia_summary(title: str, lang: str = 'it', timeout: float = 8.0) -> str | None:
    """Best-effort plain-text summary for a Wikipedia page: tries `title`
    verbatim first, and if that page doesn't exist or is a disambiguation
    page (no useful summary of its own), retries once against Wikipedia's
    title-search API and fetches the top match instead. Returns None if
    no matching page is found either way.
    """
    extract, page_type = _fetch_summary(title, lang, timeout)
    if extract and page_type != 'disambiguation':
        return extract

    best_title = _search_best_title(title, lang, timeout)
    if best_title is None:
        return None if page_type == 'disambiguation' else extract

    extract, _ = _fetch_summary(best_title, lang, timeout)
    return extract


def _fetch_summary(title: str, lang: str, timeout: float) -> tuple[str | None, str | None]:
    url = f'https://{lang}.wikipedia.org/api/rest_v1/page/summary/{quote(title.strip())}'
    resp = requests.get(url, headers=HEADERS, timeout=timeout)
    if resp.status_code == 404:
        return None, None
    resp.raise_for_status()
    data = resp.json()
    return data.get('extract'), data.get('type')


def _search_best_title(query: str, lang: str, timeout: float) -> str | None:
    url = f'https://{lang}.wikipedia.org/w/api.php'
    params = {'action': 'opensearch', 'search': query.strip(), 'limit': 1, 'namespace': 0, 'format': 'json'}
    resp = requests.get(url, headers=HEADERS, params=params, timeout=timeout)
    resp.raise_for_status()
    data = resp.json()
    if isinstance(data, list) and len(data) >= 2 and data[1]:
        return data[1][0]
    return None
