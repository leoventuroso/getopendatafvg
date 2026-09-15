import matplotlib
import numpy as np
from matplotlib.figure import Figure
from rasterio import Affine
from rasterio.crs import CRS

from getopendatafvg import IndexRaster, plot_index

matplotlib.use('Agg')  # no display available in CI


def make_raster() -> IndexRaster:
    array = np.array([[0.1, 0.5], [0.8, np.nan]], dtype=np.float32)
    transform = Affine.translation(300000, 5100000) * Affine.scale(10.0, -10.0)
    return IndexRaster(array=array, transform=transform, crs=CRS.from_epsg(32633))


def test_plot_index_returns_a_matplotlib_figure():
    fig = plot_index(make_raster())
    assert isinstance(fig, Figure)


def test_plot_index_sets_title_when_given():
    fig = plot_index(make_raster(), title='NDVI test')
    assert fig.axes[0].get_title() == 'NDVI test'
