# getopendatafvg

A Python library for the open data of Friuli Venezia Giulia: the
regional WFS GeoServer and Open Data portal, ISTAT statistics, cadastral
parcels, avalanche sites, OpenStreetMap, and Sentinel-2/Landsat imagery.
Known upstream defects are handled and tested against the live services;
see [Upstream defects](upstream-defects.md).

```bash
pip install getopendatafvg
```

```python
from getopendatafvg import fetch_population_series

fetch_population_series('093042')  # Montereale Valcellina, from 2019
```

## Using this reference

Every documented name is importable directly from `getopendatafvg`; the
pages group them by the module that defines them. The public API is
exactly `getopendatafvg.__all__`, and changes to it are recorded in the
[changelog](https://github.com/leoventuroso/getopendatafvg/blob/main/CHANGELOG.md).

The [README](https://github.com/leoventuroso/getopendatafvg#readme)
has worked examples for each source. To report a problem or propose a
change, see
[CONTRIBUTING](https://github.com/leoventuroso/getopendatafvg/blob/main/CONTRIBUTING.md).
