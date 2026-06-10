import maplibregl, { Map } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import { APP_CONFIG } from '../config';

export type MapModule = 'base' | 'outdoor' | 'rescue' | 'green' | 'community';
type OutdoorSection = 'cyclability' | 'trails';
type CyclabilitySubsection = 'lts' | 'bike-infra' | 'slope';
type TrailsSubsection = 'trails' | 'slope';

type CreateBaseMapOptions = {
  module: MapModule;
  outdoorSection?: OutdoorSection;
  cyclabilitySubsection?: CyclabilitySubsection;
  trailsSubsection?: TrailsSubsection;
};

let protocolRegistered = false;

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

function registerPmtilesProtocol(): void {
  if (protocolRegistered) {
    return;
  }

  const protocol = new Protocol();
  maplibregl.addProtocol('pmtiles', protocol.tile);
  protocolRegistered = true;
}

export function createBaseMap(container: HTMLElement, options: CreateBaseMapOptions): Map {
  registerPmtilesProtocol();

  const isOutdoorModule = options.module === 'outdoor';
  const isRescueModule = options.module === 'rescue';
  const isGreenModule = options.module === 'green';
  const outdoorSection = options.outdoorSection ?? 'cyclability';
  const cyclabilitySubsection = options.cyclabilitySubsection ?? 'lts';
  const trailsSubsection = options.trailsSubsection ?? 'trails';
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

  const sources: maplibregl.StyleSpecification['sources'] = {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>'
    },
    base: {
      type: 'vector',
      url: `pmtiles://${APP_CONFIG.map.pmtilesUrl}`
    }
  };

  if (options.module === 'base') {
    sources.municipalityBoundary = {
      type: 'geojson',
      data: `${import.meta.env.BASE_URL}data/boundary.geojson`
    };
  }

  if (isOutdoorModule) {
    sources.lts = {
      type: 'geojson',
      data: `${import.meta.env.BASE_URL}data/transport.geojson`
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

  const layers: maplibregl.StyleSpecification['layers'] = [
    {
      id: 'osm-base',
      type: 'raster',
      source: 'osm',
      paint: {
        'raster-opacity': 1
      }
    }
  ];

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
    if (outdoorSection === 'cyclability' && cyclabilitySubsection === 'lts') {
      layers.push({
        id: 'lts-overlay',
        type: 'line',
        source: 'lts',
        paint: {
          'line-color': [
            'match',
            ['to-number', ['get', 'lts'], 0],
            1, 'forestgreen',
            2, 'dodgerblue',
            3, '#f4e800',
            4, 'firebrick',
            '#6c757d'
          ],
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.8, 8, 1.2, 11, 1.9, 14, 4.8],
          'line-opacity': 1
        }
      });

      layers.push({
        id: 'cycling-network-casing',
        type: 'line',
        source: 'base',
        'source-layer': 'transportation',
        filter: [
          'any',
          ['==', ['get', 'class'], 'cycleway'],
          ['==', ['get', 'class'], 'path'],
          ['==', ['get', 'class'], 'track'],
          ['==', ['get', 'class'], 'service'],
          ['==', ['get', 'class'], 'minor']
        ],
        paint: {
          'line-color': '#d9e2ec',
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1.4, 8, 1.8, 11, 2.8, 14, 4.0],
          'line-opacity': 0.95
        }
      });

      layers.push({
        id: 'cycling-network',
        type: 'line',
        source: 'base',
        'source-layer': 'transportation',
        filter: [
          'any',
          ['==', ['get', 'class'], 'cycleway'],
          ['==', ['get', 'class'], 'path'],
          ['==', ['get', 'class'], 'track'],
          ['==', ['get', 'class'], 'service'],
          ['==', ['get', 'class'], 'minor']
        ],
        paint: {
          'line-color': '#ffffff',
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.7, 8, 1.0, 11, 1.5, 14, 3.0],
          'line-opacity': 1,
          'line-dasharray': [1, 1]
        }
      });
    }

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

    if (outdoorSection === 'cyclability' && cyclabilitySubsection === 'slope') {
      addSlopeLayer(layers, 'lts', 'slope-network-cyclability');
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

  // The Green module centers on the NDVI coverage centroid — the municipality's
  // forested territory is ~3.5 km SW of the app's default urban center.
  const initialCenter: [number, number] = isGreenModule
    ? [12.620, 46.110]
    : APP_CONFIG.map.center;

  const map = new maplibregl.Map({
    container,
    center: initialCenter,
    zoom: initialZoom,
    style: {
      version: 8,
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources,
      layers
    }
  });

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
  return map;
}
