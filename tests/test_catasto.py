from unittest.mock import MagicMock, patch

from getopendatafvg import fetch_cadastral_parcels, region_parquet_name


def test_region_parquet_name_matches_ignoring_case_and_punctuation():
    assert region_parquet_name('Friuli-Venezia Giulia') == '06_Friuli-VeneziaGiulia'
    assert region_parquet_name('friuli venezia giulia') == '06_Friuli-VeneziaGiulia'
    assert region_parquet_name('FRIULI VENEZIA GIULIA') == '06_Friuli-VeneziaGiulia'


def test_region_parquet_name_returns_none_for_an_unknown_region():
    assert region_parquet_name('Nowhereland') is None


def test_fetch_cadastral_parcels_returns_empty_list_for_unmatched_region():
    assert fetch_cadastral_parcels('F596', 'Nowhereland') == []


def test_fetch_cadastral_parcels_converts_coordinates_and_sorts_by_foglio_then_particella():
    fake_con = MagicMock()
    fake_con.execute.return_value.fetchall.return_value = [
        ('007', '12', 12_650_000, 46_160_000),
        ('003', '5', 12_650_000, 46_160_000),
        ('003', '1', 12_650_000, 46_160_000),
    ]

    with patch('getopendatafvg.catasto.duckdb.connect', return_value=fake_con):
        features = fetch_cadastral_parcels('F596', 'Friuli-Venezia Giulia')

    assert [f['properties']['foglio'] for f in features] == ['3', '3', '7']
    assert [f['properties']['particella'] for f in features] == ['1', '5', '12']
    assert features[0]['geometry'] == {'type': 'Point', 'coordinates': [12.65, 46.16]}


def test_fetch_cadastral_parcels_queries_the_right_region_file_and_comune():
    fake_con = MagicMock()
    fake_con.execute.return_value.fetchall.return_value = []

    with patch('getopendatafvg.catasto.duckdb.connect', return_value=fake_con):
        fetch_cadastral_parcels('F596', 'Friuli-Venezia Giulia')

    query_call = fake_con.execute.call_args_list[-1]
    url, comune_code = query_call.args[1]
    assert '06_Friuli-VeneziaGiulia.parquet' in url
    assert comune_code == 'F596'
