# Upstream defects and traps

This is a registry of the ways the upstream services misbehave or mislead, and of what this library does about each one. It covers only the sources the library wraps. Each entry was established against the live service; the date and commit are when it was first written down in this repository.

Three kinds of entry:

- **defect**: the service does something wrong, such as an off-by-one in a filter.
- **trap**: the service behaves as designed, but a reasonable caller gets a wrong or incomplete answer without any error.
- **constraint**: an operational limit with a severe penalty.

## How entries are tested

A test that pins an entry carries the `quirk` marker with the entry's ID:

```python
@pytest.mark.quirk('UD-01')
def test_correct_end_period_subtracts_one_from_a_plain_year(): ...
```

`pytest -m quirk` runs them all. `tests/test_upstream_defects.py` keeps this file and the markers in step, failing when:

- a marker names an ID that is not in this file;
- an entry has no marked test and is not flagged **Not tested**.

Some entries can only be checked against the live service. Their marked tests are opt-in and run with `GETOPENDATAFVG_LIVE=1`.

## ISTAT SDMX (esploradati.istat.it)

### UD-01 · `endPeriod` returns one year too many

- **Kind:** defect.
- **Symptom:** a year passed as `endPeriod` returns data up to the following year. ondata/guida-api-istat documents the same behaviour independently.
- **Handling:** `fetch_istat_dataflow` subtracts one from a plain four-digit year before sending it. Quarters and months are passed unchanged.
- **First recorded:** 2026-09-15, `1273225`.

### UD-02 · 5 requests per minute, then a block of one to two days

- **Kind:** constraint.
- **Symptom:** a client exceeding the limit has its IP blocked for one to two days.
- **Handling:** every request goes through a client-side throttle in `istat._throttle`. The throttle is per process, so parallel processes can still exceed the limit together.
- **First recorded:** 2026-09-15, `1273225`.

### UD-03 · The legacy endpoint no longer serves data

- **Kind:** defect.
- **Symptom:** `sdmx.istat.it` redirects every data request to its own homepage instead of returning data or an error. Some older tooling still falls back to it.
- **Handling:** the library never uses it; a test checks that requests go to `esploradati.istat.it`.
- **First recorded:** 2026-09-15, `1273225`.

### UD-04 · Pre-2013 NUTS codes, and a bare 404 for current ones

- **Kind:** trap.
- **Symptom:** dataflows 150_915 (employment), 122_54 (tourism) and 167_744 (consumer prices) identify Friuli Venezia Giulia as `ITD4`, with provinces `ITD41`–`ITD44`. The current code is `ITH4`. Asking with a current code returns 404, with nothing to say why.
- **Handling:** `FVG_NUTS_AREAS` holds the five codes these dataflows accept.
- **First recorded:** 2026-10-06, `00135a1`.

### UD-05 · Tourism totals sit beside subtotals on equal footing

- **Kind:** trap.
- **Symptom:** dataflow 122_54 slices each figure along several dimensions at once (locality type, accommodation type, urbanisation, coastal area, room count, country of residence). An unfiltered query returns subtotals next to the total. For Friuli Venezia Giulia in 2023 the `LOCALITY_TYPE` dimension alone gives 11 rows for one year. The total (`ALL`) is 2,910,023 arrivals; thermal localities (`TOUR_THRM`) are 21,334. Taking the wrong row gives a plausible number that is two orders of magnitude off.
- **Handling:** `TOURISM_TOTAL_KEYS` pins every breakdown dimension to its total, and guests are pinned to `WORLD`.
- **First recorded:** 2026-10-06, `2edf323`.

### UD-06 · No tourist flows below province level

- **Kind:** trap.
- **Symptom:** dataflow 122_54 carries comune rows only for the capacity indicators. Arrivals and nights (`AR`, `NI`) are simply absent for a comune, so the query succeeds and returns nothing.
- **Handling:** `fetch_tourism_flows` documents province as its floor and returns an empty series for a comune. `fetch_tourism_capacity` covers comune level.
- **First recorded:** 2026-10-06, `2edf323`.

### UD-07 · A defined indicator that is never published

- **Kind:** trap.
- **Symptom:** dataflow 122_54 defines a `PM` indicator (average stay), but it was not published for any area checked.
- **Handling:** `fetch_tourism_flows` derives the average stay from nights over arrivals.
- **First recorded:** 2026-10-06, `2edf323`.

### UD-08 · More comune codes than comuni

- **Kind:** trap.
- **Symptom:** dataflow 122_54 carries data for 225 FVG comune codes, while the region has 215 comuni today. The extra codes belong to comuni that have since merged. A series keyed by code mixes current and former comuni without saying so.
- **Handling:** none yet. This is the input to the territorial crosswalk, Phase 2 of `docs/PLAN.md`.
- **Not tested.** It will be covered by the crosswalk's known-answer tests.
- **First recorded:** 2026-10-06, `2edf323`.

## Open Data FVG portal (Socrata)

### UD-09 · `only=dataset` hides most of the portal

- **Kind:** trap.
- **Symptom:** of about 850 assets on the portal, 266 are type `dataset` and 551 are type `filter`, a saved view fetched by resource ID exactly like a dataset. Narrowing the discovery API with `only=dataset` makes the filters look missing, several catalog entries among them.
- **Handling:** `search_open_data_fvg` searches every asset type.
- **First recorded:** 2026-09-29, `fac0e0c`.

### UD-10 · The ozone geometry column is empty after 2020-05-19

- **Kind:** defect.
- **Symptom:** on the ARPA ozone series (`7vnx-28uy`), `geocoded_column` is empty for every row dated after 2020-05-19: 130,945 rows at the 2026-11-11 check, about half the series. A `within_box` on it returns only the older half, without any error. It was first recorded as empty "from 2020-05"; the live test found the first 19 days of that month still geocoded.
- **Handling:** the catalog entry filters on the numeric `longitudine`/`latitudine` columns instead, which are filled throughout.
- **First recorded:** 2026-11-09, `6e80dbc`.

### UD-11 · `between` on a text column compares strings

- **Kind:** trap.
- **Symptom:** SoQL accepts `between` on a text column and compares the values as strings. Coordinates stored as text are matched against the wrong rows, without any error.
- **Handling:** `lon_lat_columns` is recorded only for columns whose schema type is `number`. The live test checks the type against each dataset's schema.
- **First recorded:** 2026-11-09, `6e80dbc`.

### UD-12 · Parafarmacie stores coordinates as text with a decimal comma

- **Kind:** defect.
- **Symptom:** `b3xh-hm8p` has `latitudine`/`longitudine`, but as text with a comma decimal separator. SODA cannot filter on them at all.
- **Handling:** the entry records no coordinate columns, so a boundary on it raises instead of returning wrong rows.
- **First recorded:** 2026-09-23, `c19d41d`.

### UD-13 · ARPA air-quality series have no station code

- **Kind:** trap.
- **Symptom:** the same station appears as `V.Cairoli`, `Udine - via Cairoli` and `Udine via Cairoli`, with coordinates that differ in the fifth decimal place. Grouping by `ubicazione` splits one station into several.
- **Handling:** documented in the catalog descriptions only.
- **Not tested.** Grouping is left to the caller, so the library has no behaviour to pin.
- **First recorded:** 2026-11-09, `6e80dbc`.

### UD-14 · Closed and stalled ARPA series

- **Kind:** trap.
- **Symptom:** total suspended particulate (PTS) is a closed series, 2005–2018. Carbon monoxide's last value is 2026-01-15, while the other series reach 2026-11-01. Neither says so in its metadata.
- **Handling:** documented in the catalog descriptions, which a test pins. Detecting series that stall in future is left to the drift fingerprints of Phase 1 in `docs/PLAN.md`.
- **First recorded:** 2026-11-09, `6e80dbc`.

## Regional WFS GeoServer (serviziogc.regione.fvg.it)

### UD-15 · The avalanche register is split in two by survey method

- **Kind:** trap.
- **Symptom:** the Catasto Valanghe is two layers: `CV_VALANGHE_RILEVATE` (ground-surveyed, 3,875 features) and `CV_VALANGHE_FOTOINT` (photo-interpreted, 3,255). They split by method, not by area, and neither refers to the other. A query on one silently misses about half the sites. The two share no `ID_SITO`.
- **Handling:** `fetch_avalanche_sites` merges both and records which survey each site came from.
- **First recorded:** 2026-10-06, `0096c1d`.

### UD-16 · One avalanche site stored as two rows

- **Kind:** trap.
- **Symptom:** sites `ID_SITO` 1060 and 3668 are stored as two polygon rows each in the surveyed layer, with the same attributes and different `OBJECTID`. Keeping one row per site silently shrinks those sites.
- **Handling:** rows are grouped by `ID_SITO`, and `AvalancheSite.geometries` is a tuple.
- **First recorded:** 2026-10-06, `0096c1d`.

## USGS M2M API (Landsat)

### UD-17 · Nested bands carry their own entity ID

- **Kind:** trap.
- **Symptom:** a single band is often not a top-level download option but nested under a bundle's `secondaryDownloads`, with an `entityId` different from the parent scene's. Pairing it with the parent's ID returns an unexplained "invalid scene".
- **Handling:** `fetch_landsat_scene` matches downloads on the secondary download's own entity ID.
- **First recorded:** 2026-09-15, `6ba19a7`.

### UD-18 · `download-request` needs a short label

- **Kind:** defect.
- **Symptom:** without a `label` of at most 50 characters, a download request either queues nothing without any error or fails with a bare `INPUT_INVALID`.
- **Handling:** the library always sends a label within the limit.
- **First recorded:** 2026-09-15, `6ba19a7`.

### UD-19 · Errors returned with HTTP 200

- **Kind:** defect.
- **Symptom:** M2M reports failures in the JSON body's `errorCode` while the HTTP status is 200, so checking the status alone treats an error as success.
- **Handling:** every M2M call checks `errorCode` and raises on it.
- **First recorded:** 2026-09-25, `d533638`.
