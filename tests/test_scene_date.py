from pathlib import Path

from getopendatafvg import landsat_scene_date, sentinel2_scene_date


def test_sentinel2_scene_date_parses_official_name():
    safe_dir = Path('S2A_MSIL2A_20230918T100031_N0509_R122_T33TUM_20230918T134617.SAFE')
    assert sentinel2_scene_date(safe_dir) == '2023-09-18'


def test_sentinel2_scene_date_returns_none_for_unrelated_name():
    assert sentinel2_scene_date(Path('not_a_safe_dir')) is None


def test_landsat_scene_date_parses_official_name():
    tif_path = Path('LC08_L2SP_193028_20230915_20230920_02_T1_ST_B10.TIF')
    assert landsat_scene_date(tif_path) == '2023-09-15'


def test_landsat_scene_date_returns_none_for_hand_renamed_file():
    assert landsat_scene_date(Path('landsat_lwir11.TIF')) is None


def test_landsat_scene_date_handles_both_satellites():
    assert landsat_scene_date(Path('LC09_L2SP_192028_20260831_20260901_02_T1_ST_B10.TIF')) == '2026-08-31'
