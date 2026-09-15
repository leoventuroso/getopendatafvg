from unittest.mock import MagicMock, patch

from shapely.geometry import Polygon, box, mapping

from getopendatafvg import clip_to_boundary, fetch_and_clip_wfs_features, fetch_wfs_features


def make_response(features: list[dict]) -> MagicMock:
    resp = MagicMock()
    resp.json.return_value = {'type': 'FeatureCollection', 'features': features}
    resp.raise_for_status.return_value = None
    return resp


def test_fetch_wfs_features_uses_bbox_from_boundary_when_no_cql_given():
    boundary = box(12.5648, 46.0704, 12.7251, 46.1911)
    with patch('getopendatafvg.wfs.requests.get', return_value=make_response([])) as get:
        fetch_wfs_features('https://example.com/wfs', 'ns:layer', boundary=boundary)

    params = get.call_args.kwargs['params']
    assert params['bbox'] == '12.5648,46.0704,12.7251,46.1911,EPSG:4326'
    assert 'CQL_FILTER' not in params


def test_fetch_wfs_features_uses_cql_filter_when_given_instead_of_bbox():
    boundary = box(12.5648, 46.0704, 12.7251, 46.1911)
    with patch('getopendatafvg.wfs.requests.get', return_value=make_response([])) as get:
        fetch_wfs_features(
            'https://example.com/wfs', 'ns:layer', boundary=boundary, cql_filter="COMUNE='Test'"
        )

    params = get.call_args.kwargs['params']
    assert params['CQL_FILTER'] == "COMUNE='Test'"
    assert 'bbox' not in params


def test_clip_to_boundary_returns_none_when_geometry_is_outside():
    boundary = box(0, 0, 1, 1)
    far_away = mapping(box(10, 10, 11, 11))
    assert clip_to_boundary(far_away, boundary) is None


def test_clip_to_boundary_clips_a_partially_overlapping_geometry():
    boundary = box(0, 0, 2, 2)
    half_outside = mapping(box(1, 1, 3, 3))
    clipped = clip_to_boundary(half_outside, boundary)
    assert clipped is not None
    assert clipped.bounds == (1, 1, 2, 2)


def test_clip_to_boundary_repairs_self_intersecting_geometry():
    # A bowtie polygon - vertices cross over themselves, which shapely
    # treats as invalid unless repaired (force_2d + buffer(0), same fix
    # used on the municipal boundary itself).
    bowtie = {
        'type': 'Polygon',
        'coordinates': [[[0, 0], [2, 2], [2, 0], [0, 2], [0, 0]]],
    }
    boundary = box(0, 0, 2, 2)
    clipped = clip_to_boundary(bowtie, boundary)
    assert clipped is not None
    assert not clipped.is_empty


def test_fetch_and_clip_drops_features_whose_bbox_overlaps_but_geometry_does_not():
    # This is exactly what happened querying ISPRA's landslide WFS live: a
    # bbox-filtered fetch returned 26 candidate polygons for the comune
    # bounding box, and only 12 of them actually intersected the real
    # (non-rectangular) boundary once clipped precisely. A rectangular
    # boundary can't reproduce that (its bbox *is* its shape), so this
    # uses a triangle: its bbox is (0,0,2,2), but the far corner near
    # (2, 2) is outside the actual triangle.
    boundary = Polygon([(0, 0), (2, 0), (0, 2)])
    inside = {'type': 'Polygon', 'coordinates': [[[0.2, 0.2], [0.5, 0.2], [0.5, 0.5], [0.2, 0.5], [0.2, 0.2]]]}
    only_bbox_overlaps = {
        'type': 'Polygon',
        'coordinates': [[[1.8, 1.8], [1.95, 1.8], [1.95, 1.95], [1.8, 1.95], [1.8, 1.8]]],
    }
    features = [
        {'properties': {'name': 'inside'}, 'geometry': inside},
        {'properties': {'name': 'outside'}, 'geometry': only_bbox_overlaps},
    ]

    with patch('getopendatafvg.wfs.requests.get', return_value=make_response(features)):
        result = fetch_and_clip_wfs_features('https://example.com/wfs', 'ns:layer', boundary)

    assert len(result) == 1
    assert result[0][0]['name'] == 'inside'
