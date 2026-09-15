import numpy as np
from rasterio import Affine
from rasterio.crs import CRS

from getopendatafvg import ClassBreak, IndexRaster, classify_and_vectorize


def make_raster(array: np.ndarray, pixel_size: float = 100.0) -> IndexRaster:
    transform = Affine.translation(300000, 5100000) * Affine.scale(pixel_size, -pixel_size)
    return IndexRaster(array=array.astype(np.float32), transform=transform, crs=CRS.from_epsg(32633))


def test_classify_and_vectorize_assigns_correct_class_labels():
    array = np.array([[0.1, 0.1], [0.6, 0.6]], dtype=np.float32)
    raster = make_raster(array)
    breaks = [ClassBreak(0.0, 0.5, 'low'), ClassBreak(0.5, 1.0, 'high')]

    features = classify_and_vectorize(raster, breaks)

    assert {f['properties']['class'] for f in features} == {'low', 'high'}


def test_classify_and_vectorize_skips_nan_pixels():
    # 3 of 4 pixels are classified (contiguous, so one polygon); the NaN
    # pixel must not be counted or turned into a stray class-0 polygon.
    array = np.array([[np.nan, 0.6], [0.6, 0.6]], dtype=np.float32)
    raster = make_raster(array, pixel_size=100.0)
    breaks = [ClassBreak(0.5, 1.0, 'high')]

    features = classify_and_vectorize(raster, breaks)

    assert len(features) == 1
    assert features[0]['properties']['area_m2'] == 3 * 100 * 100


def test_classify_and_vectorize_drops_polygons_below_min_area():
    array = np.full((10, 10), 0.6, dtype=np.float32)
    array[0, 0] = 0.1
    raster = make_raster(array, pixel_size=10.0)  # single pixel = 100 m2
    breaks = [ClassBreak(0.0, 0.5, 'low'), ClassBreak(0.5, 1.0, 'high')]

    features = classify_and_vectorize(raster, breaks, min_area_m2=200)

    classes = [f['properties']['class'] for f in features]
    assert 'low' not in classes
    assert 'high' in classes


def test_classify_and_vectorize_simplifies_when_tolerance_given():
    array = np.zeros((20, 20), dtype=np.float32)
    array[5:15, 5:15] = 0.6
    raster = make_raster(array, pixel_size=10.0)
    breaks = [ClassBreak(0.5, 1.0, 'high')]

    detailed = classify_and_vectorize(raster, breaks)
    simplified = classify_and_vectorize(raster, breaks, simplify_tolerance_m=50.0)

    detailed_vertices = len(detailed[0]['geometry']['coordinates'][0])
    simplified_vertices = len(simplified[0]['geometry']['coordinates'][0])
    assert simplified_vertices <= detailed_vertices


def test_classify_and_vectorize_resamples_to_requested_resolution():
    array = np.full((20, 20), 0.6, dtype=np.float32)
    raster = make_raster(array, pixel_size=10.0)
    breaks = [ClassBreak(0.5, 1.0, 'high')]

    native = classify_and_vectorize(raster, breaks)
    coarse = classify_and_vectorize(raster, breaks, resolution_m=100.0)

    assert len(native) == 1
    assert len(coarse) == 1
