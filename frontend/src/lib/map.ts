import * as maplibregl from 'maplibre-gl';
import type { Map, IControl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { jsPDF } from 'jspdf';
import { APP_CONFIG } from '../config';

// Vite's production build doesn't emit maplibre-gl's worker as a
// same-origin asset by default (only `optimizeDeps.exclude` in
// vite.config.ts fixes the dev server) — without this, the worker 404s in
// `npm run build` output, tile parsing never starts, and the map renders
// only the low-zoom background raster forever. Importing it as a `?url`
// asset makes Vite copy it into dist/assets/ and gives us its real URL.
maplibregl.setWorkerUrl(maplibreWorkerUrl);

export type MapModule = 'base' | 'outdoor' | 'rescue' | 'green' | 'community';
type OutdoorSection = 'cyclability' | 'trails';
type CyclabilitySubsection = 'lts' | 'bike-infra' | 'routing';
type TrailsSubsection = 'trails' | 'slope' | 'routing';

type CreateBaseMapOptions = {
  module: MapModule;
  outdoorSection?: OutdoorSection | null;
  cyclabilitySubsection?: CyclabilitySubsection | null;
  trailsSubsection?: TrailsSubsection | null;
};

// Live basemap styles from Maptoolkit — the same tile+style service the
// integrated stressinbici.it (LTS) map uses, so the look is consistent and
// switchable the same way. "estivo" (summer) is the default.
type BasemapStyleKey = 'light' | 'summer' | 'cycling' | 'dark';

const BASEMAP_STYLE_URLS: Record<BasemapStyleKey, string> = {
  light: 'https://styles.maptoolkit.org/light.json',
  summer: 'https://styles.maptoolkit.org/summer.json',
  cycling: 'https://styles.maptoolkit.org/cycling.json',
  dark: 'https://styles.maptoolkit.org/dark.json'
};

// Same labels as the integrated LTS map's background switcher (plain text,
// no icons there either).
const BASEMAP_STYLE_LABELS: Record<BasemapStyleKey, string> = {
  light: 'Sfondo chiaro',
  summer: 'Sfondo estivo',
  cycling: 'Sfondo ciclabile',
  dark: 'Sfondo scuro'
};

const DEFAULT_BASEMAP_STYLE: BasemapStyleKey = 'summer';

// Free public terrarium-encoded DEM (same source the integrated LTS map uses)
// — kept as our own overlay source so 3D terrain works regardless of which
// Maptoolkit style is currently active (their raster-dem source names differ
// between styles).
const TERRAIN_SOURCE_ID = 'mapterhorn-dem';

function addTrailLayers(
  layers: maplibregl.StyleSpecification['layers'],
  sourceId: string,
  categoryId: string,
  filter: maplibregl.FilterSpecification,
  options: {
    casingColor: string;
    lineColor: string;
    labelColor: string;
    dasharray: number[];
  }
): void {
  layers.push({
    id: `trail-casing-${categoryId}`,
    type: 'line',
    source: sourceId,
    filter,
    paint: {
      'line-color': options.casingColor,
      'line-width': ['interpolate', ['linear'], ['zoom'], 11, 3.4, 14, 7.8],
      'line-opacity': 0.9
    }
  });

  layers.push({
    id: `trail-network-${categoryId}`,
    type: 'line',
    source: sourceId,
    filter,
    paint: {
      'line-color': options.lineColor,
      'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.9, 14, 2.4],
      'line-opacity': 1,
      'line-dasharray': options.dasharray
    }
  });

  layers.push({
    id: `trail-labels-${categoryId}`,
    type: 'symbol',
    source: sourceId,
    filter,
    layout: {
      'symbol-placement': 'line',
      'text-field': ['coalesce', ['get', 'name:it'], ['get', 'name'], ''],
      'text-size': ['interpolate', ['linear'], ['zoom'], 12, 10, 15, 13],
      'text-font': ['Noto Sans Regular']
    },
    paint: {
      'text-color': options.labelColor,
      'text-halo-color': '#ffffff',
      'text-halo-width': 1.8
    }
  });
}

function addWaterLayers(
  layers: maplibregl.StyleSpecification['layers'],
  sourceId: string,
  categoryId: string,
  filter: maplibregl.FilterSpecification,
  color: string
): void {
  layers.push({
    id: `water-poi-${categoryId}`,
    type: 'circle',
    source: sourceId,
    filter,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 3, 15, 7],
      'circle-color': color,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1.5,
      'circle-opacity': 0.95
    }
  });

  layers.push({
    id: `water-poi-labels-${categoryId}`,
    type: 'symbol',
    source: sourceId,
    filter,
    layout: {
      'text-field': ['coalesce', ['get', 'name:it'], ['get', 'name'], ''],
      'text-offset': [0, 1.2],
      'text-size': ['interpolate', ['linear'], ['zoom'], 12, 9, 15, 12],
      'text-font': ['Noto Sans Regular']
    },
    paint: {
      'text-color': '#7a4d00',
      'text-halo-color': '#ffffff',
      'text-halo-width': 1.2
    }
  });
}

function addBikeInfraLayers(
  layers: maplibregl.StyleSpecification['layers'],
  sourceId: string,
  categoryId: string,
  filter: maplibregl.FilterSpecification,
  color: string
): void {
  layers.push({
    id: `bike-infra-${categoryId}`,
    type: 'circle',
    source: sourceId,
    filter,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 4, 15, 9],
      'circle-color': color,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1.5,
      'circle-opacity': 0.95
    }
  });
}

function addEmergencyLayers(
  layers: maplibregl.StyleSpecification['layers'],
  sourceId: string,
  layerId: string,
  labelId: string,
  color: string,
  labelColor: string,
  filter: maplibregl.FilterSpecification = ['all']
): void {
  layers.push({
    id: layerId,
    type: 'circle',
    source: sourceId,
    filter,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 5, 15, 10],
      'circle-color': color,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1.6,
      'circle-opacity': 0.95
    }
  });

  layers.push({
    id: labelId,
    type: 'symbol',
    source: sourceId,
    filter,
    layout: {
      'text-field': ['coalesce', ['get', 'name:it'], ['get', 'name'], ''],
      'text-offset': [0, 1.15],
      'text-size': ['interpolate', ['linear'], ['zoom'], 12, 9, 15, 12],
      'text-font': ['Noto Sans Regular']
    },
    paint: {
      'text-color': labelColor,
      'text-halo-color': '#ffffff',
      'text-halo-width': 1.5
    }
  });
}

function addRiskFillLayers(
  layers: maplibregl.StyleSpecification['layers'],
  sourceId: string,
  fillLayerId: string,
  outlineLayerId: string,
  color: string,
  label: string,
  labelOffset: [number, number] = [0, 0]
): void {
  layers.push({
    id: fillLayerId,
    type: 'fill',
    source: sourceId,
    paint: {
      'fill-color': color,
      'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.36, 0.22],
      'fill-outline-color': color
    }
  });

  layers.push({
    id: outlineLayerId,
    type: 'line',
    source: sourceId,
    paint: {
      'line-color': color,
      'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 3.5, 2],
      'line-dasharray': [2, 1]
    }
  });

  layers.push({
    id: `${fillLayerId}-label`,
    type: 'symbol',
    source: sourceId,
    layout: {
      'text-field': label,
      'text-size': 11,
      'text-font': ['Noto Sans Regular'],
      'text-offset': labelOffset
    },
    paint: {
      'text-color': color,
      'text-halo-color': '#ffffff',
      'text-halo-width': 1.5
    }
  });
}

function addSlopeLayer(
  layers: maplibregl.StyleSpecification['layers'],
  sourceId: string,
  layerId: string
): void {
  layers.push({
    id: layerId,
    type: 'line',
    source: sourceId,
    filter: ['has', 'slope_class'],
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': getSlopeColorExpression(),
      'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1.4, 14, 4.2],
      'line-opacity': 0.95
    }
  });
}

function getSlopeColorExpression(): maplibregl.ExpressionSpecification {
  return [
    'match',
    ['get', 'slope_class'],
    '0-3: flat', '#2b8a3e',
    '3-5: mild', '#74c69d',
    '5-8: medium', '#ffd43b',
    '8-10: hard', '#ff922b',
    '10-20: extreme', '#e03131',
    '>20: impossible', '#7f1d1d',
    '#adb5bd'
  ];
}

// Everything EXCEPT the basemap itself: our own module-specific sources and
// layers, re-applied after every style load (initial load and every style
// switch both fire 'style.load', which wipes anything not part of the new
// style document).
function buildOverlayAdditions(options: CreateBaseMapOptions): {
  sources: maplibregl.StyleSpecification['sources'];
  layers: maplibregl.StyleSpecification['layers'];
} {
  const isOutdoorModule = options.module === 'outdoor';
  const isRescueModule = options.module === 'rescue';
  const isGreenModule = options.module === 'green';
  const outdoorSection = options.outdoorSection ?? null;
  const cyclabilitySubsection = options.cyclabilitySubsection ?? null;
  const trailsSubsection = options.trailsSubsection ?? null;

  const sources: maplibregl.StyleSpecification['sources'] = {
    [TERRAIN_SOURCE_ID]: {
      type: 'raster-dem',
      tiles: ['https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'],
      tileSize: 512,
      encoding: 'terrarium',
      maxzoom: 13
    }
  };

  if (options.module === 'base') {
    sources.municipalityBoundary = {
      type: 'geojson',
      data: `${import.meta.env.BASE_URL}data/boundary.geojson`
    };
  }

  if (isRescueModule) {
    sources.aed = {
      type: 'geojson',
      generateId: true,
      data: `${import.meta.env.BASE_URL}data/rescue/aed.geojson`
    };
    sources.hems = {
      type: 'geojson',
      generateId: true,
      data: `${import.meta.env.BASE_URL}data/rescue/hems.geojson`
    };
    sources.fireHydrants = {
      type: 'geojson',
      generateId: true,
      data: `${import.meta.env.BASE_URL}data/rescue/fire_hydrants.geojson`
    };
    sources.assemblyPoints = {
      type: 'geojson',
      generateId: true,
      data: `${import.meta.env.BASE_URL}data/rescue/emergency_assembly_points.geojson`
    };
    sources.hydraulicRisk = {
      type: 'geojson',
      generateId: true,
      data: `${import.meta.env.BASE_URL}data/rescue/hydraulic_risk.geojson`
    };
    sources.landslideRisk = {
      type: 'geojson',
      generateId: true,
      data: `${import.meta.env.BASE_URL}data/rescue/landslide_risk.geojson`
    };
  }

  if (isOutdoorModule && outdoorSection === 'trails' && trailsSubsection === 'trails') {
    sources.trails = {
      type: 'geojson',
      data: `${import.meta.env.BASE_URL}data/outdoor/trails_shaded.geojson`
    };
    sources.water = {
      type: 'geojson',
      data: `${import.meta.env.BASE_URL}data/outdoor/water.geojson`
    };
  }

  if (isOutdoorModule && outdoorSection === 'trails' && trailsSubsection === 'slope') {
    sources.trailsRouting = {
      type: 'geojson',
      data: `${import.meta.env.BASE_URL}data/outdoor/trails_routing.geojson`
    };
  }

  if (isOutdoorModule && outdoorSection === 'cyclability' && cyclabilitySubsection === 'bike-infra') {
    sources.cyclepaths = {
      type: 'geojson',
      data: `${import.meta.env.BASE_URL}data/outdoor/bike_cyclepaths.geojson`
    };
    sources.bikeInfra = {
      type: 'geojson',
      data: `${import.meta.env.BASE_URL}data/outdoor/bike_infra.geojson`
    };
  }

  if (isOutdoorModule) {
    sources.route = {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    };
  }

  if (isGreenModule) {
    sources.greenery = {
      type: 'geojson',
      data: `${import.meta.env.BASE_URL}data/greenery.geojson`
    };
    sources.shadeCorridors = {
      type: 'geojson',
      data: `${import.meta.env.BASE_URL}data/shade_corridors.geojson`
    };
    sources.lst = {
      type: 'geojson',
      data: `${import.meta.env.BASE_URL}data/lst.geojson`
    };
    sources.nbr = {
      type: 'geojson',
      data: `${import.meta.env.BASE_URL}data/nbr.geojson`
    };
  }

  if (options.module === 'community') {
    sources.municipalityBoundary = {
      type: 'geojson',
      data: `${import.meta.env.BASE_URL}data/boundary.geojson`
    };
  }

  const layers: maplibregl.StyleSpecification['layers'] = [];

  if (options.module === 'base') {
    layers.push({
      id: 'boundary-fill',
      type: 'fill',
      source: 'municipalityBoundary',
      paint: {
        'fill-color': '#4a90d9',
        'fill-opacity': 0.06
      }
    });
    layers.push({
      id: 'boundary-outline',
      type: 'line',
      source: 'municipalityBoundary',
      paint: {
        'line-color': '#2563a8',
        'line-width': 2,
        'line-opacity': 0.7,
        'line-dasharray': [4, 3]
      }
    });
  }

  if (isOutdoorModule) {
    if (outdoorSection === 'cyclability' && cyclabilitySubsection === 'bike-infra') {
      layers.push({
        id: 'bike-lane-casing',
        type: 'line',
        source: 'cyclepaths',
        paint: {
          'line-color': '#d9e7f4',
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 3.2, 14, 6.6],
          'line-opacity': 0.95
        }
      });

      layers.push({
        id: 'bike-lane-network',
        type: 'line',
        source: 'cyclepaths',
        paint: {
          'line-color': '#2f78c4',
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1.2, 14, 3.2],
          'line-opacity': 1,
          'line-dasharray': [1, 0]
        }
      });

      layers.push({
        id: 'bike-lane-labels',
        type: 'symbol',
        source: 'cyclepaths',
        layout: {
          'symbol-placement': 'line',
          'text-field': ['coalesce', ['get', 'name:it'], ['get', 'name'], ['get', 'ref'], ''],
          'text-size': ['interpolate', ['linear'], ['zoom'], 12, 10, 15, 13],
          'text-font': ['Noto Sans Regular']
        },
        paint: {
          'text-color': '#245c99',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5
        }
      });

      addBikeInfraLayers(layers, 'bikeInfra', 'bike-parking', ['==', ['get', 'class'], 'bike_parking'], '#2f78c4');
      addBikeInfraLayers(layers, 'bikeInfra', 'bike-rental', ['==', ['get', 'class'], 'bike_rental'], '#2b8a3e');
      addBikeInfraLayers(layers, 'bikeInfra', 'bike-repair', ['==', ['get', 'class'], 'bike_repair'], '#7b2cbf');
      addBikeInfraLayers(layers, 'bikeInfra', 'ebike-charging', ['==', ['get', 'class'], 'ebike_charging'], '#f59f00');
    }

    if (outdoorSection === 'trails' && trailsSubsection === 'slope') {
      addSlopeLayer(layers, 'trailsRouting', 'slope-network-trails');
    }

    if (outdoorSection === 'trails' && trailsSubsection === 'trails') {
      addTrailLayers(
        layers,
        'trails',
        'hiking',
        ['in', ['get', 'class'], ['literal', ['path', 'track', 'bridleway']]],
        {
          casingColor: '#dfe9d8',
          lineColor: '#4f7b3a',
          labelColor: '#436432',
          dasharray: [1, 0]
        }
      );
      addTrailLayers(
        layers,
        'trails',
        'mtb',
        ['in', ['get', 'class'], ['literal', ['track', 'cycleway']]],
        {
          casingColor: '#d9e7f4',
          lineColor: '#2f78c4',
          labelColor: '#245c99',
          dasharray: [1.8, 1]
        }
      );
    }

    if (outdoorSection === 'trails' && trailsSubsection === 'trails') {
      addWaterLayers(layers, 'water', 'drinking-water', ['==', ['get', 'class'], 'drinking_water'], '#2b8a3e');
      addWaterLayers(layers, 'water', 'spring', ['==', ['get', 'class'], 'spring'], '#74c0fc');
      addWaterLayers(
        layers,
        'water',
        'picnic',
        ['in', ['get', 'class'], ['literal', ['picnic_site', 'picnic_area']]],
        '#f59f00'
      );
    }

    layers.push({
      id: 'route-line',
      type: 'line',
      source: 'route',
      filter: ['==', ['geometry-type'], 'LineString'],
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#e8590c',
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 3.5, 14, 6],
        'line-opacity': 0.9
      }
    });

    layers.push({
      id: 'route-points',
      type: 'circle',
      source: 'route',
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-radius': ['match', ['get', 'kind'], 'start', 6, 'end', 6, 5],
        'circle-color': [
          'match',
          ['get', 'kind'],
          'start',
          '#2b8a3e',
          'end',
          '#e03131',
          '#f59f00'
        ],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2
      }
    });

    layers.push({
      id: 'route-point-labels',
      type: 'symbol',
      source: 'route',
      filter: ['==', ['geometry-type'], 'Point'],
      layout: {
        'text-field': ['get', 'label'],
        'text-offset': [0, 1.1],
        'text-size': 11,
        'text-font': ['Noto Sans Regular']
      },
      paint: {
        'text-color': '#132034',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5
      }
    });
  }

  if (isGreenModule) {
    layers.push({
      id: 'greenery-fill',
      type: 'fill',
      source: 'greenery',
      paint: {
        'fill-color': [
          'match',
          ['get', 'ndvi_class'],
          'water',      '#4a90d9',
          'bare',       '#c9a96e',
          'sparse',     '#a8d08d',
          'moderate',   '#5aaa5a',
          'dense',      '#238b45',
          'very_dense', '#004d20',
          '#cccccc'
        ],
        'fill-opacity': [
          'match', ['get', 'ndvi_class'],
          'bare', 0.15,
          0.45
        ]
      }
    });

    layers.push({
      id: 'greenery-outline',
      type: 'line',
      source: 'greenery',
      paint: {
        'line-color': '#ffffff',
        'line-width': 0.3,
        'line-opacity': 0.4
      }
    });

    layers.push({
      id: 'nbr-fill',
      type: 'fill',
      source: 'nbr',
      layout: { visibility: 'none' },
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': 0.65
      }
    });

    layers.push({
      id: 'nbr-outline',
      type: 'line',
      source: 'nbr',
      layout: { visibility: 'none' },
      paint: {
        'line-color': '#ffffff',
        'line-width': 0.3,
        'line-opacity': 0.4
      }
    });

    layers.push({
      id: 'lst-fill',
      type: 'fill',
      source: 'lst',
      layout: { visibility: 'none' },
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': 0.65
      }
    });

    layers.push({
      id: 'lst-outline',
      type: 'line',
      source: 'lst',
      layout: { visibility: 'none' },
      paint: {
        'line-color': '#ffffff',
        'line-width': 0.3,
        'line-opacity': 0.4
      }
    });

    layers.push({
      id: 'shade-corridors-casing',
      type: 'line',
      source: 'shadeCorridors',
      layout: { visibility: 'none' },
      paint: {
        'line-color': '#ffffff',
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 3.5, 15, 7.5],
        'line-opacity': 0.7
      }
    });

    layers.push({
      id: 'shade-corridors',
      type: 'line',
      source: 'shadeCorridors',
      layout: { visibility: 'none' },
      paint: {
        'line-color': [
          'match', ['get', 'type'],
          'road', '#1a7f3c',
          '#52b788'
        ],
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1.8, 15, 4.5],
        'line-opacity': [
          'interpolate', ['linear'],
          ['get', 'shade_pct'],
          20, 0.55,
          100, 0.95
        ]
      }
    });
  }

  if (isRescueModule) {
    addRiskFillLayers(layers, 'hydraulicRisk', 'hydraulic-risk-fill', 'hydraulic-risk-outline', '#1c7ed6', 'Rischio idraulico P2', [0, 0]);
    addRiskFillLayers(layers, 'landslideRisk', 'landslide-risk-fill', 'landslide-risk-outline', '#e8590c', 'Frana storica', [0, 0]);
    addEmergencyLayers(layers, 'aed', 'aed-sites', 'aed-labels', '#e03131', '#7f1d1d');
    addEmergencyLayers(layers, 'hems', 'hems-sites', 'hems-labels', '#f59f00', '#7a4d00');
    addEmergencyLayers(layers, 'fireHydrants', 'fire-hydrant-sites', 'fire-hydrant-labels', '#0b7285', '#0b4f61');
    addEmergencyLayers(layers, 'assemblyPoints', 'assembly-point-sites', 'assembly-point-labels', '#2f9e44', '#1b5e20');
  }

  if (options.module === 'community') {
    layers.push({
      id: 'boundary-fill',
      type: 'fill',
      source: 'municipalityBoundary',
      paint: {
        'fill-color': '#4a90d9',
        'fill-opacity': 0.06
      }
    });
    layers.push({
      id: 'boundary-outline',
      type: 'line',
      source: 'municipalityBoundary',
      paint: {
        'line-color': '#2563a8',
        'line-width': 2,
        'line-opacity': 0.7,
        'line-dasharray': [4, 3]
      }
    });
  }

  return { sources, layers };
}

// --- Custom controls (style switcher, search, print) -----------------------

class MapStyleControl implements IControl {
  private container?: HTMLDivElement;
  private current: BasemapStyleKey;

  constructor(initial: BasemapStyleKey) {
    this.current = initial;
  }

  onAdd(map: Map): HTMLElement {
    const container = document.createElement('div');
    container.className = 'maplibregl-ctrl maplibregl-ctrl-group map-style-switcher';

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'map-style-switcher-header';

    const title = document.createElement('span');
    title.textContent = 'Legenda';

    const toggleIcon = document.createElement('span');
    toggleIcon.className = 'map-style-switcher-toggle-icon';
    toggleIcon.textContent = '−';
    toggleIcon.setAttribute('aria-hidden', 'true');

    header.appendChild(title);
    header.appendChild(toggleIcon);

    const body = document.createElement('div');
    body.className = 'map-style-switcher-body';

    header.addEventListener('click', () => {
      const collapsed = container.classList.toggle('collapsed');
      toggleIcon.textContent = collapsed ? '+' : '−';
      header.setAttribute('aria-expanded', String(!collapsed));
    });
    header.setAttribute('aria-expanded', 'true');

    container.appendChild(header);

    (Object.keys(BASEMAP_STYLE_URLS) as BasemapStyleKey[]).forEach((key) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.title = BASEMAP_STYLE_LABELS[key];
      button.setAttribute('aria-label', BASEMAP_STYLE_LABELS[key]);
      if (key === this.current) button.classList.add('active');
      button.textContent = BASEMAP_STYLE_LABELS[key];
      button.addEventListener('click', () => {
        if (key === this.current) return;
        this.current = key;
        body.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
        button.classList.add('active');
        map.setStyle(BASEMAP_STYLE_URLS[key]);
      });
      body.appendChild(button);
    });

    container.appendChild(body);

    this.container = container;
    return container;
  }

  onRemove(): void {
    this.container?.parentNode?.removeChild(this.container);
  }
}

// Same Nominatim geocoder as the integrated LTS map: jsonv2, restricted to
// Italy, fitBounds on the result's own bounding box (not a fixed zoom),
// closes on an outside click, drops stale out-of-order responses.
const MAX_SEARCH_RESULT_ZOOM = 17;

class MapSearchControl implements IControl {
  private container?: HTMLDivElement;
  private button?: HTMLButtonElement;
  private panel?: HTMLDivElement;
  private input?: HTMLInputElement;
  private resultsList?: HTMLDivElement;
  private debounceHandle?: number;
  private requestId = 0;
  private outsideClickHandler?: (e: MouseEvent) => void;

  onAdd(map: Map): HTMLElement {
    const container = document.createElement('div');
    container.className = 'maplibregl-ctrl maplibregl-ctrl-group map-search-ctrl';

    const button = document.createElement('button');
    button.type = 'button';
    button.title = 'Cerca un indirizzo o un luogo';
    button.setAttribute('aria-label', 'Cerca un indirizzo o un luogo');
    button.textContent = '🔍';
    button.addEventListener('click', () => this.toggle());

    const panel = document.createElement('div');
    panel.className = 'map-search-panel hidden';

    const input = document.createElement('input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.setAttribute('aria-label', 'Cerca indirizzo o luogo');

    const resultsList = document.createElement('div');
    resultsList.className = 'map-search-results hidden';

    input.addEventListener('input', () => this.onInput(map));

    this.outsideClickHandler = (e: MouseEvent) => {
      if (!container.contains(e.target as Node)) this.close();
    };
    document.addEventListener('click', this.outsideClickHandler);

    panel.appendChild(input);
    panel.appendChild(resultsList);
    container.appendChild(button);
    container.appendChild(panel);

    this.container = container;
    this.button = button;
    this.panel = panel;
    this.input = input;
    this.resultsList = resultsList;
    return container;
  }

  onRemove(): void {
    this.container?.parentNode?.removeChild(this.container);
    if (this.outsideClickHandler) document.removeEventListener('click', this.outsideClickHandler);
  }

  private toggle(): void {
    if (this.panel?.classList.contains('hidden')) this.open(); else this.close();
  }

  private open(): void {
    this.panel?.classList.remove('hidden');
    this.button?.classList.add('active');
    this.input?.focus();
  }

  private close(): void {
    this.panel?.classList.add('hidden');
    this.button?.classList.remove('active');
    this.hideResults();
  }

  private hideResults(): void {
    this.resultsList?.classList.add('hidden');
    if (this.resultsList) this.resultsList.innerHTML = '';
  }

  private onInput(map: Map): void {
    window.clearTimeout(this.debounceHandle);
    const query = this.input?.value.trim() ?? '';
    if (query.length < 3) {
      this.hideResults();
      return;
    }
    this.debounceHandle = window.setTimeout(() => this.search(map, query), 400);
  }

  private async search(map: Map, query: string): Promise<void> {
    const requestId = ++this.requestId;
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('q', query);
    url.searchParams.set('countrycodes', 'it');
    url.searchParams.set('limit', '6');
    url.searchParams.set('accept-language', 'it');

    type NominatimResult = { display_name: string; boundingbox: [string, string, string, string] };
    let results: NominatimResult[];
    try {
      const response = await fetch(url);
      results = await response.json();
    } catch {
      return;
    }
    // A newer keystroke already triggered another request while this one
    // was in flight — drop this stale response instead of racing it into
    // the dropdown out of order.
    if (requestId !== this.requestId || !this.resultsList) return;

    this.resultsList.innerHTML = '';
    if (!results.length) {
      this.hideResults();
      return;
    }
    for (const result of results) {
      const item = document.createElement('div');
      item.className = 'map-search-result-item';
      item.textContent = result.display_name;
      item.addEventListener('click', () => {
        // Nominatim's boundingbox is [south, north, west, east] as strings;
        // fitBounds wants [[west, south], [east, north]] as numbers.
        const [south, north, west, east] = result.boundingbox.map(Number);
        map.fitBounds([[west, south], [east, north]], { padding: 60, maxZoom: MAX_SEARCH_RESULT_ZOOM, duration: 800 });
        if (this.input) this.input.value = result.display_name;
        this.close();
      });
      this.resultsList.appendChild(item);
    }
    this.resultsList.classList.remove('hidden');
  }
}

// Custom (not MapLibre's built-in TerrainControl) to match the integrated
// LTS map's own terrain button exactly — same 🏔️ emoji icon, same toggle.
// `setStyle()` (the basemap switcher) replaces the whole style document,
// which silently drops `map.setTerrain(...)` — the camera stays tilted but
// the relief disappears until re-toggled. `onTerrainChange` lets the caller
// track the on/off flag outside this control and restore it after every
// style load (see createBaseMap's 'style.load' handler).
class MapTerrainControl implements IControl {
  private container?: HTMLDivElement;
  private onTerrainChange: (on: boolean) => void;

  constructor(onTerrainChange: (on: boolean) => void) {
    this.onTerrainChange = onTerrainChange;
  }

  onAdd(map: Map): HTMLElement {
    const container = document.createElement('div');
    container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

    const button = document.createElement('button');
    button.type = 'button';
    button.title = 'Terreno 3D';
    button.setAttribute('aria-label', 'Terreno 3D');
    button.textContent = '🏔️';
    button.addEventListener('click', () => {
      const isOn = !!map.getTerrain();
      const nextOn = !isOn;
      map.setTerrain(nextOn ? { source: TERRAIN_SOURCE_ID, exaggeration: 1.3 } : null);
      button.classList.toggle('active', nextOn);
      // Exaggeration is nearly invisible from a straight-down view — tilt
      // the camera along with the toggle, same as the integrated LTS map.
      map.easeTo({ pitch: nextOn ? 60 : 0, duration: 800 });
      this.onTerrainChange(nextOn);
    });

    container.appendChild(button);
    this.container = container;
    return container;
  }

  onRemove(): void {
    this.container?.parentNode?.removeChild(this.container);
  }
}

// Ground resolution (metres per CSS pixel) of standard Web Mercator tiles at
// a given latitude/zoom — same formula behind every slippy-map scale bar.
// Used to turn the on-screen map into a real cartographic scale ("1:25 000")
// once it's placed at a known physical size on the PDF page.
function metersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

function formatCoord(value: number, positiveSuffix: string, negativeSuffix: string): string {
  return `${Math.abs(value).toFixed(4)}°${value >= 0 ? positiveSuffix : negativeSuffix}`;
}

// Same PDF layout as the integrated LTS map's print button (real A4 page,
// title, scale bar, centre coordinates, attribution footer) — minus its
// LTS-specific colour legend, which doesn't carry over to our other modules.
function exportMapToPdf(map: Map, moduleLabel: string): void {
  const canvas = map.getCanvas();
  const imgData = canvas.toDataURL('image/png');
  const orientation = canvas.width >= canvas.height ? 'l' : 'p';
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const titleHeight = 12;
  const footerHeight = 12;

  const municipalitySlug = APP_CONFIG.municipality.name.toLowerCase().replace(/\s+/g, '-');

  doc.setFontSize(16);
  doc.setTextColor(30);
  doc.text(`${APP_CONFIG.productName} — ${APP_CONFIG.municipality.name}`, margin, margin + 6);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`${moduleLabel} — ${new Date().toLocaleDateString('it-IT')}`, margin, margin + 11);

  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2 - titleHeight - footerHeight;
  const imgAspect = canvas.width / canvas.height;
  let imgWidth = availableWidth;
  let imgHeight = imgWidth / imgAspect;
  if (imgHeight > availableHeight) {
    imgHeight = availableHeight;
    imgWidth = imgHeight * imgAspect;
  }
  const imgX = margin + (availableWidth - imgWidth) / 2;
  const imgY = margin + titleHeight;
  doc.addImage(imgData, 'PNG', imgX, imgY, imgWidth, imgHeight);

  // Cartographic scale of the printed map: ground width covered by the
  // visible map divided by the physical width the image ends up at on the page.
  const center = map.getCenter();
  const groundWidthMm = metersPerPixel(center.lat, map.getZoom()) * canvas.clientWidth * 1000;
  const scaleDenominator = Math.round(groundWidthMm / imgWidth);
  const centerText = `Centro: ${formatCoord(center.lat, 'N', 'S')}, ${formatCoord(center.lng, 'E', 'O')}`;
  const scaleText = `Scala 1:${scaleDenominator.toLocaleString('it-IT')}`;

  doc.setFontSize(8);
  doc.setTextColor(130);
  doc.text(`${centerText}  ·  ${scaleText}`, margin, pageHeight - 10);
  doc.text(`© Maptoolkit © OpenStreetMap contributors — ${municipalitySlug}`, margin, pageHeight - 5);

  const fileSlug = moduleLabel.toLowerCase().replace(/\s+/g, '-');
  doc.save(`${municipalitySlug}-${fileSlug}.pdf`);
}

const MODULE_PRINT_LABELS: Record<MapModule, string> = {
  base: 'Home',
  outdoor: 'Outdoor',
  rescue: 'Soccorso ed Emergenza',
  green: 'Green',
  community: 'Segnala'
};

class MapPrintControl implements IControl {
  private container?: HTMLDivElement;
  private moduleLabel: string;

  constructor(moduleLabel: string) {
    this.moduleLabel = moduleLabel;
  }

  onAdd(map: Map): HTMLElement {
    const container = document.createElement('div');
    container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

    const button = document.createElement('button');
    button.type = 'button';
    button.title = 'Stampa mappa';
    button.setAttribute('aria-label', 'Stampa mappa');
    // Same hand-drawn "document + PDF banner" icon as the integrated LTS map's print button.
    button.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 2 H14 L19 7 V22 H5 Z" fill="#f5f5f5" stroke="#888" stroke-width="1" stroke-linejoin="round"></path>
      <path d="M14 2 L19 7 H14 Z" fill="#cccccc"></path>
      <rect x="4" y="13" width="15" height="6" rx="1" fill="#E31B1C"></rect>
      <text x="11.5" y="17.6" font-size="5.5" font-family="Arial, sans-serif" font-weight="bold" fill="white" text-anchor="middle">PDF</text>
    </svg>`;
    button.addEventListener('click', () => exportMapToPdf(map, this.moduleLabel));

    container.appendChild(button);
    this.container = container;
    return container;
  }

  onRemove(): void {
    this.container?.parentNode?.removeChild(this.container);
  }
}

// Runs `fn` once immediately if the style is already loaded, and again after
// every future style load — the basemap switcher calls setStyle(), which
// fires 'style.load' (not the one-shot 'load') and wipes anything not part
// of the new style document. Module code that sets a filter, a layer's
// visibility, or attaches a hover popup should use this instead of the old
// `isStyleLoaded() ? fn() : map.once('load', fn)` one-shot pattern, or it
// silently stops working after the user switches the basemap style once.
export function onStyleReady(map: Map, fn: () => void): () => void {
  if (map.isStyleLoaded()) fn();
  map.on('style.load', fn);
  return () => map.off('style.load', fn);
}

export function createBaseMap(container: HTMLElement, options: CreateBaseMapOptions): Map {
  const isOutdoorModule = options.module === 'outdoor';
  const isRescueModule = options.module === 'rescue';
  const isGreenModule = options.module === 'green';
  const outdoorSection = options.outdoorSection ?? null;
  const cyclabilitySubsection = options.cyclabilitySubsection ?? null;
  const trailsSubsection = options.trailsSubsection ?? null;
  const initialZoom =
    isOutdoorModule && ((outdoorSection === 'trails' && trailsSubsection === 'slope') || outdoorSection === 'trails')
      ? 14
    : isOutdoorModule && cyclabilitySubsection === 'bike-infra'
        ? 14
        : isOutdoorModule || isRescueModule || options.module === 'community'
          ? 13
          : isGreenModule
            ? 12
            : APP_CONFIG.map.zoom;

  // The Green module centers on the NDVI coverage centroid — the municipality's
  // forested territory is ~3.5 km SW of the app's default urban center.
  const initialCenter: [number, number] = isGreenModule
    ? [12.620, 46.110]
    : APP_CONFIG.map.center;

  const { sources: overlaySources, layers: overlayLayers } = buildOverlayAdditions(options);

  const map = new maplibregl.Map({
    container,
    center: initialCenter,
    zoom: initialZoom,
    style: BASEMAP_STYLE_URLS[DEFAULT_BASEMAP_STYLE],
    attributionControl: false,
    // Needed for the print/export control to read back a valid PNG from the
    // WebGL canvas via toDataURL().
    canvasContextAttributes: { preserveDrawingBuffer: true }
  });

  // setStyle() (the basemap switcher) drops map.setTerrain() along with
  // everything else the new style doesn't define — tracked here so
  // 'style.load' can restore it instead of leaving the camera tilted with
  // no relief until the user re-clicks the terrain button.
  let terrainOn = false;

  // 'style.load' fires on the initial load AND after every setStyle() call
  // (the style switcher), so registering once keeps our overlays — and the
  // terrain toggle — alive across basemap switches without extra bookkeeping.
  map.on('style.load', () => {
    for (const [id, source] of Object.entries(overlaySources)) {
      if (!map.getSource(id)) map.addSource(id, source);
    }
    for (const layer of overlayLayers) {
      if (!map.getLayer(layer.id)) map.addLayer(layer);
    }
    if (terrainOn) {
      map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: 1.3 });
    }
  });

  // Same stacking order as the integrated LTS map: zoom -> fullscreen ->
  // search -> 3D terrain -> print, all in the top-right corner.
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
  map.addControl(new maplibregl.FullscreenControl(), 'top-right');
  map.addControl(new MapSearchControl(), 'top-right');
  map.addControl(new MapTerrainControl((on) => { terrainOn = on; }), 'top-right');
  map.addControl(new MapPrintControl(MODULE_PRINT_LABELS[options.module]), 'top-right');
  map.addControl(new MapStyleControl(DEFAULT_BASEMAP_STYLE), 'top-left');
  // No options object: AttributionControl's own default already gives
  // {compact: true, customAttribution: '<a href="maplibre.org">MapLibre</a>'}
  // — passing {compact: true} on its own replaces that default entirely
  // (JS default params only apply when the argument is omitted), silently
  // dropping the "MapLibre" credit. Maptoolkit's own style sources already
  // carry the "© Maptoolkit © Openstreetmap" part, links included.
  map.addControl(new maplibregl.AttributionControl(), 'bottom-right');

  return map;
}
