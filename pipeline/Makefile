PYTHON := python

SCRIPTS := scripts

.PHONY: help all base outdoor rescue green community

help:
	@echo "Montereale Valcellina — pipeline GIS"
	@echo ""
	@echo "Targets:"
	@echo "  make all        Run the full pipeline (all modules)"
	@echo "  make base       Frazioni boundaries + ISTAT stats"
	@echo "  make outdoor    Trails, water, bike infra, cyclepaths (Overpass + DEM)"
	@echo "  make rescue     Emergency assets (Overpass)"
	@echo "  make green      NDVI, NBR, LST, shade corridors (Sentinel-2 + LiDAR)"
	@echo "  make community  Initialise community_data.duckdb"
	@echo "  make tiles      PMTiles from LTS cycling CSV (requires Tippecanoe)"
	@echo ""
	@echo "Run 'make help' again after activating the virtualenv:"
	@echo "  python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"

all: base outdoor rescue green community tiles

base:
	$(PYTHON) $(SCRIPTS)/build_frazioni_geojson.py
	$(PYTHON) $(SCRIPTS)/fetch_istat_stats.py

outdoor:
	$(PYTHON) $(SCRIPTS)/build_outdoor_geojson.py
	$(PYTHON) $(SCRIPTS)/build_bike_infra_geojson.py
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
