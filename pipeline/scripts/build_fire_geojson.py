"""Forest fire perimeters for the Soccorso ed Emergenza module.

Source: Regione Autonoma Friuli-Venezia Giulia, IRDAT FVG - "Perimetro degli
incendi boschivi" (dataset 1232). Perimeters digitised from the Fogli Notizie
Incendi Boschivi filed by the Stazioni Forestali, with GPS field surveys.
Served as open data from the regional GeoServer (WFS).

  WFS layer : ZONE_RISC:V_INCENDI_CT   (fire perimeters, polygons, 1990-)
  attributes: year, FNIB number, comune, locality, start date, duration,
              ignition place, natural constraints, vegetation state, cause

We filter by comune name (the layer carries a COMUNE attribute) and trim the
attributes to what the popup shows. Only FVG comuni get data; elsewhere the
query returns nothing and an empty FeatureCollection is written.

Output: frontend/public/data/rescue/fire_perimeters.geojson

CI-safe: a single HTTPS GET, no local data files.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lib.comune_config import COMUNE  # noqa: E402

WFS_URL = "https://serviziogc.regione.fvg.it/geoserver/ZONE_RISC/wfs"
LAYER = "ZONE_RISC:V_INCENDI_CT"

OUT_PATH = (
    Path(__file__).resolve().parents[2]
    / "frontend" / "public" / "data" / "rescue" / "fire_perimeters.geojson"
)

# CSV-ish source attribute -> output key. Everything else is dropped.
KEEP = {
    "CODICE": "codice",
    "ANNO_FNIB": "anno",
    "COMUNE": "comune",
    "LOCALITA": "localita",
    "DATA_INIZIO_FUOCO": "data_inizio",
    "DURATA": "durata",
    "LUOGO_INIZIO": "luogo_inizio",
    "VINCOLI_NATURALI": "vincoli_naturali",
    "STATO_VEGETAZIONE": "stato_vegetazione",
    "TIPO_CAUSE": "causa",
}

# Coarse cause class for filtering / colour, from the verbose TIPO_CAUSE text.
CAUSA_CLASS = {
    "Dolose (volontarie)": "dolosa",
    "Colpose": "colposa",
    "Naturali (fulmini)": "naturale",
    "Ignote (non classif.)": "ignota",
}


def fetch_perimeters(comune: str) -> list[dict]:
    query = urlencode({
        "service": "WFS",
        "version": "2.0.0",
        "request": "GetFeature",
        "typeNames": LAYER,
        "outputFormat": "application/json",
        "srsName": "EPSG:4326",
        "CQL_FILTER": f"COMUNE='{comune}'",
    })
    req = Request(f"{WFS_URL}?{query}", headers={"User-Agent": "mappa-civica-pipeline/1.0"})
    with urlopen(req, timeout=180) as response:
        data = json.load(response)
    return data.get("features", [])


def clean_feature(feature: dict, index: int) -> dict:
    src = feature.get("properties", {})
    props = {out: src[key] for key, out in KEEP.items() if src.get(key) not in (None, "")}
    for key in ("durata", "localita", "luogo_inizio", "stato_vegetazione", "vincoli_naturali"):
        if key in props and isinstance(props[key], str):
            props[key] = props[key].strip()
    if "data_inizio" in props:
        props["data_inizio"] = str(props["data_inizio"]).rstrip("Z")
    props["causa_classe"] = CAUSA_CLASS.get(props.get("causa", ""), "ignota")
    return {
        "type": "Feature",
        "id": index,
        "properties": props,
        "geometry": feature.get("geometry"),
    }


def main() -> None:
    comune = COMUNE["name"]
    region = COMUNE.get("region", "")

    features: list[dict] = []
    try:
        raw = fetch_perimeters(comune)
        features = [clean_feature(f, i + 1) for i, f in enumerate(raw)
                    if f.get("geometry")]
    except Exception as exc:  # network / service down: keep whatever is committed
        print(f"[warn] WFS fetch failed: {exc}", file=sys.stderr)
        if OUT_PATH.exists():
            print("[warn] keeping existing fire_perimeters.geojson", file=sys.stderr)
            return

    if not features and "Friuli" not in region:
        print(f"[note] {comune} is outside FVG - no IRDAT fire perimeters available",
              file=sys.stderr)

    features.sort(key=lambda f: (f["properties"].get("anno", 0), f["properties"].get("codice", "")))
    geojson = {
        "type": "FeatureCollection",
        "metadata": {
            "title": "Perimetro degli incendi boschivi",
            "source": "Regione Autonoma Friuli-Venezia Giulia - IRDAT FVG, "
                      "dataset 1232 (Fogli Notizie Incendi Boschivi, Stazioni Forestali)",
            "wfs": f"{WFS_URL} :: {LAYER}",
            "note": "Perimetri storici digitalizzati dai fogli notizie, non una mappa "
                    "previsionale di pericolosita. La precisione geometrica dei rilievi "
                    "piu vecchi e variabile.",
        },
        "features": features,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    # Compact: geometry coordinates dominate the file, pretty-printing triples it.
    OUT_PATH.write_text(json.dumps(geojson, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    years = [f["properties"]["anno"] for f in features if "anno" in f["properties"]]
    span = f"{min(years)}-{max(years)}" if years else "nessun dato"
    print(f"[OK] fire_perimeters.geojson: {len(features)} perimetri ({span})")


if __name__ == "__main__":
    main()
