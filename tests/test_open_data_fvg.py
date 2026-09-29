from unittest.mock import MagicMock, patch

from shapely.geometry import box

from getopendatafvg import fetch_open_data_fvg, search_open_data_fvg, within_box_clause


def make_response(rows: list) -> MagicMock:
    resp = MagicMock()
    resp.json.return_value = rows
    resp.raise_for_status.return_value = None
    return resp


def test_fetch_open_data_fvg_hits_the_resource_endpoint_with_limit_and_offset():
    with patch('getopendatafvg.open_data_fvg.requests.get', return_value=make_response([{'a': 1}])) as get:
        result = fetch_open_data_fvg('7eat-pecq')

    assert result == [{'a': 1}]
    assert get.call_args.args[0] == 'https://www.dati.friuliveneziagiulia.it/resource/7eat-pecq.json'
    assert get.call_args.kwargs['params'] == {'$limit': '1000', '$offset': '0'}


def test_fetch_open_data_fvg_passes_through_soql_clauses_when_given():
    with patch('getopendatafvg.open_data_fvg.requests.get', return_value=make_response([])) as get:
        fetch_open_data_fvg('b3xh-hm8p', where="comune='UDINE'", select='comune,indirizzo', order='comune')

    params = get.call_args.kwargs['params']
    assert params['$where'] == "comune='UDINE'"
    assert params['$select'] == 'comune,indirizzo'
    assert params['$order'] == 'comune'


def test_within_box_clause_formats_the_bbox_as_nw_se_corners():
    boundary = box(13.3, 46.0, 13.5, 46.2)  # minx, miny, maxx, maxy
    assert within_box_clause('the_geom', boundary) == 'within_box(the_geom, 46.2, 13.3, 46.0, 13.5)'


def catalog_response(resources: list) -> MagicMock:
    resp = MagicMock()
    resp.json.return_value = {'results': [{'resource': r} for r in resources]}
    resp.raise_for_status.return_value = None
    return resp


def test_search_open_data_fvg_scopes_the_query_to_the_fvg_domain():
    with patch('getopendatafvg.open_data_fvg.requests.get',
               return_value=catalog_response([])) as get:
        search_open_data_fvg('Rendiconto Entrate Tolmezzo')

    assert get.call_args.args[0] == 'https://www.dati.friuliveneziagiulia.it/api/catalog/v1'
    params = get.call_args.kwargs['params']
    # Without both of these the discovery API answers for the whole
    # Socrata federation, not this portal.
    assert params['domains'] == 'www.dati.friuliveneziagiulia.it'
    assert params['search_context'] == 'www.dati.friuliveneziagiulia.it'
    assert params['q'] == 'Rendiconto Entrate Tolmezzo'


def test_search_open_data_fvg_never_narrows_to_only_datasets():
    # 551 of the portal's ~850 assets are type `filter`, several of them
    # catalog entries. `only=dataset` would hide them and make a present
    # dataset look missing, which is exactly how the budget assets got
    # written off as nonexistent once already.
    with patch('getopendatafvg.open_data_fvg.requests.get',
               return_value=catalog_response([])) as get:
        search_open_data_fvg('Rendiconto')

    assert 'only' not in get.call_args.kwargs['params']


def test_search_open_data_fvg_returns_filters_and_datasets_alike():
    resources = [
        {'id': 'ppcp-v6ci', 'name': 'Rendiconto Entrate - Comune di Tolmezzo',
         'type': 'filter', 'description': 'entrate'},
        {'id': 'e6n3-grc3', 'name': 'Rendiconti parte entrata 2010-2013',
         'type': 'dataset', 'description': None},
    ]
    with patch('getopendatafvg.open_data_fvg.requests.get',
               return_value=catalog_response(resources)):
        results = search_open_data_fvg('Rendiconto')

    assert [r.resource_id for r in results] == ['ppcp-v6ci', 'e6n3-grc3']
    assert [r.asset_type for r in results] == ['filter', 'dataset']
    # A null description must come back as '', not None, so callers can
    # treat every field as a string.
    assert results[1].description == ''


def test_search_open_data_fvg_skips_a_hit_with_no_resource_id():
    # Nothing can be fetched without one, so it is noise rather than a result.
    with patch('getopendatafvg.open_data_fvg.requests.get',
               return_value=catalog_response([{'name': 'senza id', 'type': 'chart'}])):
        assert search_open_data_fvg('qualsiasi') == []
