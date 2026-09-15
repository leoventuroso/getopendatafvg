import numpy as np
import rasterio
from rasterio.transform import from_bounds
from shapely.geometry import box

from getopendatafvg import compute_lst, compute_nbr, compute_ndvi

BOUNDS = (12.0, 46.0, 12.01, 46.01)


def write_tif(path, array):
    height, width = array.shape
    transform = from_bounds(*BOUNDS, width, height)
    with rasterio.open(
        path,
        'w',
        driver='GTiff',
        height=height,
        width=width,
        count=1,
        dtype=array.dtype,
        crs='EPSG:4326',
        transform=transform,
        nodata=0,
    ) as dst:
        dst.write(array, 1)


def test_compute_ndvi_matches_hand_computed_value(tmp_path):
    red = np.full((4, 4), 1000, dtype=np.uint16)
    nir = np.full((4, 4), 3000, dtype=np.uint16)
    red_path, nir_path = tmp_path / 'red.tif', tmp_path / 'nir.tif'
    write_tif(red_path, red)
    write_tif(nir_path, nir)

    result = compute_ndvi(red_path, nir_path, box(*BOUNDS))

    expected = (3000 - 1000) / (3000 + 1000)
    assert np.allclose(result.array, expected, atol=1e-3)


def test_compute_ndvi_masks_nodata_pixels(tmp_path):
    red = np.array([[1000, 0], [1000, 1000]], dtype=np.uint16)
    nir = np.array([[3000, 0], [3000, 3000]], dtype=np.uint16)
    red_path, nir_path = tmp_path / 'red.tif', tmp_path / 'nir.tif'
    write_tif(red_path, red)
    write_tif(nir_path, nir)

    result = compute_ndvi(red_path, nir_path, box(*BOUNDS))

    assert np.isnan(result.array[0, 1])
    assert not np.isnan(result.array[0, 0])


def test_compute_nbr_matches_hand_computed_value(tmp_path):
    nir = np.full((4, 4), 4000, dtype=np.uint16)
    swir = np.full((4, 4), 1000, dtype=np.uint16)
    nir_path, swir_path = tmp_path / 'nir.tif', tmp_path / 'swir.tif'
    write_tif(nir_path, nir)
    write_tif(swir_path, swir)

    result = compute_nbr(nir_path, swir_path, box(*BOUNDS))

    expected = (4000 - 1000) / (4000 + 1000)
    assert np.allclose(result.array, expected, atol=1e-3)


def test_compute_nbr_masks_pixels_flagged_by_scl(tmp_path):
    nir = np.full((2, 2), 4000, dtype=np.uint16)
    swir = np.full((2, 2), 1000, dtype=np.uint16)
    # SCL value 6 = water, masked by the default mask_scl_values
    scl = np.array([[6, 4], [4, 4]], dtype=np.uint8)
    nir_path, swir_path, scl_path = tmp_path / 'nir.tif', tmp_path / 'swir.tif', tmp_path / 'scl.tif'
    write_tif(nir_path, nir)
    write_tif(swir_path, swir)
    write_tif(scl_path, scl)

    result = compute_nbr(nir_path, swir_path, box(*BOUNDS), scl_band=scl_path)

    assert np.isnan(result.array[0, 0])
    assert not np.isnan(result.array[0, 1])


def test_compute_lst_converts_scaled_digital_numbers_to_celsius(tmp_path):
    # A digital number that, via the default USGS scale/offset, lands
    # comfortably inside a normal range - not an outlier.
    dn = 15000
    raw = np.full((2, 2), dn, dtype=np.uint16)
    tif_path = tmp_path / 'st_b10.tif'
    write_tif(tif_path, raw)

    result = compute_lst(tif_path, box(*BOUNDS))

    expected_c = (dn * 0.00341802 + 149.0) - 273.15
    assert np.allclose(result.array, expected_c, atol=1e-2)


def test_compute_lst_masks_outliers_above_max_valid_c(tmp_path):
    # A very high DN converts to an implausible temperature and should be
    # dropped rather than reported as real data.
    raw = np.array([[65000, 15000], [15000, 15000]], dtype=np.uint16)
    tif_path = tmp_path / 'st_b10.tif'
    write_tif(tif_path, raw)

    result = compute_lst(tif_path, box(*BOUNDS), max_valid_c=50.0)

    assert np.isnan(result.array[0, 0])
    assert not np.isnan(result.array[0, 1])
