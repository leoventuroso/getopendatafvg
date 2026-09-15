"""Quick static previews of an index raster, for exploration in a
notebook. Not meant to replace a real interactive map - Mappa Civica
already has one of those, in the browser, with colors and a legend this
module doesn't try to duplicate.

Needs the `viz` extra: `pip install getopendatafvg[viz]`.
"""

from __future__ import annotations

from .indices import IndexRaster


def plot_index(
    raster: IndexRaster,
    cmap: str = 'RdYlGn',
    vmin: float | None = None,
    vmax: float | None = None,
    title: str | None = None,
):
    """Return a matplotlib Figure showing `raster` as a quick-look image."""
    try:
        import matplotlib.pyplot as plt
    except ImportError as exc:
        raise ImportError(
            'plot_index needs matplotlib - install with `pip install getopendatafvg[viz]`'
        ) from exc

    fig, ax = plt.subplots()
    im = ax.imshow(raster.array, cmap=cmap, vmin=vmin, vmax=vmax)
    ax.set_axis_off()
    if title:
        ax.set_title(title)
    fig.colorbar(im, ax=ax, shrink=0.7)
    return fig
