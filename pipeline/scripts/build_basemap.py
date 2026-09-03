"""Build the dark vector basemap (planetiler + OpenMapTiles schema).

Produces `frontend/public/data/basemap_dark.pmtiles`: a full cartographic
basemap (buildings, water, landuse, roads, boundaries, labels), styled by
`frontend/src/lib/darkBasemapLayers.json` (Dark Matter style, adapted).

Not committed to git (~450 MB, past GitHub's 100 MB limit) - CI must run
this target before deploy. For another city/region, just change
REGION_PBF_URL to the matching Geofabrik extract.
"""

from pathlib import Path
from urllib.request import urlretrieve
import subprocess
import sys

REPO_ROOT = Path(__file__).resolve().parents[2]
TOOLS_DIR = REPO_ROOT / "pipeline" / "tools"
DATA_DIR = REPO_ROOT / "pipeline" / "data"
OUTPUT_PATH = REPO_ROOT / "frontend" / "public" / "data" / "basemap_dark.pmtiles"

PLANETILER_VERSION = "v0.10.2"
PLANETILER_URL = (
    f"https://github.com/onthegomap/planetiler/releases/download/"
    f"{PLANETILER_VERSION}/planetiler.jar"
)
PLANETILER_JAR = TOOLS_DIR / "planetiler.jar"

# Geofabrik regional extract covering the target city. Smallest region that
# contains it - for another city, pick its region from download.geofabrik.de.
REGION_PBF_URL = "https://download.geofabrik.de/europe/italy/nord-est-latest.osm.pbf"
REGION_PBF_PATH = DATA_DIR / "nord-est-latest.osm.pbf"


def ensure_file(path: Path, url: str, label: str) -> None:
    if path.exists():
        print(f"[OK] {label} already present: {path}")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    print(f"[INFO] Downloading {label} from {url} ...")
    urlretrieve(url, path)
    print(f"[OK] {label} downloaded: {path}")


def find_java() -> str:
    local_jdk = list(TOOLS_DIR.glob("jdk/*.jdk/Contents/Home/bin/java"))
    if local_jdk:
        return str(local_jdk[0])
    from shutil import which

    system_java = which("java")
    if system_java:
        return system_java
    raise FileNotFoundError(
        "No Java runtime found. Install one (Java 21+) or place a JDK under "
        "pipeline/tools/jdk/ (contents of a *-jdk_macos-*_bin.tar.gz)."
    )


def main() -> None:
    ensure_file(PLANETILER_JAR, PLANETILER_URL, "planetiler.jar")
    ensure_file(REGION_PBF_PATH, REGION_PBF_URL, "regional OSM extract")

    java = find_java()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        java,
        "-Xmx3g",
        "-jar",
        str(PLANETILER_JAR),
        "--download",
        f"--osm-path={REGION_PBF_PATH}",
        f"--output={OUTPUT_PATH}",
        "--force",
    ]
    print("[INFO] Running planetiler:", " ".join(cmd))
    result = subprocess.run(cmd, cwd=REPO_ROOT / "pipeline")
    if result.returncode != 0:
        sys.exit(result.returncode)

    print(f"[OK] Basemap built: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
