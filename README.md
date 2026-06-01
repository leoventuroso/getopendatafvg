# Montereale Valcellina Open

An open-source, serverless, and multi-modular Civic Tech platform designed for the territory of Montereale Valcellina (Friuli Venezia Giulia, Italy). This project provides tools for sustainable mobility, outdoor activities, environmental resilience, and community-driven data collection.

The platform relies on a 100% Jamstack architecture to ensure zero hosting costs, minimal maintenance overhead, and high client-side performance on both desktop and mobile browsers.

---

## Architecture

The system manages geographical and community data through a decentralized approach, eliminating the need for a traditional, always-on relational database:

* **Static Base Layer (PMTiles):** Cloud-optimized vector tiles containing road networks, mountain trails, contour lines, and regional flood risk layers. The frontend queries this file on-demand using HTTP Range Requests.
* **Dynamic Strata (DuckDB-Wasm):** An embedded DuckDB database file hosted statically and queried directly in the browser via WebAssembly. This layer handles crowdsourced data such as citizen suggestions, community votes, and local asset mapping. Write operations trigger asynchronous builds via automated GitHub Actions or lightweight serverless functions.
* **Frontend UI:** A responsive single-page application built with MapLibre GL for high-performance, hardware-accelerated map rendering.

---

## Platform Modules

The repository is structured around independent, decoupled modules to facilitate progressive development and modular contributions:

### 1. Outdoor & Cyclability
Interactive mapping of CAI hiking trails, mountain biking routes, and regional bike paths (such as the FVG3). It integrates the LTSBikePlan algorithm to evaluate urban traffic stress based on digital elevation models (DEM/LiDAR data), pavement status, and traffic flows. The module also indexes drinking water fountains and mountain springs.

### 2. Resilience & Civil Protection
Overlay of official hazard layers (such as hydraulic danger zones from the Regional Flood Directive) combined with real-time precipitation and hydrometric data fetched from the ARPA FVG public APIs. It includes a validation pipeline for citizen-reported urban drainage blockages or local flooding events.

### 3. Emergency Logistics & Health
Crowdsourced directory of Automated External Defibrillators (AEDs) documenting their exact location, access hours, and maintenance status. It also maps fire hydrants, emergency assembly points, and night-certified helicopter landing sites (HEMS) to assist Alpine Rescue and emergency response teams.

### 4. Community Participation
A lightweight reporting interface for urban planning suggestions, public infrastructure requests, and localized safety feedback. Residents can upvote proposals to generate structured feedback reports for local administrators.

### 5. Urban Forestry & Canopy Cover
Analysis of vegetation density and urban heat mitigation based on NDVI (Normalized Difference Vegetation Index) computed from Sentinel-2 satellite imagery. This data identifies natural shade corridors along streets and trails.

### 6. AI/ML Automation (Future Scope)
Integration of lightweight computer vision models (such as YOLO) to automatically classify and geolocate infrastructure hazards from citizen-submitted photographs, alongside predictive classification models for localized stormwater pooling.

---

## Directory Structure

* `/frontend`: The web application source code (UI component tree, MapLibre GL integration, and DuckDB-Wasm client).
* `/pipeline`: Python data-processing scripts (OpenStreetMap extraction, LTS network computations, Sentinel-2 raster processing, and PMTiles generation via Tippecanoe).
* `/functions`: Automated build tasks and webhook configurations handling asynchronous write operations back to the repository.

---

## Contributing

Contributions to data layers, frontend features, or processing pipelines are welcome. 
* To report bugs or suggest infrastructure features, please open an Issue.
* To submit code updates or localized dataset integrations, please submit a Pull Request targeted at the specific module directory.
