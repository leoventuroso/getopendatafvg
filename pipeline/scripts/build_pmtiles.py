"""Build PMTiles from root CSV (Fase 0).

Pipeline minima:
1) carica CSV con campo WKT `geometry`;
2) assegna CRS sorgente EPSG:32632 (UTM32N, coerente con il CSV LTS corrente);
3) riproietta in EPSG:4326;
4) esporta GeoJSON intermedio;
5) prova a generare `base_layers.pmtiles` con Tippecanoe.
"""

from pathlib import Path
from shutil import which
import subprocess

import geopandas as gpd
import pandas as pd
from shapely import wkt

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lib.dem_slope import DemSampler, enrich_geodataframe_with_slope
from lib.exclusions import CAO_MALNISIO_POLYGON

SOURCE_CRS = "EPSG:32632"
TARGET_CRS = "EPSG:4326"
DEM_PATH = Path(__file__).resolve().parents[2] / "frontend" / "src" / "data" / "w51075_s10.tif"


def main() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    csv_path = Path(__file__).resolve().parents[1] / "data" / "Montereale_Valcellina_all_lts.csv"
    output_dir = repo_root / "frontend" / "public" / "data"
    output_dir.mkdir(parents=True, exist_ok=True)

    geojson_path = output_dir / "transport.geojson"
    pmtiles_path = output_dir / "base_layers.pmtiles"

    if not csv_path.exists():
        raise FileNotFoundError(f"CSV non trovato: {csv_path}")

    df = pd.read_csv(csv_path)
    if "geometry" not in df.columns:
        raise ValueError("Colonna 'geometry' mancante nel CSV.")

    df = df.dropna(subset=["geometry"]).copy()
    df["geometry"] = df["geometry"].map(wkt.loads)

    gdf = gpd.GeoDataFrame(df, geometry="geometry", crs=SOURCE_CRS)
    excluded_polygon = gpd.GeoSeries([CAO_MALNISIO_POLYGON], crs="EPSG:4326").to_crs(SOURCE_CRS).iloc[0]
    gdf = gdf[~gdf.geometry.intersects(excluded_polygon)].copy()
    dem = DemSampler.from_file(DEM_PATH)
    gdf = enrich_geodataframe_with_slope(gdf, dem)
    gdf = gdf.to_crs(TARGET_CRS)
    gdf.to_file(geojson_path, driver="GeoJSON")

    bounds = gdf.total_bounds
    print(
        "[INFO] bounds WGS84 (minLon, minLat, maxLon, maxLat):",
        [round(float(v), 6) for v in bounds],
    )

    if which("tippecanoe") is None:
        print("[WARN] tippecanoe non installato.")
        print(f"[OK] GeoJSON pronto: {geojson_path}")
        print("[NEXT] Installa tippecanoe e riesegui per produrre PMTiles.")
        return

    cmd = [
        "tippecanoe",
        "--force",
        "-o",
        str(pmtiles_path),
        "-l",
        "transport",
        "-zg",
        "--drop-densest-as-needed",
        "--extend-zooms-if-still-dropping",
        str(geojson_path),
    ]
    subprocess.run(cmd, check=True)
    print(f"[OK] PMTiles creato: {pmtiles_path}")


if __name__ == "__main__":
    main()
