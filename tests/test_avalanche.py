from unittest.mock import patch

from shapely.geometry import box, mapping

from getopendatafvg import fetch_avalanche_sites
from getopendatafvg.avalanche import (
    DEFAULT_COUNT,
    PHOTO_INTERPRETED_LAYER,
    SURVEYED_LAYER,
    _as_int,
)


def feature(site_id, comune='030054 MALBORGHETTO VALBRUNA', toponym='MARCILLA',
            release=1900, runout=975, aspect='N', poly=None):
    return {
        'properties': {
            'ID_SITO': site_id,
            'COMUNE': comune,
            'TOPONIMO': toponym,
            'TIPO_SITO': 'valanga',
            'QUOTA_DISTACCO_MAX': release,
            'QUOTA_ARRESTO_MIN': runout,
            'ESPOSIZIONE_SITO': aspect,
        },
        'geometry': mapping(poly or box(13.4, 46.5, 13.5, 46.6)),
    }


def by_layer(surveyed, photo):
    """fetch_wfs_features stub that answers per type_name."""
    def fake(url, type_name, **kwargs):
        return surveyed if type_name == SURVEYED_LAYER else photo
    return fake


def test_fetch_avalanche_sites_merges_both_layers_and_flags_the_survey_method():
    # The whole point: neither layer tells a caller the other exists.
    with patch('getopendatafvg.avalanche.fetch_wfs_features',
               side_effect=by_layer([feature(1)], [feature(2)])):
        sites = fetch_avalanche_sites()

    assert {s.site_id for s in sites} == {1, 2}
    assert {s.site_id: s.photo_interpreted for s in sites} == {1: False, 2: True}


def test_fetch_avalanche_sites_groups_a_site_stored_as_two_polygons():
    # ID_SITO 1060 and 3668 really are two rows each in the surveyed
    # layer. Keeping one row would shrink the site's footprint.
    rows = [
        feature(1060, poly=box(13.4, 46.5, 13.45, 46.55)),
        feature(1060, poly=box(13.45, 46.55, 13.5, 46.6)),
    ]
    with patch('getopendatafvg.avalanche.fetch_wfs_features', side_effect=by_layer(rows, [])):
        sites = fetch_avalanche_sites()

    assert len(sites) == 1
    assert len(sites[0].geometries) == 2


def test_fetch_avalanche_sites_can_fetch_one_survey_method_only():
    with patch('getopendatafvg.avalanche.fetch_wfs_features',
               side_effect=by_layer([feature(1)], [feature(2)])) as fetch:
        surveyed = fetch_avalanche_sites(photo_interpreted=False)

    assert [s.site_id for s in surveyed] == [1]
    # and it must not pay for the layer it was told to skip
    assert [c.args[1] for c in fetch.call_args_list] == [SURVEYED_LAYER]


def test_fetch_avalanche_sites_asks_for_more_than_the_thousand_feature_default():
    # Both layers are several thousand features; the WFS client's own
    # default of 1000 would truncate the catasto to a quarter without
    # any error.
    assert DEFAULT_COUNT > 4000
    with patch('getopendatafvg.avalanche.fetch_wfs_features',
               side_effect=by_layer([], [])) as fetch:
        fetch_avalanche_sites()

    for call in fetch.call_args_list:
        assert call.kwargs['count'] == DEFAULT_COUNT


def test_fetch_avalanche_sites_clips_when_given_a_boundary():
    boundary = box(13.40, 46.45, 13.70, 46.60)
    pairs = [(feature(7)['properties'], box(13.45, 46.5, 13.5, 46.55))]
    with patch('getopendatafvg.avalanche.fetch_and_clip_wfs_features',
               return_value=pairs) as clip, \
         patch('getopendatafvg.avalanche.fetch_wfs_features') as plain:
        sites = fetch_avalanche_sites(boundary=boundary)

    assert len(sites) == 2  # one per layer, same stub
    assert clip.call_args.args[2] is boundary
    plain.assert_not_called()


def test_fetch_avalanche_sites_sorts_by_comune_then_toponym():
    rows = [
        feature(1, comune='030073 PAULARO', toponym='MONTE SERNIO'),
        feature(2, comune='030033 DOGNA', toponym='ZZZ'),
        feature(3, comune='030033 DOGNA', toponym='AAA'),
    ]
    with patch('getopendatafvg.avalanche.fetch_wfs_features', side_effect=by_layer(rows, [])):
        sites = fetch_avalanche_sites()

    assert [s.toponym for s in sites] == ['AAA', 'ZZZ', 'MONTE SERNIO']


def test_fetch_avalanche_sites_skips_a_feature_with_no_geometry():
    rows = [feature(1), {'properties': {'ID_SITO': 2}, 'geometry': None}]
    with patch('getopendatafvg.avalanche.fetch_wfs_features', side_effect=by_layer(rows, [])):
        assert [s.site_id for s in fetch_avalanche_sites()] == [1]


def test_as_int_tolerates_a_missing_elevation():
    # Elevations come back as numbers, but a missing one is sometimes an
    # empty string, which int() raises on.
    assert _as_int('') is None
    assert _as_int(None) is None
    assert _as_int('1900') == 1900
    assert _as_int(1900.0) == 1900
    assert _as_int('non un numero') is None


def test_layer_names_are_the_two_real_catasto_valanghe_layers():
    assert SURVEYED_LAYER == 'ZONE_RISC:CV_VALANGHE_RILEVATE'
    assert PHOTO_INTERPRETED_LAYER == 'ZONE_RISC:CV_VALANGHE_FOTOINT'
