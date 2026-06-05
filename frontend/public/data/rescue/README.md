# Rescue data

Static layers for the Soccorso ed Emergenza module.

The pipeline can try to refresh these files from OSM and fall back to the current placeholders when the area has no mapped features yet.

- `aed.geojson`: Automated External Defibrillators
- `hems.geojson`: helicopter landing / HEMS points
- `fire_hydrants.geojson`: fire hydrants
- `emergency_assembly_points.geojson`: emergency assembly points

Populate these files with real features to render the points on the map.
