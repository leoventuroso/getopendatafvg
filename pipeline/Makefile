PYTHON := python

SCRIPTS := scripts

.PHONY: help all base outdoor rescue green community basemap

help:
	@echo "Montereale Valcellina — pipeline GIS"
	@echo ""
	@echo "Targets (require full requirements.txt + local data files):"
	@echo "  make all        Full pipeline"
	@echo "  make base       Frazioni boundaries + ISTAT stats"
	@echo "  make outdoor    Trails, water, bike infra (Overpass + DEM .tif)"
	@echo "  make rescue     Emergency assets (Overpass)"
	@echo "  make green      NDVI, NBR, LST, shade corridors (Sentinel-2 + LiDAR)"
	@echo "  make community  Initialise community_data.duckdb"
	@echo "  make tiles      PMTiles from LTS CSV (requires Tippecanoe + DEM)"
	@echo "  make basemap    Dark vector basemap (planetiler + OpenMapTiles, ~450MB, needs Java 21+)"
	@echo ""
	@echo "CI-safe targets (run in GitHub Actions, no local data needed):"
	@echo "  make rescue     Emergency assets (Overpass only)"
	@echo "  make cyclepaths Bike cyclepaths from committed transport.geojson"
	@echo "  make base       Frazioni (Nominatim) + ISTAT stats (public API)"
	@echo "  make community  Initialise DuckDB"
	@echo ""
	@echo "Setup: python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"

all: base outdoor cyclepaths rescue green community tiles

base:
	$(PYTHON) $(SCRIPTS)/build_frazioni_geojson.py
	$(PYTHON) $(SCRIPTS)/fetch_istat_stats.py

outdoor:
	$(PYTHON) $(SCRIPTS)/build_outdoor_geojson.py
	$(PYTHON) $(SCRIPTS)/build_bike_infra_geojson.py

cyclepaths:
	$(PYTHON) $(SCRIPTS)/build_bike_cyclepaths_geojson.py

rescue:
	$(PYTHON) $(SCRIPTS)/build_rescue_geojson.py

green:
	$(PYTHON) $(SCRIPTS)/process_green_layers.py
	$(PYTHON) $(SCRIPTS)/process_nbr.py
	$(PYTHON) $(SCRIPTS)/process_lst.py
	$(PYTHON) $(SCRIPTS)/process_shade_corridors.py

community:
	$(PYTHON) $(SCRIPTS)/init_duckdb.py

tiles:
	$(PYTHON) $(SCRIPTS)/build_pmtiles.py

basemap:
	$(PYTHON) $(SCRIPTS)/build_basemap.py
