import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map } from 'maplibre-gl';
import { createBaseMap, onStyleReady } from '../../lib/map';
import {
  buildRouteSummary,
  loadRoutingGraphForMode,
  routeToGeoJSON,
  routeToGPX,
  routeToKML,
  routeToCSV,
  type RouteSummary,
  type RoutingInputPoint,
  type RoutingMode
} from '../../lib/routing';
import Faq from '../../components/Faq';
import { APP_CONFIG } from '../../config';
import {
  getActiveOutdoorSectionFromHash,
  getActiveCyclabilitySubsectionFromHash,
  getCyclabilitySubsectionLabel,
  getActiveTrailsSubsectionFromHash,
  getTrailsSubsectionLabel,
  getOutdoorSectionLabel,
  navigateToCyclabilitySubsection,
  navigateToTrailsSubsection,
  navigateToOutdoorSection,
  type CyclabilitySubsection,
  type OutdoorSection,
  type TrailsSubsection
} from '../../app/routes';

type TrailCategory = 'hiking' | 'mtb';
type WaterCategory = 'drinking_water' | 'spring' | 'picnic_area';
type BikeInfraCategory = 'ciclabili' | 'bike_parking' | 'bike_rental' | 'bike_repair' | 'ebike_charging';
type SlopeClass = '0-3: flat' | '3-5: mild' | '5-8: medium' | '8-10: hard' | '10-20: extreme' | '>20: impossible';
type RouteStatePoint = RoutingInputPoint & { id: string };

const ALL_TRAIL_CATEGORIES: TrailCategory[] = ['hiking', 'mtb'];
const ALL_WATER_CATEGORIES: WaterCategory[] = ['drinking_water', 'spring', 'picnic_area'];
const ALL_CYCLABILITY_SUBSECTIONS: CyclabilitySubsection[] = ['lts', 'bike-infra', 'routing'];
const ALL_TRAILS_SUBSECTIONS: TrailsSubsection[] = ['trails', 'slope', 'routing'];
const ALL_BIKE_INFRA_CATEGORIES: BikeInfraCategory[] = [
  'ciclabili',
  'bike_parking',
  'bike_rental',
  'bike_repair',
  'ebike_charging'
];
const ALL_SLOPE_CLASSES: SlopeClass[] = [
  '0-3: flat',
  '3-5: mild',
  '5-8: medium',
  '8-10: hard',
  '10-20: extreme',
  '>20: impossible'
];

const OUTDOOR_SECTIONS: OutdoorSection[] = ['cyclability', 'trails'];

const OUTDOOR_SECTION_ICONS: Record<OutdoorSection, string> = {
  cyclability: 'bi-bicycle',
  trails: 'bi-signpost-split'
};

const CYCLABILITY_SUBSECTION_ICONS: Record<CyclabilitySubsection, string> = {
  lts: 'bi-exclamation-triangle',
  'bike-infra': 'bi-signpost-2',
  routing: 'bi-compass'
};

const TRAILS_SUBSECTION_ICONS: Record<TrailsSubsection, string> = {
  trails: 'bi-map',
  slope: 'bi-graph-up-arrow',
  routing: 'bi-compass'
};

function getSectionDescription(section: OutdoorSection | null): string {
  if (section === 'cyclability') {
    return 'Stress da traffico, infrastrutture per la bici, o pianifica un percorso.';
  }

  if (section === 'trails') {
    return 'Sentieri, pendenza, o pianifica un percorso a piedi.';
  }

  return 'Scegli cosa ti interessa: percorsi in bici o sentieri a piedi.';
}

function getCyclabilityDescription(subsection: CyclabilitySubsection | null): string {
  if (subsection === 'lts') {
    return 'Quanto ogni strada è stressante o sicura da percorrere in bici, mappa di stressinbici.it.';
  }

  if (subsection === 'bike-infra') {
    return 'Piste ciclabili, rastrelliere, bike sharing e altri servizi per la bici.';
  }

  if (subsection === 'routing') {
    return 'Calcola un itinerario in bici, con distanza, tempo e profilo altimetrico.';
  }

  return 'Scegli cosa vuoi vedere.';
}

function getTrailsDescription(subsection: TrailsSubsection | null): string {
  if (subsection === 'trails') {
    return 'Sentieri CAI, percorsi MTB, fontane e aree picnic.';
  }

  if (subsection === 'slope') {
    return 'Strade e sentieri colorati per pendenza, con etichette pensate per chi cammina.';
  }

  if (subsection === 'routing') {
    return 'Calcola un itinerario a piedi, con distanza, tempo e profilo altimetrico.';
  }

  return 'Scegli cosa vuoi vedere.';
}

function getTrailCategoryLabel(category: TrailCategory): string {
  if (category === 'hiking') {
    return 'Escursionismo';
  }

  return 'MTB';
}

function getWaterCategoryLabel(category: WaterCategory): string {
  if (category === 'drinking_water') {
    return 'Fontane';
  }

  if (category === 'spring') {
    return 'Sorgenti';
  }

  return 'Area picnic';
}

function getBikeInfraCategoryLabel(category: BikeInfraCategory): string {
  if (category === 'ciclabili') {
    return 'Ciclabili / MV 06';
  }

  if (category === 'bike_parking') {
    return 'Rastrelliere';
  }

  if (category === 'bike_rental') {
    return 'Bike sharing';
  }

  if (category === 'bike_repair') {
    return 'Riparazione bici';
  }

  return 'Ricarica e-bike';
}

function getBikeInfraCategoryColor(category: BikeInfraCategory): string {
  if (category === 'ciclabili') {
    return '#2f78c4';
  }

  if (category === 'bike_parking') {
    return '#2f78c4';
  }

  if (category === 'bike_rental') {
    return '#2b8a3e';
  }

  if (category === 'bike_repair') {
    return '#7b2cbf';
  }

  return '#f59f00';
}

function getSlopeTrailLabel(slopeClass: SlopeClass): string {
  if (slopeClass === '0-3: flat') {
    return '0-3: flat';
  }

  if (slopeClass === '3-5: mild') {
    return '3-5: easy';
  }

  if (slopeClass === '5-8: medium') {
    return '5-8: moderate';
  }

  if (slopeClass === '8-10: hard') {
    return '8-10: hard';
  }

  if (slopeClass === '10-20: extreme') {
    return '10-20: very hard';
  }

  return '>20: extreme';
}

function getSlopeColor(slopeClass: SlopeClass): string {
  if (slopeClass === '0-3: flat') {
    return '#2b8a3e';
  }

  if (slopeClass === '3-5: mild') {
    return '#74c69d';
  }

  if (slopeClass === '5-8: medium') {
    return '#ffd43b';
  }

  if (slopeClass === '8-10: hard') {
    return '#ff922b';
  }

  if (slopeClass === '10-20: extreme') {
    return '#e03131';
  }

  return '#7f1d1d';
}

function getSlopeEntries() {
  return ALL_SLOPE_CLASSES.map((slopeClass) => ({
    className: slopeClass,
    label: getSlopeTrailLabel(slopeClass),
    color: getSlopeColor(slopeClass)
  }));
}

function getLayerVisibility(visible: boolean): 'visible' | 'none' {
  return visible ? 'visible' : 'none';
}

function formatDistance(distanceKm: number): string {
  return `${distanceKm.toFixed(distanceKm >= 10 ? 1 : 2)} km`;
}

function formatTime(timeMin: number): string {
  if (timeMin < 60) {
    return `${Math.max(1, Math.round(timeMin))} min`;
  }

  const hours = Math.floor(timeMin / 60);
  const minutes = Math.round(timeMin % 60);
  return `${hours} h ${minutes} min`;
}

function downloadTextFile(filename: string, mimeType: string, content: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type RouteExportFormat = 'geojson' | 'gpx' | 'kml' | 'csv';

function exportRoute(summary: RouteSummary, format: RouteExportFormat): void {
  const map: Record<RouteExportFormat, [string, string, string]> = {
    geojson: ['percorso.geojson', 'application/geo+json', routeToGeoJSON(summary)],
    gpx: ['percorso.gpx', 'application/gpx+xml', routeToGPX(summary)],
    kml: ['percorso.kml', 'application/vnd.google-earth.kml+xml', routeToKML(summary)],
    csv: ['percorso-altimetria.csv', 'text/csv', routeToCSV(summary)]
  };
  const [name, mime, content] = map[format];
  downloadTextFile(name, mime, content);
}

function CyclabilityTabs({
  activeSubsection,
  onSelectSubsection
}: {
  activeSubsection: CyclabilitySubsection | null;
  onSelectSubsection: (subsection: CyclabilitySubsection) => void;
}) {
  return (
    <section className="legend-panel" aria-label="Sottosezioni percorsi in bici">
      <strong>Percorsi in bici</strong>
      <div className="legend-row" role="tablist">
        {ALL_CYCLABILITY_SUBSECTIONS.map((subsection) => (
          <button
            key={subsection}
            type="button"
            role="tab"
            aria-selected={activeSubsection === subsection}
            className={activeSubsection === subsection ? 'module-link active' : 'module-link'}
            onClick={() => onSelectSubsection(subsection)}
          >
            <i className={`bi ${CYCLABILITY_SUBSECTION_ICONS[subsection]} tab-icon`} aria-hidden="true" />
            {getCyclabilitySubsectionLabel(subsection)}
          </button>
        ))}
      </div>
      <p className="section-description">{getCyclabilityDescription(activeSubsection)}</p>
    </section>
  );
}

function TrailsTabs({
  activeSubsection,
  onSelectSubsection
}: {
  activeSubsection: TrailsSubsection | null;
  onSelectSubsection: (subsection: TrailsSubsection) => void;
}) {
  return (
    <section className="legend-panel" aria-label="Sottosezioni sentieri">
      <strong>Sentieri</strong>
      <div className="legend-row" role="tablist">
        {ALL_TRAILS_SUBSECTIONS.map((subsection) => (
          <button
            key={subsection}
            type="button"
            role="tab"
            aria-selected={activeSubsection === subsection}
            className={activeSubsection === subsection ? 'module-link active' : 'module-link'}
            onClick={() => onSelectSubsection(subsection)}
          >
            <i className={`bi ${TRAILS_SUBSECTION_ICONS[subsection]} tab-icon`} aria-hidden="true" />
            {getTrailsSubsectionLabel(subsection)}
          </button>
        ))}
      </div>
      <p className="section-description">{getTrailsDescription(activeSubsection)}</p>
    </section>
  );
}

function TrailsLegend({
  visibleTrailCategories,
  onToggleCategory,
  onShowAll
}: {
  visibleTrailCategories: TrailCategory[];
  onToggleCategory: (category: TrailCategory) => void;
  onShowAll: () => void;
}) {
  return (
    <section className="legend-panel" aria-label="Legenda sentieri">
      <strong>Sentieri</strong>
      <div className="legend-row">
        {ALL_TRAIL_CATEGORIES.map((category) => (
          <label key={category}>
            <input
              type="checkbox"
              checked={visibleTrailCategories.includes(category)}
              onChange={() => onToggleCategory(category)}
            />
            <span className={`trail-swatch trail-swatch-${category}`} />{getTrailCategoryLabel(category)}
          </label>
        ))}
        <button type="button" onClick={onShowAll}>Mostra tutti</button>
      </div>
      <Faq>
        Sentieri segnalati dal CAI (Club Alpino Italiano) per l'escursionismo a piedi, e percorsi adatti alla
        mountain bike. Tracciati mappati da OpenStreetMap.
      </Faq>
    </section>
  );
}

function WaterLegend({
  visibleWaterCategories,
  onToggleCategory,
  onShowAll
}: {
  visibleWaterCategories: WaterCategory[];
  onToggleCategory: (category: WaterCategory) => void;
  onShowAll: () => void;
}) {
  return (
    <section className="legend-panel" aria-label="Legenda punti acqua e picnic">
      <strong>Punti acqua e picnic</strong>
      <div className="legend-row">
        {ALL_WATER_CATEGORIES.map((category) => (
          <label key={category}>
            <input
              type="checkbox"
              checked={visibleWaterCategories.includes(category)}
              onChange={() => onToggleCategory(category)}
            />
            <span className={`water-swatch water-swatch-${category}`} />{getWaterCategoryLabel(category)}
          </label>
        ))}
        <button type="button" onClick={onShowAll}>Mostra tutti</button>
      </div>
    </section>
  );
}

function BikeInfraLegend({
  visibleBikeInfraCategories,
  onToggleCategory,
  onShowAll
}: {
  visibleBikeInfraCategories: BikeInfraCategory[];
  onToggleCategory: (category: BikeInfraCategory) => void;
  onShowAll: () => void;
}) {
  return (
    <section className="legend-panel" aria-label="Legenda infrastrutture ciclistiche">
      <strong>Infrastrutture per biciclette</strong>
      <div className="legend-row">
        {ALL_BIKE_INFRA_CATEGORIES.map((category) => (
          <label key={category}>
            <input
              type="checkbox"
              checked={visibleBikeInfraCategories.includes(category)}
              onChange={() => onToggleCategory(category)}
            />
            <span className={`infra-swatch infra-swatch-${category}`} style={{ backgroundColor: getBikeInfraCategoryColor(category) }} />
            {getBikeInfraCategoryLabel(category)}
          </label>
        ))}
        <button type="button" onClick={onShowAll}>Mostra tutti</button>
      </div>
      <Faq>
        Piste ciclabili (incluso il percorso regionale FVG3 / MV 06), rastrelliere per parcheggiare la bici,
        punti di bike sharing, officine per la riparazione e colonnine di ricarica per e-bike, mappati da
        OpenStreetMap.
      </Faq>
    </section>
  );
}

function SlopeLegend({
  entries,
  visibleSlopeClasses,
  onToggleSlopeClass,
  onShowAll
}: {
  entries: Array<{ className: SlopeClass; label: string; color: string }>;
  visibleSlopeClasses: SlopeClass[];
  onToggleSlopeClass: (slopeClass: SlopeClass) => void;
  onShowAll: () => void;
}) {
  return (
    <section className="legend-panel" aria-label="Pendenza">
      <strong>Pendenza</strong>
      <p className="section-description">Strade e sentieri colorati in base a quanto sono ripidi.</p>
      <div className="legend-row">
        {entries.map((entry) => (
          <label key={entry.className}>
            <input
              type="checkbox"
              checked={visibleSlopeClasses.includes(entry.className)}
              onChange={() => onToggleSlopeClass(entry.className)}
            />
            <span className="slope-swatch" style={{ backgroundColor: entry.color }} />
            {entry.label}
          </label>
        ))}
        <button type="button" onClick={onShowAll}>Mostra tutti</button>
      </div>
      <Faq>
        Pendenza media di ogni tratto, calcolata dal modello digitale del terreno (DEM/LiDAR). Le classi vanno
        da pianeggiante (0-3%) a impraticabile (oltre il 20%), con etichette pensate per chi cammina più che
        per chi pedala.
      </Faq>
    </section>
  );
}

// Left legend: just the on/off switch. All the route data lives in the
// on-map panel (RoutePlannerOverlay).
function RoutingPanel({
  enabled,
  mode,
  onToggleEnabled
}: {
  enabled: boolean;
  mode: RoutingMode;
  onToggleEnabled: () => void;
}) {
  return (
    <section className="legend-panel routing-panel" aria-label="Pianifica percorso">
      <strong>Pianifica percorso</strong>
      <div className="legend-row routing-row">
        <button type="button" className={enabled ? 'module-link active' : 'module-link'} onClick={onToggleEnabled}>
          {enabled ? 'Pianificazione attiva' : 'Attiva pianificazione'}
        </button>
      </div>
      <p className="section-description">
        {enabled
          ? `Clicca sulla mappa per porre partenza, arrivo e tappe; trascina i pallini per spostarli. I dati del percorso compaiono nel riquadro sulla mappa. Rete: ${mode === 'biking' ? 'strade e ciclabili' : 'strade e sentieri'}.`
          : 'Attiva la pianificazione, poi clicca sulla mappa per porre i punti.'}
      </p>
    </section>
  );
}

function ElevationSvg({ summary }: { summary: RouteSummary }) {
  const width = 420;
  const height = 190;
  const margin = { top: 12, right: 14, bottom: 32, left: 48 };
  const minElevation = Math.min(...summary.profile.map((point) => point.elevationM));
  const maxElevation = Math.max(...summary.profile.map((point) => point.elevationM));
  const distanceKm = Math.max(summary.distanceKm, 0.001);
  const elevationRange = Math.max(maxElevation - minElevation, 1);
  const xTicks = [0, 0.25, 0.5, 0.75, 1];
  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const elevationLabelDigits = elevationRange < 20 ? 1 : 0;
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const xFor = (distance: number) => margin.left + (distance / distanceKm) * plotWidth;
  const yFor = (elevation: number) =>
    margin.top + plotHeight - ((elevation - minElevation) / elevationRange) * plotHeight;
  const linePoints = summary.profile.map((point) => `${xFor(point.distanceKm)} ${yFor(point.elevationM)}`).join(' ');
  const areaPoints = `${margin.left} ${height - margin.bottom} ${linePoints} ${width - margin.right} ${height - margin.bottom}`;

  return (
    <svg className="route-profile-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-hidden="true">
      <defs>
        <linearGradient id="route-profile-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#8ecae6" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#8ecae6" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      {xTicks.map((tick) => {
        const x = margin.left + tick * plotWidth;
        return (
          <g key={`x-${tick}`}>
            <line x1={x} y1={margin.top} x2={x} y2={height - margin.bottom} className="route-profile-grid" />
            <text x={x} y={height - 12} className="route-profile-axis-label route-profile-axis-label-x" textAnchor="middle">
              {Math.round(distanceKm * tick * 10) / 10} km
            </text>
          </g>
        );
      })}
      {yTicks.map((tick) => {
        const elevation = minElevation + tick * elevationRange;
        const y = yFor(elevation);
        return (
          <g key={`y-${tick}`}>
            <line x1={margin.left} y1={y} x2={width - margin.right} y2={y} className="route-profile-grid" />
            <text x={margin.left - 8} y={y + 3} className="route-profile-axis-label route-profile-axis-label-y">
              {`${elevation.toFixed(elevationLabelDigits)} m`}
            </text>
          </g>
        );
      })}
      <line x1={margin.left} y1={height - margin.bottom} x2={width - margin.right} y2={height - margin.bottom} className="route-profile-axis" />
      <line x1={margin.left} y1={margin.top} x2={margin.left} y2={height - margin.bottom} className="route-profile-axis" />
      <polygon points={areaPoints} fill="url(#route-profile-fill)" />
      <polyline points={linePoints} fill="none" stroke="#1d4ed8" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// The on-map floating panel: hint, point list, controls and — once a route is
// computed — length, per-mode times, road-type breakdown, elevation profile
// and the download buttons. Modelled on LTSBikePlan's routing control.
function RoutePlannerOverlay({
  active,
  mode,
  points,
  summary,
  status,
  onRemovePoint,
  onSwapEnds,
  onUndo,
  onClear
}: {
  active: boolean;
  mode: RoutingMode;
  points: RouteStatePoint[];
  summary: RouteSummary | null;
  status: string;
  onRemovePoint: (id: string) => void;
  onSwapEnds: () => void;
  onUndo: () => void;
  onClear: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  if (!active) return null;

  const pointCount = points.length;
  const pointLabel = (index: number): string =>
    index === 0 ? 'Partenza' : index === pointCount - 1 ? 'Arrivo' : `Tappa ${index}`;

  return (
    <section className="route-profile-panel route-planner-panel" aria-label="Pianifica percorso">
      <div className="route-profile-header">
        <strong>Pianifica percorso</strong>
        <button
          type="button"
          className="route-planner-collapse"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((value) => !value)}
        >
          <i className={`bi ${collapsed ? 'bi-chevron-down' : 'bi-chevron-up'}`} aria-hidden="true" />
        </button>
      </div>

      {!collapsed && (
        <div className="route-planner-body">
          <p className="route-planner-hint">
            Clicca sulla mappa per porre partenza, arrivo e tappe; trascina i pallini per spostarli.
            Rete: {mode === 'biking' ? 'strade e ciclabili' : 'strade e sentieri'}.
          </p>

          {pointCount > 0 && (
            <ul className="routing-points">
              {points.map((point, index) => (
                <li key={point.id}>
                  <span className={`routing-point-dot routing-point-dot--${index === 0 ? 'start' : index === pointCount - 1 ? 'end' : 'via'}`} aria-hidden="true" />
                  <span className="routing-point-name">{pointLabel(index)}</span>
                  <span className="routing-point-coord">{point.lat.toFixed(4)}, {point.lng.toFixed(4)}</span>
                  <button type="button" className="routing-point-remove" title="Rimuovi" onClick={() => onRemovePoint(point.id)}>
                    <i className="bi bi-x-lg" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="legend-row routing-row">
            <button type="button" onClick={onSwapEnds} disabled={pointCount < 2}>Inverti</button>
            <button type="button" onClick={onUndo} disabled={pointCount === 0}>Indietro</button>
            <button type="button" onClick={onClear} disabled={pointCount === 0}>Pulisci</button>
          </div>

          {!summary && <p className="route-planner-status">{status}</p>}

          {summary && (
            <>
              <div className="routing-stats">
                <span className="routing-stat">{formatDistance(summary.distanceKm)}</span>
                <span className="routing-stat">+{Math.round(summary.elevationGainM)} m</span>
                <span className="routing-stat">-{Math.round(summary.elevationLossM)} m</span>
              </div>

              <div className="routing-times">
                <div className="routing-time"><i className="bi bi-person-walking" aria-hidden="true" /> {formatTime(summary.times.walking)}<small>a piedi</small></div>
                <div className="routing-time"><i className="bi bi-bicycle" aria-hidden="true" /> {formatTime(summary.times.biking)}<small>bici</small></div>
                <div className="routing-time"><i className="bi bi-bicycle" aria-hidden="true" /> {formatTime(summary.times.ebike)}<small>bici elettrica</small></div>
              </div>

              {summary.surfaceBreakdown.length > 0 && (
                <div className="routing-surface">
                  <span className="routing-surface-title">Tipologia di strada</span>
                  <div className="routing-surface-bar">
                    {summary.surfaceBreakdown.map((run) => (
                      <span
                        key={run.label}
                        className="routing-surface-seg"
                        style={{ width: `${(run.km / summary.distanceKm) * 100}%` }}
                        title={`${run.label}: ${run.km.toFixed(2)} km`}
                      />
                    ))}
                  </div>
                  <ul className="routing-surface-list">
                    {summary.surfaceBreakdown.map((run) => (
                      <li key={run.label}><span>{run.label}</span><span>{run.km.toFixed(run.km >= 10 ? 1 : 2)} km</span></li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.profile.length >= 2 && (
                <div className="route-planner-profile">
                  <span className="routing-surface-title">Profilo altimetrico <small>(dislivello relativo)</small></span>
                  <ElevationSvg summary={summary} />
                </div>
              )}

              <div className="routing-downloads">
                <span className="routing-downloads-title">Scarica</span>
                <button type="button" onClick={() => exportRoute(summary, 'geojson')}>GeoJSON</button>
                <button type="button" onClick={() => exportRoute(summary, 'gpx')}>GPX</button>
                <button type="button" onClick={() => exportRoute(summary, 'kml')}>KML</button>
                <button type="button" onClick={() => exportRoute(summary, 'csv')}>CSV</button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function LtsEmbed() {
  const { lat, lon, zoom } = APP_CONFIG.municipality.ltsEmbedView;
  const src = `https://stressinbici.it/?${new URLSearchParams({
    area: 'italia',
    zoom: String(zoom),
    lat: String(lat),
    lon: String(lon),
    pitch: '0',
    bearing: '0',
    bg: 'dark',
    lts: '0,1,2,3,4',
    terrain: '0',
    gap: '0',
    lang: 'it'
  }).toString()}`;

  return (
    <section className="module-view lts-embed-wrap" aria-label="Stress da traffico, stressinbici.it">
      <iframe
        className="lts-embed-frame"
        src={src}
        title="Stress in bici: livello di stress da traffico per la mobilità ciclabile"
      />
    </section>
  );
}

export default function OutdoorModule() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const routingMarkersRef = useRef(new globalThis.Map<string, maplibregl.Marker>());
  const [activeSection, setActiveSection] = useState<OutdoorSection | null>(
    getActiveOutdoorSectionFromHash()
  );
  const [activeCyclabilitySubsection, setActiveCyclabilitySubsection] = useState<CyclabilitySubsection | null>(
    getActiveCyclabilitySubsectionFromHash()
  );
  const [activeTrailsSubsection, setActiveTrailsSubsection] = useState<TrailsSubsection | null>(
    getActiveTrailsSubsectionFromHash()
  );
  const [visibleTrailCategories, setVisibleTrailCategories] = useState<TrailCategory[]>(ALL_TRAIL_CATEGORIES);
  const [visibleWaterCategories, setVisibleWaterCategories] = useState<WaterCategory[]>(ALL_WATER_CATEGORIES);
  const [visibleBikeInfraCategories, setVisibleBikeInfraCategories] = useState<BikeInfraCategory[]>(ALL_BIKE_INFRA_CATEGORIES);
  const [visibleTrailSlopeClasses, setVisibleTrailSlopeClasses] = useState<SlopeClass[]>(ALL_SLOPE_CLASSES);
  const [showTrailShade, setShowTrailShade] = useState(false);
  const [routingEnabled, setRoutingEnabled] = useState(false);
  const [routingPoints, setRoutingPoints] = useState<RouteStatePoint[]>([]);
  const [routingGraph, setRoutingGraph] = useState<Awaited<ReturnType<typeof loadRoutingGraphForMode>> | null>(null);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [routeStatus, setRouteStatus] = useState('Nessun percorso calcolato');
  const routingMode: RoutingMode = activeSection === 'cyclability' ? 'biking' : 'walking';
  const isRoutingActive =
    (activeSection === 'cyclability' && activeCyclabilitySubsection === 'routing') ||
    (activeSection === 'trails' && activeTrailsSubsection === 'routing');

  function toggleTrailCategory(category: TrailCategory): void {
    setVisibleTrailCategories((previous) => {
      if (previous.includes(category)) {
        return previous.filter((item) => item !== category);
      }

      return [...previous, category].sort() as TrailCategory[];
    });
  }

  function showAllTrailCategories(): void {
    setVisibleTrailCategories(ALL_TRAIL_CATEGORIES);
  }

  function toggleWaterCategory(category: WaterCategory): void {
    setVisibleWaterCategories((previous) => {
      if (previous.includes(category)) {
        return previous.filter((item) => item !== category);
      }

      return [...previous, category].sort() as WaterCategory[];
    });
  }

  function showAllWaterCategories(): void {
    setVisibleWaterCategories(ALL_WATER_CATEGORIES);
  }

  function toggleBikeInfraCategory(category: BikeInfraCategory): void {
    setVisibleBikeInfraCategories((previous) => {
      if (previous.includes(category)) {
        return previous.filter((item) => item !== category);
      }

      return [...previous, category].sort() as BikeInfraCategory[];
    });
  }

  function showAllBikeInfraCategories(): void {
    setVisibleBikeInfraCategories(ALL_BIKE_INFRA_CATEGORIES);
  }

  function toggleTrailSlopeClass(slopeClass: SlopeClass): void {
    setVisibleTrailSlopeClasses((previous) => {
      if (previous.includes(slopeClass)) {
        return previous.filter((item) => item !== slopeClass);
      }

      return [...previous, slopeClass].sort() as SlopeClass[];
    });
  }

  function showAllTrailSlopeClasses(): void {
    setVisibleTrailSlopeClasses(ALL_SLOPE_CLASSES);
  }

  function clearRoute(): void {
    setRoutingPoints([]);
    setRouteSummary(null);
    setRouteStatus('Nessun percorso calcolato');
  }

  function undoRoutePoint(): void {
    setRoutingPoints((previous) => previous.slice(0, -1));
  }

  function removeRoutePoint(id: string): void {
    setRoutingPoints((previous) => previous.filter((point) => point.id !== id));
  }

  function swapRouteEnds(): void {
    setRoutingPoints((previous) => (previous.length < 2 ? previous : [...previous].reverse()));
  }

  useEffect(() => {
    clearRoute();
  }, [activeSection, activeCyclabilitySubsection, activeTrailsSubsection]);

  useEffect(() => {
    let cancelled = false;

    loadRoutingGraphForMode(routingMode)
      .then((graph) => {
        if (!cancelled) {
          setRoutingGraph(graph);
          setRouteStatus('Clicca sulla mappa per aggiungere punti');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRouteStatus('Routing non disponibile');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [routingMode]);

  useEffect(() => {
    if (!routingGraph) {
      return;
    }

    if (routingPoints.length < 2) {
      setRouteSummary(null);
      setRouteStatus(routingPoints.length === 0 ? 'Clicca sulla mappa per aggiungere punti' : 'Aggiungi almeno un altro punto');
      return;
    }

    const summary = buildRouteSummary(
      routingGraph,
      routingPoints.map(({ lng, lat }) => ({ lng, lat })),
      routingMode
    );

    if (!summary) {
      setRouteSummary(null);
      setRouteStatus('Percorso non trovato');
      return;
    }

    setRouteSummary(summary);
    setRouteStatus(`${routingPoints.length} punti collegati`);
  }, [routingGraph, routingPoints, routingMode]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) {
      return;
    }

    const handleClick = (event: maplibregl.MapLayerMouseEvent) => {
      if (!routingEnabled || !isRoutingActive) {
        return;
      }

      setRoutingPoints((previous) => [
        ...previous,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          lng: event.lngLat.lng,
          lat: event.lngLat.lat
        }
      ]);
    };

    map.getCanvas().style.cursor = routingEnabled && isRoutingActive ? 'crosshair' : '';
    map.on('click', handleClick);

    return () => {
      map.off('click', handleClick);
      map.getCanvas().style.cursor = '';
    };
  }, [routingEnabled, activeSection, activeCyclabilitySubsection, activeTrailsSubsection]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) {
      return;
    }

    // Line only: the start/end/waypoints are interactive draggable markers now.
    const routeFeatures = routeSummary ? [routeSummary.line] : [];

    const applyData = () => {
      const source = map.getSource('route') as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData({ type: 'FeatureCollection', features: routeFeatures } as never);
      }
    };

    return onStyleReady(map, applyData);
  }, [routeSummary, activeSection, activeCyclabilitySubsection, activeTrailsSubsection]);

  // Draggable A / B / waypoint markers. Small N, so the whole set is rebuilt
  // whenever any point changes; dragging one updates it and re-runs the route.
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markers = routingMarkersRef.current;
    const clearAll = () => {
      for (const marker of markers.values()) marker.remove();
      markers.clear();
    };
    clearAll();

    if (!map || !isRoutingActive) return clearAll;

    routingPoints.forEach((point, index) => {
      const color = index === 0 ? '#2f9e44' : index === routingPoints.length - 1 ? '#e03131' : '#f59f00';
      const marker = new maplibregl.Marker({ color, draggable: true })
        .setLngLat([point.lng, point.lat])
        .addTo(map);
      marker.on('dragend', () => {
        const { lng, lat } = marker.getLngLat();
        setRoutingPoints((previous) =>
          previous.map((entry) => (entry.id === point.id ? { ...entry, lng, lat } : entry))
        );
      });
      markers.set(point.id, marker);
    });

    return clearAll;
  }, [routingPoints, isRoutingActive]);

  useEffect(() => {
    const onHashChange = () => {
      const section = getActiveOutdoorSectionFromHash();
      const cyclabilitySubsection = getActiveCyclabilitySubsectionFromHash();
      const trailsSubsection = getActiveTrailsSubsectionFromHash();
      setActiveSection(section);
      setActiveCyclabilitySubsection(cyclabilitySubsection);
      setActiveTrailsSubsection(trailsSubsection);
    };

    // No forced default here: an incomplete hash (#/outdoor, #/outdoor/cyclability)
    // is a valid "nothing chosen yet" state, not a redirect target.
    window.addEventListener('hashchange', onHashChange);

    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  useEffect(() => {
    let map: Map | undefined;

    if (mapRef.current) {
      map = createBaseMap(mapRef.current, {
        module: 'outdoor',
        outdoorSection: activeSection,
        cyclabilitySubsection: activeCyclabilitySubsection,
        trailsSubsection: activeTrailsSubsection
      });
      mapInstanceRef.current = map;
    }

    return () => {
      map?.remove();
      mapInstanceRef.current = null;
    };
  }, [activeSection, activeCyclabilitySubsection, activeTrailsSubsection]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || activeSection !== 'cyclability' || activeCyclabilitySubsection !== 'bike-infra') {
      return;
    }

    const applyVisibility = () => {
      const bikeInfraVisibility = {
        ciclabili: getLayerVisibility(visibleBikeInfraCategories.includes('ciclabili')),
        bikeParking: getLayerVisibility(visibleBikeInfraCategories.includes('bike_parking')),
        bikeRental: getLayerVisibility(visibleBikeInfraCategories.includes('bike_rental')),
        bikeRepair: getLayerVisibility(visibleBikeInfraCategories.includes('bike_repair')),
        ebikeCharging: getLayerVisibility(visibleBikeInfraCategories.includes('ebike_charging'))
      };

      const setVisibility = (layerId: string, visibility: 'visible' | 'none') => {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', visibility);
        }
      };

      setVisibility('bike-lane-casing', bikeInfraVisibility.ciclabili);
      setVisibility('bike-lane-network', bikeInfraVisibility.ciclabili);
      setVisibility('bike-lane-labels', bikeInfraVisibility.ciclabili);
      setVisibility('bike-infra-bike-parking', bikeInfraVisibility.bikeParking);
      setVisibility('bike-infra-bike-rental', bikeInfraVisibility.bikeRental);
      setVisibility('bike-infra-bike-repair', bikeInfraVisibility.bikeRepair);
      setVisibility('bike-infra-ebike-charging', bikeInfraVisibility.ebikeCharging);
    };

    return onStyleReady(map, applyVisibility);
  }, [activeSection, activeCyclabilitySubsection, visibleBikeInfraCategories]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || activeSection !== 'trails' || activeTrailsSubsection !== 'trails') {
      return;
    }

    const applyVisibility = () => {
      const trailVisibility = {
        hiking: getLayerVisibility(visibleTrailCategories.includes('hiking')),
        mtb: getLayerVisibility(visibleTrailCategories.includes('mtb')),
        drinkingWater: getLayerVisibility(visibleWaterCategories.includes('drinking_water')),
        spring: getLayerVisibility(visibleWaterCategories.includes('spring')),
        picnicArea: getLayerVisibility(visibleWaterCategories.includes('picnic_area'))
      };

      const setVisibility = (layerId: string, visibility: 'visible' | 'none') => {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', visibility);
        }
      };

      setVisibility('trail-casing-hiking', trailVisibility.hiking);
      setVisibility('trail-network-hiking', trailVisibility.hiking);
      setVisibility('trail-labels-hiking', trailVisibility.hiking);
      setVisibility('trail-casing-mtb', trailVisibility.mtb);
      setVisibility('trail-network-mtb', trailVisibility.mtb);
      setVisibility('trail-labels-mtb', trailVisibility.mtb);

      setVisibility('water-poi-drinking-water', trailVisibility.drinkingWater);
      setVisibility('water-poi-labels-drinking-water', trailVisibility.drinkingWater);
      setVisibility('water-poi-spring', trailVisibility.spring);
      setVisibility('water-poi-labels-spring', trailVisibility.spring);
      setVisibility('water-poi-picnic', trailVisibility.picnicArea);
      setVisibility('water-poi-labels-picnic', trailVisibility.picnicArea);
    };

    return onStyleReady(map, applyVisibility);
  }, [activeSection, activeTrailsSubsection, visibleTrailCategories, visibleWaterCategories]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || activeSection !== 'trails' || activeTrailsSubsection !== 'trails') {
      return;
    }

    const hikingColor = showTrailShade
      ? ['interpolate', ['linear'], ['get', 'shade_pct'], 0, '#c8e6c9', 30, '#66bb6a', 60, '#2e7d32', 100, '#0a3d0f']
      : '#4f7b3a';

    const hikingCasing = showTrailShade
      ? ['interpolate', ['linear'], ['get', 'shade_pct'], 0, '#f1f8e9', 30, '#a5d6a7', 60, '#388e3c', 100, '#1b5e20']
      : '#dfe9d8';

    const mtbColor = showTrailShade
      ? ['interpolate', ['linear'], ['get', 'shade_pct'], 0, '#bbdefb', 30, '#42a5f5', 60, '#1565c0', 100, '#07234d']
      : '#2f78c4';

    const mtbCasing = showTrailShade
      ? ['interpolate', ['linear'], ['get', 'shade_pct'], 0, '#e3f2fd', 30, '#90caf9', 60, '#1976d2', 100, '#0d47a1']
      : '#d9e7f4';

    const apply = () => {
      if (map.getLayer('trail-network-hiking')) map.setPaintProperty('trail-network-hiking', 'line-color', hikingColor as never);
      if (map.getLayer('trail-casing-hiking')) map.setPaintProperty('trail-casing-hiking', 'line-color', hikingCasing as never);
      if (map.getLayer('trail-network-mtb')) map.setPaintProperty('trail-network-mtb', 'line-color', mtbColor as never);
      if (map.getLayer('trail-casing-mtb')) map.setPaintProperty('trail-casing-mtb', 'line-color', mtbCasing as never);
    };

    return onStyleReady(map, apply);
  }, [showTrailShade, activeSection, activeTrailsSubsection]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const isTrailsSlope = activeSection === 'trails' && activeTrailsSubsection === 'slope';

    if (!map || !isTrailsSlope) {
      return;
    }

    const slopeLayerId = 'slope-network-trails';
    const visibleSlopeClasses = visibleTrailSlopeClasses;

    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
    const slopeFilter =
      visibleSlopeClasses.length > 0
        ? ['in', ['get', 'slope_class'], ['literal', visibleSlopeClasses]]
        : ['==', ['get', 'slope_class'], '__none__'];

    const applyFilter = () => {
      if (map.getLayer(slopeLayerId)) {
        map.setFilter(slopeLayerId, slopeFilter as never);
      }
    };

    const handleMouseMove = (event: maplibregl.MapLayerMouseEvent) => {
      const features = map.queryRenderedFeatures(event.point, { layers: [slopeLayerId] });
      const feature = features[0];

      if (!feature) {
        return;
      }

      const slope = Number(feature.properties?.slope ?? 0).toFixed(1);
      const slopeClass = String(feature.properties?.slope_class ?? 'unknown');
      const name = String(feature.properties?.name ?? feature.properties?.['name:it'] ?? '');

      map.getCanvas().style.cursor = 'pointer';
      popup
        .setLngLat(event.lngLat)
        .setHTML(
          `<strong>${name || 'Segmento stradale'}</strong><br/>Pendenza: ${slope}%<br/>Classe: ${slopeClass}`
        )
        .addTo(map);
    };

    const handleLeave = () => {
      map.getCanvas().style.cursor = '';
      popup.remove();
    };

    const offStyleReady = onStyleReady(map, () => {
      applyFilter();
      map.on('mousemove', slopeLayerId, handleMouseMove);
      map.on('mouseleave', slopeLayerId, handleLeave);
    });

    return () => {
      offStyleReady();
      map.off('mousemove', slopeLayerId, handleMouseMove);
      map.off('mouseleave', slopeLayerId, handleLeave);
      map.getCanvas().style.cursor = '';
      popup.remove();
    };
  }, [activeSection, activeTrailsSubsection, visibleTrailSlopeClasses]);

  return (
    <>
      <section className="legend-panel" aria-label="Sottosezioni Outdoor">
        <strong>Modulo Outdoor</strong>
        <div className="legend-row" role="tablist">
          {OUTDOOR_SECTIONS.map((section) => (
            <button
              key={section}
              type="button"
              role="tab"
              aria-selected={activeSection === section}
              className={activeSection === section ? 'module-link active' : 'module-link'}
              onClick={() => navigateToOutdoorSection(section)}
            >
              <i className={`bi ${OUTDOOR_SECTION_ICONS[section]} tab-icon`} aria-hidden="true" />
              {getOutdoorSectionLabel(section)}
            </button>
          ))}
        </div>
        <p className="section-description">{getSectionDescription(activeSection)}</p>
      </section>

      {activeSection === 'cyclability' ? (
        <CyclabilityTabs
          activeSubsection={activeCyclabilitySubsection}
          onSelectSubsection={navigateToCyclabilitySubsection}
        />
      ) : null}

      {activeSection === 'trails' ? (
        <TrailsTabs activeSubsection={activeTrailsSubsection} onSelectSubsection={navigateToTrailsSubsection} />
      ) : null}

      {isRoutingActive && (
        <RoutingPanel
          enabled={routingEnabled}
          mode={routingMode}
          onToggleEnabled={() => setRoutingEnabled((previous) => !previous)}
        />
      )}

      {activeSection === 'cyclability' && activeCyclabilitySubsection === 'bike-infra' ? (
        <BikeInfraLegend
          visibleBikeInfraCategories={visibleBikeInfraCategories}
          onToggleCategory={toggleBikeInfraCategory}
          onShowAll={showAllBikeInfraCategories}
        />
      ) : null}

      {activeSection === 'trails' && activeTrailsSubsection === 'trails' ? (
        <>
          <TrailsLegend
            visibleTrailCategories={visibleTrailCategories}
            onToggleCategory={toggleTrailCategory}
            onShowAll={showAllTrailCategories}
          />
          <WaterLegend
            visibleWaterCategories={visibleWaterCategories}
            onToggleCategory={toggleWaterCategory}
            onShowAll={showAllWaterCategories}
          />
          <section className="legend-panel" aria-label="Corridoi d'ombra">
            <div className="shade-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={showTrailShade}
                  onChange={(e) => setShowTrailShade(e.target.checked)}
                />
                <span className="shade-swatch" />
                Corridoi d'ombra naturale
              </label>
              {showTrailShade && (
                <p className="shade-legend-hint">
                  Colore chiaro = copertura parziale · Colore scuro = sentiero completamente ombreggiato
                </p>
              )}
            </div>
          </section>
        </>
      ) : null}

      {activeSection === 'trails' && activeTrailsSubsection === 'slope' ? (
        <SlopeLegend
          entries={getSlopeEntries()}
          visibleSlopeClasses={visibleTrailSlopeClasses}
          onToggleSlopeClass={toggleTrailSlopeClass}
          onShowAll={showAllTrailSlopeClasses}
        />
      ) : null}

      {activeSection === 'cyclability' && activeCyclabilitySubsection === 'lts' ? (
        <LtsEmbed />
      ) : (
        <section className="module-view" aria-label="Mappa Outdoor">
          <RoutePlannerOverlay
            active={isRoutingActive && routingEnabled}
            mode={routingMode}
            points={routingPoints}
            summary={routeSummary}
            status={routeStatus}
            onRemovePoint={removeRoutePoint}
            onSwapEnds={swapRouteEnds}
            onUndo={undoRoutePoint}
            onClear={clearRoute}
          />
          <div ref={mapRef} className="map-canvas" />
        </section>
      )}
    </>
  );
}
