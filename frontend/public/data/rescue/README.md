# Rescue data

Static layers for the Soccorso ed Emergenza module.

## Emergency assets (OSM)

`build_rescue_geojson.py` tries to refresh these from OpenStreetMap via Overpass
and falls back to the committed placeholder when the area has nothing mapped yet.

- `aed.geojson`: defibrillators (DAE) - **generated**, do not hand-edit
- `hems.geojson`: helicopter landing / HEMS points
- `fire_hydrants.geojson`: fire hydrants
- `emergency_assembly_points.geojson`: emergency assembly points

Populate these files with real features to render the points on the map.

### `aed_comune.geojson` (curated, hand-maintained)

The comune-provided list of defibrillators, geocoded from addresses. This is the
input the pipeline keeps; the Overpass query for `aed` matches both
`emergency=defibrillator` and `amenity=defibrillator` and `merge_curated()`
writes `aed.geojson` = OSM features + any curated point with no OSM node within
~60 m. So once a device is added to OSM it supersedes its geocoded point with no
duplicate. `geocoded: true` / `geo_precision` mark points placed from an address
(verify on the ground); the popup shows a caveat for them.

## Rii a rischio esondazione (`rii.geojson` + `rii/`)

The "Rii a rischio" tab. A comune-specific volunteer field survey (Censimento
RII) by the Gruppo Comunale di Protezione Civile - one point per rio, with a
representative photo, the described criticality and proposed interventions. **Not** a technical study and **not** a live feed.

Rebuilt only when a new source package is delivered:

```
python pipeline/scripts/build_rii_geojson.py
```

It merges two inputs and writes `rii.geojson` plus web-resized photos into `rii/`:

- `data/sources/output_rii_protezione_civile.zip` - the CSV attributes and photos.
- `pipeline/scripts/rii_osm_lines.geojson` - the real watercourse geometry from
  OpenStreetMap (ODbL), keyed by census id. The CSV coordinates are single
  EXIF/estimate points, several far from the actual rio; where OSM has the named
  stream the layer draws its line instead, otherwise a point.

Every rio has a `Point` marker feature (the dot people click); rii that OSM
maps also carry a `LineString` for spatial context, sharing the feature id.
Marker/line colour encodes how current the survey is (`stato`); faded points
have only an approximate position. Clicking a rio opens a map popup with its
card (photo, criticality, proposed works). Rii without any
usable location are skipped (mentioned in the module FAQ instead).

For a comune without this data, leave `rii.geojson` as an empty
`FeatureCollection` and the tab simply shows no points.

## Incendi boschivi (`fire_perimeters.geojson`)

The "Incendi boschivi" tab. Forest fire perimeters from Regione FVG, IRDAT
dataset 1232 ("Perimetro degli incendi boschivi" - perimeters digitised from
the Fogli Notizie Incendi Boschivi filed by the Stazioni Forestali, with GPS
field surveys). Pulled from the regional GeoServer WFS and filtered by comune:

```
python pipeline/scripts/build_fire_geojson.py     # make fire
```

The same script also writes two optional-overlay files from the ZONE_RISC WFS:

- `fire_danger.geojson` - `SITFOR_PERICOLO_INCENDI` regional danger zonation
  (`grado` = medio/alta), clipped to `municipalBoundary.json`.
- `fire_ignition_points.geojson` - `V_INCENDI_PUNTOINIZIO`, filtered by the
  comune's forest stations and matched to its perimeters by
  (SIGLA_STAZ, ANNO_FNIB, NUM_FNIB), plus any point inside the boundary.

Needs `shapely` (for the boundary clip; already in `requirements-ci.txt`).
Polygons carry year, locality, start date, duration, ignition place, vegetation
state and cause; `causa_classe` (dolosa/colposa/naturale/ignota) drives colour
and filtering. Only FVG comuni get data - elsewhere the queries return empty
`FeatureCollection`s. It is a historical archive, not a predictive hazard map;
the SITFOR overlay is a coarse propensity zonation, not a live alert.

The tab also offers an optional NBR overlay, reusing `../nbr.geojson` (the Green
module's Normalized Burn Ratio layer) as a satellite burn/dryness backdrop.
