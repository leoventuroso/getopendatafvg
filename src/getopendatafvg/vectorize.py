"""Classify a continuous-valued index raster into named classes and
vectorize it to polygons.

Produces plain GeoJSON-ready features carrying only a `class` label and
an area - no color, no palette. That keeps the output useful anywhere
(QGIS, further analysis, a different renderer) instead of tying it to one
particular map's styling choices.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from rasterio.crs import CRS
from rasterio.enums import Resampling
from rasterio.features import shapes as rio_shapes
from rasterio.transform import array_bounds, from_bounds
from rasterio.warp import reproject as rio_reproject
from rasterio.warp import transform_geom
from shapely.geometry import mapping, shape
from shapely.validation import make_valid

from .indices import IndexRaster

WGS84 = CRS.from_epsg(4326)


@dataclass(frozen=True)
class ClassBreak:
    """One classification bucket: values in [low, high) get `label`."""

    low: float
    high: float
    label: str


def classify_and_vectorize(
    raster: IndexRaster,
    breaks: list[ClassBreak],
    resolution_m: float | None = None,
    min_area_m2: float = 0,
    simplify_tolerance_m: float = 0,
) -> list[dict[str, Any]]:
    """Classify `raster.array` into `breaks` and vectorize the result to
    GeoJSON Feature dicts (EPSG:4326), each carrying `class` (the
    matching break's label) and `area_m2`.

    `resolution_m` resamples to a coarser grid before vectorizing (a
    smaller output, less detail) - pass None to vectorize at the raster's
    native resolution. `min_area_m2` drops polygons below that area
    (pixel-sized noise), checked before simplification. `simplify_tolerance_m`
    simplifies polygon boundaries by that tolerance, in the raster's own
    (projected) CRS units - typically metres.
    """
    array, transform = raster.array, raster.transform

    if resolution_m is not None:
        array, transform = _resample(array, transform, raster.crs, resolution_m)

    classified = _classify(array, breaks)

    features = []
    for geom_dict, pixel_val in rio_shapes(classified, transform=transform):
        class_index = int(pixel_val)
        if class_index == 0:
            continue

        geom = shape(geom_dict)
        if geom.area < min_area_m2:
            continue
        if simplify_tolerance_m > 0:
            geom = geom.simplify(simplify_tolerance_m, preserve_topology=True)
        geom = make_valid(geom)
        if geom.is_empty:
            continue

        geom_wgs84 = transform_geom(raster.crs, WGS84, mapping(geom))
        features.append({
            'type': 'Feature',
            'geometry': geom_wgs84,
            'properties': {
                'class': breaks[class_index - 1].label,
                'area_m2': round(geom.area),
            },
        })

    return features


def _classify(array: np.ndarray, breaks: list[ClassBreak]) -> np.ndarray:
    """1-indexed class-index raster (0 = nodata/unclassified)."""
    out = np.zeros(array.shape, dtype=np.uint8)
    for idx, brk in enumerate(breaks, start=1):
        out[np.isfinite(array) & (array >= brk.low) & (array < brk.high)] = idx
    return out


def _resample(array: np.ndarray, transform, crs: CRS, resolution_m: float):
    native_res_m = abs(transform.a)
    scale = native_res_m / resolution_m
    h, w = array.shape
    new_h, new_w = max(1, round(h * scale)), max(1, round(w * scale))
    bounds = array_bounds(h, w, transform)
    new_transform = from_bounds(*bounds, new_w, new_h)

    resampled = np.empty((new_h, new_w), dtype=np.float32)
    rio_reproject(
        source=array,
        destination=resampled,
        src_transform=transform,
        src_crs=crs,
        dst_transform=new_transform,
        dst_crs=crs,
        resampling=Resampling.bilinear,
        src_nodata=float('nan'),
        dst_nodata=float('nan'),
    )
    return resampled, new_transform
