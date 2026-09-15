from unittest.mock import MagicMock, patch

from getopendatafvg import fetch_wikipedia_summary


def make_response(status_code: int = 200, json_data: dict | None = None) -> MagicMock:
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = json_data or {}
    resp.raise_for_status.return_value = None
    return resp


def test_fetch_wikipedia_summary_returns_the_extract_on_a_direct_hit():
    summary_resp = make_response(json_data={'extract': 'A small comune in Friuli.', 'type': 'standard'})
    with patch('getopendatafvg.wikipedia.requests.get', return_value=summary_resp):
        result = fetch_wikipedia_summary('Montereale Valcellina')

    assert result == 'A small comune in Friuli.'


def test_fetch_wikipedia_summary_falls_back_to_search_when_the_title_is_missing():
    missing = make_response(status_code=404)
    search_hit = make_response(json_data=['query', ['Best Title'], [], []])
    found = make_response(json_data={'extract': 'Found via search.', 'type': 'standard'})
    with patch('getopendatafvg.wikipedia.requests.get', side_effect=[missing, search_hit, found]):
        result = fetch_wikipedia_summary('a typo title')

    assert result == 'Found via search.'


def test_fetch_wikipedia_summary_resolves_a_disambiguation_page_via_search():
    disambiguation = make_response(json_data={'extract': 'Several places share this name.', 'type': 'disambiguation'})
    search_hit = make_response(json_data=['query', ['Specific Place'], [], []])
    found = make_response(json_data={'extract': 'The specific one.', 'type': 'standard'})
    with patch('getopendatafvg.wikipedia.requests.get', side_effect=[disambiguation, search_hit, found]):
        result = fetch_wikipedia_summary('Ambiguous Name')

    assert result == 'The specific one.'


def test_fetch_wikipedia_summary_returns_none_when_nothing_matches():
    missing = make_response(status_code=404)
    no_search_hit = make_response(json_data=['query', [], [], []])
    with patch('getopendatafvg.wikipedia.requests.get', side_effect=[missing, no_search_hit]):
        result = fetch_wikipedia_summary('Not A Real Place At All Xyz')

    assert result is None
