from unittest.mock import patch

import pytest

from getopendatafvg import TippecanoeNotFoundError, build_pmtiles


def test_build_pmtiles_raises_a_clear_error_when_tippecanoe_is_missing(tmp_path):
    with patch('getopendatafvg.pmtiles.shutil.which', return_value=None), pytest.raises(TippecanoeNotFoundError):
        build_pmtiles(tmp_path / 'in.geojson', tmp_path / 'out.pmtiles', 'my_layer')


def test_build_pmtiles_calls_tippecanoe_with_the_expected_arguments(tmp_path):
    geojson_path = tmp_path / 'in.geojson'
    out_path = tmp_path / 'nested' / 'out.pmtiles'

    with patch('getopendatafvg.pmtiles.shutil.which', return_value='/usr/bin/tippecanoe'), \
         patch('getopendatafvg.pmtiles.subprocess.run') as run:
        build_pmtiles(geojson_path, out_path, 'my_layer')

    args = run.call_args.args[0]
    assert args[0] == 'tippecanoe'
    assert '-o' in args and str(out_path) in args
    assert '-l' in args and 'my_layer' in args
    assert str(geojson_path) in args
    assert run.call_args.kwargs['check'] is True
    # build_pmtiles must create the output directory, not assume it exists.
    assert out_path.parent.is_dir()
