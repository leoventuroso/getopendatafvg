"""Compute vegetation and temperature indices from downloaded satellite
bands, clipped to a boundary.

These functions return continuous-valued rasters only - no classification
into named classes, no color, no vectorization to polygons. Those are
presentation choices for the caller to make (different applications will
want different breakpoints, palettes, or none at all), not something this
library should decide on their behalf.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import rasterio
from rasterio import Affine
from rasterio.crs import CRS
from rasterio.mask import mask as rio_mask
from rasterio.warp import transform_geom
from shapely.geometry import mapping, shape
from shapely.geometry.base import BaseGeometry
from shapely.ops import orient
from shapely.validation import make_valid

# Landsat Collection 2 Level-2 ST_B10 scale/offset, converting the scaled
# digital number to Kelvin (USGS' documented values).
LST_SCALE = 0.00341802
LST_OFFSET = 149.0


@dataclass(frozen=True)
class IndexRaster:
    """A continuous-valued index raster, clipped to a boundary. `array`
    uses NaN for nodata/masked pixels.
    """

    array: np.ndarray
    transform: Affine
    crs: CRS


def compute_ndvi(red_band: Path, nir_band: Path, boundary: BaseGeometry) -> IndexRaster:
    """NDVI = (NIR - Red) / (NIR + Red), from Sentinel-2 B04 (red) and
    B08 (NIR).
    """
    with rasterio.open(red_band) as src:
        crs = src.crs
        geoms = _boundary_geoms_in_crs(boundary, crs)
        red_arr, transform = rio_mask(src, geoms, crop=True, nodata=0)
        red = red_arr[0].astype(np.float32)

    with rasterio.open(nir_band) as src:
        nir_arr, _ = rio_mask(src, geoms, crop=True, nodata=0)
        nir = nir_arr[0].astype(np.float32)

    nodata_mask = (red == 0) & (nir == 0)
    denom = nir + red
    with np.errstate(invalid='ignore', divide='ignore'):
        ndvi = np.where(denom > 0, (nir - red) / denom, np.nan)
    ndvi[nodata_mask] = np.nan

    return IndexRaster(array=ndvi, transform=transform, crs=crs)


def compute_nbr(
    nir_band: Path,
    swir_band: Path,
    boundary: BaseGeometry,
    scl_band: Path | None = None,
    mask_scl_values: frozenset[int] = frozenset({2, 3, 6}),
) -> IndexRaster:
    """NBR = (NIR - SWIR) / (NIR + SWIR), from Sentinel-2 B8A (NIR) and
    B12 (SWIR). Pass `scl_band` (Sentinel-2's Scene Classification Layer)
    to mask out shadow/cloud-shadow/water pixels (SCL values 2, 3, 6 by
    default, matching ESA's SCL legend) before computing the ratio.
    """
    with rasterio.open(nir_band) as src:
        crs = src.crs
        geoms = _boundary_geoms_in_crs(boundary, crs)
        nir_arr, transform = rio_mask(src, geoms, crop=True, nodata=0)
        nir = nir_arr[0].astype(np.float32)

    with rasterio.open(swir_band) as src:
        swir_arr, _ = rio_mask(src, geoms, crop=True, nodata=0)
        swir = swir_arr[0].astype(np.float32)

    nodata_mask = (nir == 0) & (swir == 0)
    denom = nir + swir
    with np.errstate(invalid='ignore', divide='ignore'):
        nbr = np.where(denom > 0, (nir - swir) / denom, np.nan)
    nbr[nodata_mask] = np.nan

    if scl_band is not None:
        with rasterio.open(scl_band) as src:
            scl_arr, _ = rio_mask(src, geoms, crop=True, nodata=0)
            scl = scl_arr[0]
        nbr[np.isin(scl, list(mask_scl_values))] = np.nan

    return IndexRaster(array=nbr, transform=transform, crs=crs)


def compute_lst(
    thermal_band: Path,
    boundary: BaseGeometry,
    scale: float = LST_SCALE,
    offset: float = LST_OFFSET,
    max_valid_c: float = 50.0,
) -> IndexRaster:
    """Land surface temperature in Celsius, from a Landsat Collection 2
    Level-2 ST_B10 band. Pixels above `max_valid_c` are treated as
    outliers (bare rock, cloud, sensor artifacts) and masked out.
    """
    with rasterio.open(thermal_band) as src:
        crs = src.crs
        geoms = _boundary_geoms_in_crs(boundary, crs)
        raw_arr, transform = rio_mask(src, geoms, crop=True, nodata=0)
        raw = raw_arr[0].astype(np.float32)

    nodata_mask = raw == 0
    lst_c = (raw * scale + offset) - 273.15
    lst_c[nodata_mask] = np.nan
    lst_c[lst_c > max_valid_c] = np.nan

    return IndexRaster(array=lst_c, transform=transform, crs=crs)


def _boundary_geoms_in_crs(boundary: BaseGeometry, dst_crs: CRS) -> list[dict]:
    """Reproject `boundary` (assumed EPSG:4326, matching every other
    boundary-shaped parameter in this library) into `dst_crs`, repairing
    self-intersections and enforcing CCW exterior rings so rasterio's
    mask() treats every part as a filled area rather than a hole - the
    same fix real-world municipal boundaries have needed in practice.
    """
    geom_dst = shape(transform_geom(CRS.from_epsg(4326), dst_crs, mapping(boundary)))
    geom_valid = orient(make_valid(geom_dst), sign=1.0)
    if geom_valid.geom_type == 'GeometryCollection':
        parts = [g for g in geom_valid.geoms if not g.is_empty]
    else:
        parts = [geom_valid]
    return [mapping(p) for p in parts]
