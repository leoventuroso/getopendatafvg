# Satellite imagery

::: getopendatafvg.sentinel2
    options:
      members:
        - DEFAULT_BANDS
        - Band
        - CdseCredentials
        - Sentinel2Scene
        - fetch_sentinel2_scene

::: getopendatafvg.landsat
    options:
      members:
        - LandsatScene
        - UsgsCredentials
        - fetch_landsat_scene

::: getopendatafvg.scene_date
    options:
      members:
        - landsat_scene_date
        - sentinel2_scene_date

::: getopendatafvg._errors
    options:
      members:
        - NoCleanSceneFoundError
