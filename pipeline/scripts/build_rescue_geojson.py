"""Build rescue/operational assets from OSM when available.

Fallback strategy:
- try to fetch real OSM features for AED, HEMS, fire hydrants and assembly points
- if OSM returns nothing or the request fails, keep the existing placeholder files
"""

from __future__ import annotations

import json
from pathlib import Path
from urllib.request import Request, urlopen

from shapely.geometry import shape

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lib.comune_config import AREA_ID
from lib.exclusions import geometry_is_excluded


OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]


def overpass(query: str) -> dict:
    last_error = None
    for url in OVERPASS_URLS:
        try:
            req = Request(
                url,
                data=query.encode("utf-8"),
                headers={"User-Agent": "OpenCode/1.0"},
            )
            with urlopen(req, timeout=180) as response:
                return json.load(response)
        except Exception as exc:  # pragma: no cover - network fallback
            last_error = exc
    raise last_error  # type: ignore[misc]


def feature_from_element(element: dict, class_name: str) -> dict:
    tags = element.get("tags", {})
    if element.get("type") == "node":
        geometry = {"type": "Point", "coordinates": [element["lon"], element["lat"]]}
    else:
        center = element.get("center")
        if center:
            geometry = {"type": "Point", "coordinates": [center["lon"], center["lat"]]}
        else:
            geometry = {"type": "Point", "coordinates": [0.0, 0.0]}

    properties = {
        "class": class_name,
        "name": tags.get("name"),
        "name:it": tags.get("name:it"),
        "source": "overpass",
        "osm_id": element.get("id"),
    }

    for key in (
        "amenity",
        "emergency",
        "aeroway",
        "access",
        "operator",
        "capacity",
        "fire_hydrant:type",
        "fire_hydrant:position",
        "ref",
        "description",
    ):
        if key in tags:
            properties[key] = tags[key]

    return {"type": "Feature", "properties": properties, "geometry": geometry}


def fetch_feature_collection(query: str, class_name: str, fallback_path: Path) -> list[dict]:
    try:
        data = overpass(query)
        features = [feature_from_element(element, class_name) for element in data.get("elements", [])]
        features = [feature for feature in features if not geometry_is_excluded(shape(feature["geometry"]))]
        if features:
            return features
    except Exception:
        pass

    if fallback_path.exists():
        return json.loads(fallback_path.read_text()).get("features", [])

    return []


def main() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    out_dir = repo_root / "frontend" / "public" / "data" / "rescue"
    out_dir.mkdir(parents=True, exist_ok=True)

    queries = {
        "aed": f"""
        [out:json][timeout:180];
        area({AREA_ID})->.a;
        (
          node(area.a)[amenity=defibrillator];
        );
        out tags center;
        """,
        "hems": f"""
        [out:json][timeout:180];
        area({AREA_ID})->.a;
        (
          node(area.a)[aeroway=helipad];
          way(area.a)[aeroway=helipad];
          relation(area.a)[aeroway=helipad];
          node(area.a)[emergency=helipad];
          way(area.a)[emergency=helipad];
          relation(area.a)[emergency=helipad];
        );
        out tags center;
        """,
        "fire_hydrants": f"""
        [out:json][timeout:180];
        area({AREA_ID})->.a;
        (
          node(area.a)[emergency=fire_hydrant];
          way(area.a)[emergency=fire_hydrant];
          relation(area.a)[emergency=fire_hydrant];
        );
        out tags center;
        """,
        "emergency_assembly_points": f"""
        [out:json][timeout:180];
        area({AREA_ID})->.a;
        (
          node(area.a)[emergency=assembly_point];
          way(area.a)[emergency=assembly_point];
          relation(area.a)[emergency=assembly_point];
        );
        out tags center;
        """,
    }

    outputs = {
        "aed": ("aed.geojson", "defibrillator"),
        "hems": ("hems.geojson", "hems"),
        "fire_hydrants": ("fire_hydrants.geojson", "fire_hydrant"),
        "emergency_assembly_points": ("emergency_assembly_points.geojson", "assembly_point"),
    }

    for key, (filename, class_name) in outputs.items():
        fallback_path = out_dir / filename
        features = fetch_feature_collection(queries[key], class_name, fallback_path)
        geojson = {"type": "FeatureCollection", "features": features}
        fallback_path.write_text(json.dumps(geojson, ensure_ascii=False))
        print(f"[OK] {filename}: {len(features)} features")


if __name__ == "__main__":
    main()
