from getopendatafvg import CATALOG, list_known_datasets, search_known_datasets
from getopendatafvg.catalog import KnownDataset


def test_catalog_entries_are_well_formed():
    assert len(CATALOG) > 0
    for entry in CATALOG:
        assert isinstance(entry, KnownDataset)
        assert entry.source in ('wfs', 'open_data_fvg')
        assert entry.identifier
        assert entry.name
        assert entry.category
        assert entry.description


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
