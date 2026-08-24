"""
Generate frazioni.geojson for the configured comune.

Creates approximate circular polygons for each locality (frazione/borgata/
capoluogo) listed in frontend/src/data/localities.json — a hand-curated
input file (name, coordinates, radius), since this kind of local
subdivision isn't reliably queryable from OSM/Overpass for every comune.
For a new comune: replace localities.json with your own list (see SETUP.md).

Output: frontend/public/data/frazioni.geojson
"""

import json
import math
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
LOCALITIES_PATH = REPO_ROOT / 'frontend' / 'src' / 'data' / 'localities.json'
OUTPUT_PATH = REPO_ROOT / 'frontend' / 'public' / 'data' / 'frazioni.geojson'


def circle_polygon(lon: float, lat: float, radius_m: float, n_points: int = 32) -> list[list[float]]:
    """
    Approximate a circle as a polygon in WGS84 coordinates.
    radius_m: radius in metres.
    """
    lat_rad = math.radians(lat)
    # Degrees per metre at this latitude
    deg_per_m_lat = 1.0 / 111_320.0
    deg_per_m_lon = 1.0 / (111_320.0 * math.cos(lat_rad))

    coords = []
    for i in range(n_points):
        angle = 2 * math.pi * i / n_points
        d_lat = radius_m * math.cos(angle) * deg_per_m_lat
        d_lon = radius_m * math.sin(angle) * deg_per_m_lon
        coords.append([round(lon + d_lon, 6), round(lat + d_lat, 6)])
    coords.append(coords[0])  # close ring
    return coords


def main():
    if not LOCALITIES_PATH.exists():
        raise FileNotFoundError(
            f"{LOCALITIES_PATH} non trovato. Crea questo file con la lista delle "
            "frazioni/borgate del tuo comune — vedi SETUP.md."
        )

    with LOCALITIES_PATH.open(encoding='utf-8') as f:
        localities = json.load(f)['localities']

    features = []
    for loc in localities:
        ring = circle_polygon(loc["lon"], loc["lat"], loc["radius_m"])
        props = {
            "name": loc["name"],
            "type": loc["type"],
            "centroid_lon": loc["lon"],
            "centroid_lat": loc["lat"],
        }
        if loc.get("name_fur"):
            props["name_fur"] = loc["name_fur"]

        features.append({
            "type": "Feature",
            "properties": props,
            "geometry": {
                "type": "Polygon",
                "coordinates": [ring],
            },
        })

    geojson = {
        "type": "FeatureCollection",
        "features": features,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)

    print(f"Written {len(features)} features to {OUTPUT_PATH}")
    for loc in localities:
        print(f"  {loc['type']:10s}  {loc['name']}  r={loc['radius_m']}m")


if __name__ == "__main__":
    main()
