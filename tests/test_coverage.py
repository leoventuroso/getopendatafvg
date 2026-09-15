from shapely.geometry import box, mapping

from getopendatafvg import build_coverage_union, line_coverage_pct

# Roughly 76m in longitude and 111m in latitude per 0.001 degree at this
# latitude (~46 N) - close enough for "clearly covered" / "clearly not"
# test assertions without needing exact metric geometry.
LINE = {'type': 'LineString', 'coordinates': [[12.600, 46.100], [12.601, 46.100]]}


def test_line_coverage_pct_is_high_when_coverage_fully_surrounds_the_line():
    coverage_geom = mapping(box(12.598, 46.098, 12.603, 46.102))
    coverage = build_coverage_union([coverage_geom])

    pct = line_coverage_pct(LINE, buffer_m=15, coverage=coverage)

    assert pct > 95


def test_line_coverage_pct_is_zero_when_coverage_is_far_away():
    coverage_geom = mapping(box(13.0, 47.0, 13.001, 47.001))
    coverage = build_coverage_union([coverage_geom])

    pct = line_coverage_pct(LINE, buffer_m=15, coverage=coverage)

    assert pct == 0


def test_line_coverage_pct_is_partial_for_partial_overlap():
    # Coverage only over the eastern half of the buffered corridor.
    coverage_geom = mapping(box(12.6005, 46.098, 12.603, 46.102))
    coverage = build_coverage_union([coverage_geom])

    pct = line_coverage_pct(LINE, buffer_m=15, coverage=coverage)

    assert 10 < pct < 90


def test_line_coverage_pct_is_zero_for_a_too_short_line():
    tiny_line = {'type': 'LineString', 'coordinates': [[12.600, 46.100], [12.6000001, 46.100]]}
    coverage = build_coverage_union([mapping(box(12.0, 46.0, 13.0, 47.0))])

    assert line_coverage_pct(tiny_line, buffer_m=15, coverage=coverage) == 0


def test_build_coverage_union_repairs_a_self_intersecting_polygon():
    bowtie = {'type': 'Polygon', 'coordinates': [[[12.0, 46.0], [12.01, 46.01], [12.01, 46.0], [12.0, 46.01], [12.0, 46.0]]]}
    coverage = build_coverage_union([bowtie])

    assert not coverage.is_empty
