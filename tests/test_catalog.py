from unittest.mock import patch

import pytest
from shapely.geometry import box

from getopendatafvg import (
    CATALOG,
    fetch_known_dataset,
    list_known_datasets,
    search_known_datasets,
)
from getopendatafvg.catalog import WFS_BASE_URL, KnownDataset


def test_catalog_entries_are_well_formed():
    assert len(CATALOG) > 0
    for entry in CATALOG:
        assert isinstance(entry, KnownDataset)
        assert entry.source in ('wfs', 'open_data_fvg')
        assert entry.identifier
        assert entry.name
        assert entry.category
        assert entry.description
        if entry.source == 'wfs':
            # The WFS client reads geometry off the layer itself, so a
            # geometry_column here would be recorded but never used.
            assert entry.geometry_column is None


def test_catalog_has_no_duplicate_identifiers_within_a_source():
    seen: set[tuple[str, str]] = set()
    for entry in CATALOG:
        key = (entry.source, entry.identifier)
        assert key not in seen, f'duplicate entry: {key}'
        seen.add(key)


def test_list_known_datasets_filters_by_source():
    results = list_known_datasets(source='open_data_fvg')
    assert len(results) > 0
    assert all(d.source == 'open_data_fvg' for d in results)


def test_list_known_datasets_filters_by_category():
    results = list_known_datasets(category='rischio naturale')
    assert len(results) > 0
    assert all(d.category == 'rischio naturale' for d in results)


def test_list_known_datasets_combines_both_filters():
    results = list_known_datasets(source='wfs', category='acqua')
    assert len(results) > 0
    assert all(d.source == 'wfs' and d.category == 'acqua' for d in results)


def test_list_known_datasets_with_no_filters_returns_everything():
    assert list_known_datasets() == list(CATALOG)


def test_search_known_datasets_matches_the_name_case_insensitively():
    results = search_known_datasets('PISTE CICLABILI')
    assert any(d.identifier == '7eat-pecq' for d in results)


def test_search_known_datasets_matches_the_description():
    results = search_known_datasets('natura 2000')
    assert {d.identifier for d in results} >= {'SITI_PROT:SIC', 'SITI_PROT:ZPS'}


def test_search_known_datasets_returns_empty_for_no_match():
    assert search_known_datasets('nonexistent xyz query') == []


def wfs_entry() -> KnownDataset:
    return KnownDataset('Incendi', 'wfs', 'ZONE_RISC:V_INCENDI_CT', 'rischio naturale', 'test')


def socrata_entry() -> KnownDataset:
    return KnownDataset('Indici prezzi', 'open_data_fvg', 'fz2e-423g', 'economia', 'test')


def socrata_entry_with_geometry() -> KnownDataset:
    return KnownDataset(
        'Piste ciclabili',
        'open_data_fvg',
        '7eat-pecq',
        'trasporti',
        'test',
        geometry_column='the_geom',
    )


def test_fetch_known_dataset_routes_a_wfs_entry_without_boundary_to_fetch_wfs_features():
    with patch('getopendatafvg.catalog.fetch_wfs_features', return_value=[]) as fetch:
        fetch_known_dataset(wfs_entry())

    assert fetch.call_args.args == (WFS_BASE_URL, 'ZONE_RISC:V_INCENDI_CT')


def test_fetch_known_dataset_routes_a_wfs_entry_with_boundary_to_the_clipping_variant():
    boundary = box(12.5648, 46.0704, 12.7251, 46.1911)
    with patch('getopendatafvg.catalog.fetch_and_clip_wfs_features', return_value=[]) as fetch:
        fetch_known_dataset(wfs_entry(), boundary=boundary)

    assert fetch.call_args.args == (WFS_BASE_URL, 'ZONE_RISC:V_INCENDI_CT', boundary)


def test_fetch_known_dataset_routes_an_open_data_fvg_entry_to_fetch_open_data_fvg():
    with patch('getopendatafvg.catalog.fetch_open_data_fvg', return_value=[]) as fetch:
        fetch_known_dataset(socrata_entry())

    assert fetch.call_args.args == ('fz2e-423g',)


def test_fetch_known_dataset_passes_extra_kwargs_through_to_the_client():
    with patch('getopendatafvg.catalog.fetch_open_data_fvg', return_value=[]) as fetch:
        fetch_known_dataset(socrata_entry(), limit=5, where="anno='2025'")

    assert fetch.call_args.kwargs == {'limit': 5, 'where': "anno='2025'"}


def test_fetch_known_dataset_returns_whatever_the_underlying_client_returned():
    rows = [{'id': 1}, {'id': 2}]
    with patch('getopendatafvg.catalog.fetch_open_data_fvg', return_value=rows):
        assert fetch_known_dataset(socrata_entry()) == rows


def test_fetch_known_dataset_rejects_a_boundary_on_a_socrata_entry_without_a_geometry_column():
    with pytest.raises(ValueError, match='no geometry column recorded'):
        fetch_known_dataset(socrata_entry(), boundary=box(0, 0, 1, 1))


def test_fetch_known_dataset_boundary_filters_a_socrata_entry_that_has_a_geometry_column():
    boundary = box(13.18, 46.02, 13.30, 46.12)
    with patch('getopendatafvg.catalog.fetch_open_data_fvg', return_value=[]) as fetch:
        fetch_known_dataset(socrata_entry_with_geometry(), boundary=boundary)

    # within_box takes the corners as north, west, south, east.
    assert fetch.call_args.args == ('7eat-pecq',)
    assert fetch.call_args.kwargs == {'where': 'within_box(the_geom, 46.12, 13.18, 46.02, 13.3)'}


def test_fetch_known_dataset_ands_a_caller_where_with_the_generated_boundary_clause():
    with patch('getopendatafvg.catalog.fetch_open_data_fvg', return_value=[]) as fetch:
        fetch_known_dataset(
            socrata_entry_with_geometry(),
            boundary=box(13.18, 46.02, 13.30, 46.12),
            where="tipo='ciclabile'",
        )

    where = fetch.call_args.kwargs['where']
    assert where == "(tipo='ciclabile') AND within_box(the_geom, 46.12, 13.18, 46.02, 13.3)"


def test_fetch_known_dataset_leaves_a_socrata_entry_unfiltered_without_a_boundary():
    with patch('getopendatafvg.catalog.fetch_open_data_fvg', return_value=[]) as fetch:
        fetch_known_dataset(socrata_entry_with_geometry())

    assert 'where' not in fetch.call_args.kwargs


def test_fetch_known_dataset_rejects_an_unknown_source():
    entry = KnownDataset('Bogus', 'ftp', 'x', 'test', 'test')
    with pytest.raises(ValueError, match='unknown source'):
        fetch_known_dataset(entry)


def test_every_catalog_entry_is_dispatchable():
    # The dispatcher only knows two sources; test_catalog_entries_are_well_formed
    # asserts the same pair, so this fails loudly if a third source is ever
    # added to the catalog without teaching fetch_known_dataset about it.
    for entry in CATALOG:
        with (
            patch('getopendatafvg.catalog.fetch_wfs_features', return_value=[]),
            patch('getopendatafvg.catalog.fetch_open_data_fvg', return_value=[]),
        ):
            assert fetch_known_dataset(entry) == []
