"""
Generate frazioni.geojson for Montereale Valcellina.

Creates approximate circular polygons for each frazione/borgata
using coordinates from Nominatim (OSM data).

Frazioni ufficiali (Sottodivisioni):
  Grizzo, Malnisio, San Leonardo

Borgate (definite "borgate" dallo statuto comunale):
  Borgo Alzetta, Cao Malnisio, San Rocco

Output: frontend/public/data/frazioni.geojson
"""

import json
import math
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_PATH = REPO_ROOT / 'frontend' / 'public' / 'data' / 'frazioni.geojson'

# Frazioni and borgate with coordinates from Nominatim OSM data.
# radius_m: approximate radius for the circular polygon representation.
LOCALITIES = [
    {
        "name": "Montereale Valcellina",
        "name_fur": "Montreâl",
        "type": "capoluogo",
        "lon": 12.6621363,
        "lat": 46.1605087,
        "radius_m": 550,
    },
    {
        "name": "Grizzo",
        "name_fur": "Gris",
        "type": "frazione",
        "lon": 12.64901,
        "lat": 46.15073,
        "radius_m": 450,
    },
    {
        "name": "Malnisio",
        "name_fur": "Malnîs",
        "type": "frazione",
        "lon": 12.63721,
        "lat": 46.14404,
        "radius_m": 400,
    },
    {
        "name": "San Leonardo",
        "name_fur": "Salinart",
        "type": "frazione",
        "lon": 12.68226,
        "lat": 46.09697,
        "radius_m": 380,
    },
    {
        "name": "Borgo Alzetta",
        "name_fur": None,
        "type": "borgata",
        "lon": 12.64381,
        "lat": 46.15370,
        "radius_m": 200,
    },
    {
        "name": "Cao Malnisio",
        "name_fur": "Cao Malnîs",
        "type": "borgata",
        "lon": 12.63001,
        "lat": 46.14309,
        "radius_m": 220,
    },
    {
        "name": "San Rocco",
        "name_fur": None,
        "type": "borgata",
        "lon": 12.66098,
        "lat": 46.16649,
        "radius_m": 200,
    },
]


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
    features = []
    for loc in LOCALITIES:
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
    for loc in LOCALITIES:
        print(f"  {loc['type']:10s}  {loc['name']}  r={loc['radius_m']}m")


if __name__ == "__main__":
    main()
