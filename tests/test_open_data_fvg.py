from unittest.mock import MagicMock, patch

from shapely.geometry import box

from getopendatafvg import fetch_open_data_fvg, within_box_clause


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
