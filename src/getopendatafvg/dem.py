"""Sample a DEM along a line and derive its slope and grade.

The DEM's own CRS is read from the file and used for every distance/area
computation - a caller passes lines in WGS84 (like every other
boundary/line-shaped parameter in this library) and reprojection happens
internally, rather than requiring the caller to pre-reproject their data
into whatever projected CRS a particular DEM file happens to use. That
distinction mattered in practice: mappa-civica's own scripts used two
different UTM zones (32N for trail slope, 33N for shade corridors) for
what was nominally the same region, entirely by hand - exactly the kind
of mismatch this removes as a possibility.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from types import TracebackType
from typing import Self

import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.warp import transform_geom
from shapely.geometry import mapping, shape
from shapely.geometry.base import BaseGeometry

WGS84 = CRS.from_epsg(4326)

# (low_inclusive, high_exclusive, label) - a walking/cycling difficulty
# scale in percent grade, not a universal standard; pass your own list to
# slope_class_for_value for a different scale.
SLOPE_CLASSES = [
    (0, 3, '0-3: flat'),
    (3, 5, '3-5: mild'),
    (5, 8, '5-8: medium'),
    (8, 10, '8-10: hard'),
    (10, 20, '10-20: extreme'),
    (20, float('inf'), '>20: impossible'),
]


@dataclass
class DemSampler:
    """A DEM raster kept open for repeated line sampling. Use as a
    context manager (`with DemSampler.open(path) as dem:`) so the file
    handle is closed even if sampling raises.
    """

    _dataset: rasterio.DatasetReader

    @classmethod
    def open(cls, path: Path) -> DemSampler:
        return cls(_dataset=rasterio.open(path))

    def close(self) -> None:
        self._dataset.close()

    def __enter__(self) -> Self:
        return self

    def __exit__(
        self, exc_type: type[BaseException] | None, exc: BaseException | None, tb: TracebackType | None
    ) -> None:
        self.close()

    @property
    def crs(self) -> CRS:
        return self._dataset.crs

    def sample_line(self, line: BaseGeometry, sample_step_m: float = 10.0) -> tuple[np.ndarray, np.ndarray]:
        """(distances_m, elevations_m) sampled roughly every
        `sample_step_m` along `line` (a WGS84 LineString), reprojected
        internally to the DEM's own CRS. Elevation is a simple
        nearest-pixel lookup (no interpolation) - fine for the best-fit
        slope/grade this feeds into, where sub-pixel smoothing wouldn't
        change the answer. NaN marks a nodata pixel.

        Returns two empty arrays for a zero-length or empty line.
        """
        line_proj = shape(transform_geom(WGS84, self.crs, mapping(line)))
        length_m = line_proj.length
        if length_m <= 0:
            return np.array([]), np.array([])

        sample_count = max(2, int(np.ceil(length_m / sample_step_m)) + 1)
        distances = np.linspace(0.0, length_m, sample_count)
        points = [(p.x, p.y) for p in (line_proj.interpolate(d) for d in distances)]

        nodata = self._dataset.nodata
        raw = np.array([v[0] for v in self._dataset.sample(points)], dtype=np.float64)
        elevations = raw if nodata is None else np.where(raw == nodata, np.nan, raw)
        return distances, elevations


def compute_line_slope(distances: np.ndarray, elevations: np.ndarray) -> float:
    """Average slope (%, always positive) along a sampled line: a
    best-fit gradient across every valid sample, not a sum of each
    up/down wiggle - a line with a single steep step reads the same as a
    long, evenly graded climb of the same net rise, which is usually
    what you want for a walking/cycling difficulty estimate. Returns 0
    with fewer than 2 valid (non-NaN) samples.
    """
    valid = np.isfinite(elevations)
    if np.count_nonzero(valid) < 2:
        return 0.0
    slope_m_per_m = float(np.polyfit(distances[valid], elevations[valid], 1)[0])
    return abs(slope_m_per_m) * 100.0


def compute_line_grade(distances: np.ndarray, elevations: np.ndarray) -> float:
    """Net grade (%, signed - positive means uphill) between the first
    and last valid sample. Unlike compute_line_slope, this ignores
    everything in between: a line that climbs then descends back to its
    start has a grade of 0 even though its slope is well above that.
    Returns 0 with fewer than 2 valid samples.
    """
    valid = np.flatnonzero(np.isfinite(elevations))
    if valid.size < 2:
        return 0.0
    first, last = valid[0], valid[-1]
    run = distances[last] - distances[first]
    if run <= 0:
        return 0.0
    return ((elevations[last] - elevations[first]) / run) * 100.0


def slope_class_for_value(slope_pct: float, classes: list[tuple[float, float, str]] = SLOPE_CLASSES) -> str:
    for minimum, maximum, label in classes:
        if minimum <= slope_pct < maximum:
            return label
    return classes[-1][2]
