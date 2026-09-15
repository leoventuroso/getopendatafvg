import numpy as np
import pytest
import rasterio
from rasterio.transform import from_bounds
from shapely.geometry import LineString

from getopendatafvg import DemSampler, compute_line_grade, compute_line_slope, slope_class_for_value

BOUNDS = (12.0, 46.0, 12.01, 46.01)


def write_ramp_dem(path, width=20, height=20, nodata=-9999.0):
    """Elevation rising left to right - not a known metric slope (the
    DEM's own CRS is EPSG:4326 here, so pixel size isn't in metres), just
    enough to check sample_line reads increasing values along the ramp.
    """
    array = np.tile(np.arange(width, dtype=np.float32) * 10.0, (height, 1))
    transform = from_bounds(*BOUNDS, width, height)
    with rasterio.open(
        path, 'w', driver='GTiff', height=height, width=width, count=1,
        dtype='float32', crs='EPSG:4326', transform=transform, nodata=nodata,
    ) as dst:
        dst.write(array, 1)


def test_sample_line_reads_increasing_elevations_along_a_ramp(tmp_path):
    dem_path = tmp_path / 'ramp.tif'
    write_ramp_dem(dem_path)
    line = LineString([(BOUNDS[0] + 0.0005, 46.005), (BOUNDS[2] - 0.0005, 46.005)])

    with DemSampler.open(dem_path) as dem:
        distances, elevations = dem.sample_line(line, sample_step_m=100.0)

    assert len(distances) >= 2
    assert np.all(np.isfinite(elevations))
    assert elevations[-1] > elevations[0]


def test_sample_line_marks_nodata_as_nan(tmp_path):
    dem_path = tmp_path / 'nodata.tif'
    array = np.full((5, 5), -9999.0, dtype=np.float32)
    transform = from_bounds(*BOUNDS, 5, 5)
    with rasterio.open(
        dem_path, 'w', driver='GTiff', height=5, width=5, count=1,
        dtype='float32', crs='EPSG:4326', transform=transform, nodata=-9999.0,
    ) as dst:
        dst.write(array, 1)

    line = LineString([(BOUNDS[0] + 0.0005, 46.005), (BOUNDS[2] - 0.0005, 46.005)])
    with DemSampler.open(dem_path) as dem:
        _, elevations = dem.sample_line(line, sample_step_m=100.0)

    assert np.all(np.isnan(elevations))


def test_sample_line_returns_empty_arrays_for_a_zero_length_line(tmp_path):
    dem_path = tmp_path / 'ramp.tif'
    write_ramp_dem(dem_path)
    point_line = LineString([(12.005, 46.005), (12.005, 46.005)])

    with DemSampler.open(dem_path) as dem:
        distances, elevations = dem.sample_line(point_line)

    assert len(distances) == 0
    assert len(elevations) == 0


def test_compute_line_slope_recovers_a_known_gradient():
    distances = np.linspace(0, 100, 11)
    elevations = distances * 0.1  # exact 10% grade
    assert compute_line_slope(distances, elevations) == pytest.approx(10.0)


def test_compute_line_slope_is_unsigned():
    distances = np.linspace(0, 100, 11)
    elevations = -distances * 0.1  # descending
    assert compute_line_slope(distances, elevations) == pytest.approx(10.0)


def test_compute_line_slope_returns_zero_with_too_few_valid_samples():
    assert compute_line_slope(np.array([0.0]), np.array([5.0])) == 0.0
    assert compute_line_slope(np.array([0.0, 10.0]), np.array([np.nan, 5.0])) == 0.0


def test_compute_line_grade_uses_only_first_and_last_valid_sample():
    # Climbs then descends back most of the way - slope would be nonzero
    # for the up-and-down wiggle, but net grade only looks at endpoints.
    distances = np.array([0.0, 25.0, 50.0, 75.0, 100.0])
    elevations = np.array([0.0, 20.0, 40.0, 20.0, 10.0])
    assert compute_line_grade(distances, elevations) == pytest.approx(10.0)


def test_compute_line_grade_is_signed():
    distances = np.array([0.0, 100.0])
    elevations = np.array([50.0, 0.0])
    assert compute_line_grade(distances, elevations) == pytest.approx(-50.0)


def test_slope_class_for_value_picks_the_matching_bucket():
    assert slope_class_for_value(2.0) == '0-3: flat'
    assert slope_class_for_value(9.9) == '8-10: hard'
    assert slope_class_for_value(50.0) == '>20: impossible'
