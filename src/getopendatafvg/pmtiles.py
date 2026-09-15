"""Convert a GeoJSON file to PMTiles vector tiles via the tippecanoe CLI.

tippecanoe (https://github.com/felt/tippecanoe) is a separate binary, not
a Python package - it has to be installed and on PATH (`brew install
tippecanoe` on macOS; built from source on most Linux setups). This
module doesn't bundle or install it, only wraps calling it and turns
"it's missing" into a catchable exception instead of a subprocess error
with no clear cause, so a caller can decide what to do about it (keep an
existing .pmtiles, skip the step, fail loudly) rather than the choice
being made for them.
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

# -zg: pick a sensible max zoom automatically. --drop-densest-as-needed +
# --extend-zooms-if-still-dropping: keep the tileset under size limits by
# thinning dense areas rather than failing outright.
DEFAULT_ARGS = ('-zg', '--drop-densest-as-needed', '--extend-zooms-if-still-dropping')


class TippecanoeNotFoundError(RuntimeError):
    """tippecanoe isn't on PATH. Install it separately - see
    https://github.com/felt/tippecanoe#installation.
    """


def build_pmtiles(
    geojson_path: Path,
    out_path: Path,
    layer_name: str,
    extra_args: tuple[str, ...] = DEFAULT_ARGS,
) -> None:
    """Run tippecanoe to convert `geojson_path` into a `.pmtiles` file at
    `out_path`, as one layer named `layer_name`. Raises
    TippecanoeNotFoundError if the binary isn't on PATH.
    """
    if shutil.which('tippecanoe') is None:
        raise TippecanoeNotFoundError(
            'tippecanoe is not on PATH - install it separately '
            '(see https://github.com/felt/tippecanoe#installation)'
        )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ['tippecanoe', '-o', str(out_path), '-l', layer_name, *extra_args, '--force', str(geojson_path)],
        check=True,
    )
