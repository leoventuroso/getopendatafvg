import { useEffect, useRef, useState } from 'react';
import maplibregl, { type Map } from 'maplibre-gl';
import { createBaseMap } from '../../lib/map';
import { buildRouteSummary, loadRoutingGraphForMode, type RouteSummary, type RoutingInputPoint, type RoutingMode } from '../../lib/routing';
import LtsLegend from './LtsLegend';
import {
  getActiveOutdoorSectionFromHash,
  getActiveCyclabilitySubsectionFromHash,
  getCyclabilitySubsectionLabel,
  getActiveTrailsSubsectionFromHash,
  getOutdoorSectionLabel,
  navigateToCyclabilitySubsection,
  navigateToTrailsSubsection,
  navigateToOutdoorSection,
  type CyclabilitySubsection,
  type OutdoorSection,
  type TrailsSubsection
} from '../../app/routes';

type LtsLevel = 1 | 2 | 3 | 4;
type TrailCategory = 'hiking' | 'mtb';
type WaterCategory = 'drinking_water' | 'spring' | 'picnic_area';
type BikeInfraCategory = 'ciclabili' | 'bike_parking' | 'bike_rental' | 'bike_repair' | 'ebike_charging';
type SlopeClass = '0-3: flat' | '3-5: mild' | '5-8: medium' | '8-10: hard' | '10-20: extreme' | '>20: impossible';
type RouteStatePoint = RoutingInputPoint & { id: string };

const ALL_LTS_LEVELS: LtsLevel[] = [1, 2, 3, 4];
const ALL_TRAIL_CATEGORIES: TrailCategory[] = ['hiking', 'mtb'];
const ALL_WATER_CATEGORIES: WaterCategory[] = ['drinking_water', 'spring', 'picnic_area'];
const ALL_CYCLABILITY_SUBSECTIONS: CyclabilitySubsection[] = ['lts', 'bike-infra', 'slope'];
const ALL_TRAILS_SUBSECTIONS: TrailsSubsection[] = ['trails', 'slope'];
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

function getSectionDescription(section: OutdoorSection): string {
  if (section === 'cyclability') {
    return 'LTS, bike infrastructure e slope per la mobilita ciclabile.';
  }

  return 'Sentieri, hiking, MTB, slope per camminata e punti acqua/picnic.';
}

function getCyclabilityDescription(subsection: CyclabilitySubsection): string {
  if (subsection === 'lts') {
    return 'Classi LTS per leggere la ciclabilita delle strade.';
  }

  if (subsection === 'bike-infra') {
    return 'Cyclepath MV 06, ciclabili e infrastrutture ciclistiche.';
  }

  return 'Strade colorate per classe di pendenza.';
}

function getTrailCategoryLabel(category: TrailCategory): string {
  if (category === 'hiking') {
    return 'Hiking';
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

function getSlopeBikeLabel(slopeClass: SlopeClass): string {
  if (slopeClass === '0-3: flat') {
    return '0-3: flat';
  }

  if (slopeClass === '3-5: mild') {
    return '3-5: mild';
  }

  if (slopeClass === '5-8: medium') {
    return '5-8: medium';
  }

  if (slopeClass === '8-10: hard') {
    return '8-10: hard';
  }

  if (slopeClass === '10-20: extreme') {
    return '10-20: extreme';
  }

  return '>20: impossible';
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

function getSlopeEntries(mode: 'bike' | 'trail') {
  return ALL_SLOPE_CLASSES.map((slopeClass) => ({
    className: slopeClass,
    label: mode === 'bike' ? getSlopeBikeLabel(slopeClass) : getSlopeTrailLabel(slopeClass),
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

function CyclabilityTabs({
  activeSubsection,
  onSelectSubsection
}: {
  activeSubsection: CyclabilitySubsection;
  onSelectSubsection: (subsection: CyclabilitySubsection) => void;
}) {
  return (
    <section className="legend-panel" aria-label="Sottosezioni Cyclability">
      <strong>Cyclability</strong>
      <div className="legend-row">
        {ALL_CYCLABILITY_SUBSECTIONS.map((subsection) => (
          <button
            key={subsection}
            type="button"
            className={activeSubsection === subsection ? 'module-link active' : 'module-link'}
            onClick={() => onSelectSubsection(subsection)}
          >
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
  activeSubsection: TrailsSubsection;
  onSelectSubsection: (subsection: TrailsSubsection) => void;
}) {
  return (
    <section className="legend-panel" aria-label="Sottosezioni Trails">
      <strong>Trails</strong>
      <div className="legend-row">
        {ALL_TRAILS_SUBSECTIONS.map((subsection) => (
          <button
            key={subsection}
            type="button"
            className={activeSubsection === subsection ? 'module-link active' : 'module-link'}
            onClick={() => onSelectSubsection(subsection)}
          >
            {subsection === 'trails' ? 'Trails' : 'Slope'}
          </button>
        ))}
      </div>
      <p className="section-description">
        {activeSubsection === 'trails'
          ? 'Hiking, MTB e punti acqua/picnic.'
          : 'Pendenza delle strade letta con etichette adatte alla camminata.'}
      </p>
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
      <strong>Trails</strong>
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
      <strong>Bike infrastructure
      </strong>
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
    </section>
  );
}

function SlopeLegend({
  title,
  entries,
  visibleSlopeClasses,
  onToggleSlopeClass,
  onShowAll
}: {
  title: string;
  entries: Array<{ className: SlopeClass; label: string; color: string }>;
  visibleSlopeClasses: SlopeClass[];
  onToggleSlopeClass: (slopeClass: SlopeClass) => void;
  onShowAll: () => void;
}) {
  return (
    <section className="legend-panel" aria-label="Legenda pendenza">
      <strong>{title}</strong>
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
    </section>
  );
}

function RoutingPanel({
  enabled,
  mode,
  pointCount,
  summary,
  status,
  onToggleEnabled,
  onUndo,
  onClear
}: {
  enabled: boolean;
  mode: RoutingMode;
  pointCount: number;
  summary: RouteSummary | null;
  status: string;
  onToggleEnabled: () => void;
  onUndo: () => void;
  onClear: () => void;
}) {
  return (
    <section className="legend-panel routing-panel" aria-label="Calcolo percorso">
      <strong>Routing</strong>
      <div className="legend-row routing-row">
        <button type="button" className={enabled ? 'module-link active' : 'module-link'} onClick={onToggleEnabled}>
          {enabled ? 'Routing attivo' : 'Attiva routing'}
        </button>
        <button type="button" onClick={onUndo} disabled={pointCount === 0}>
          Indietro
        </button>
        <button type="button" onClick={onClear} disabled={pointCount === 0}>
          Pulisci
        </button>
      </div>
      <p className="section-description">
        {enabled
          ? `Clicca sulla mappa per aggiungere partenza, arrivo e punti intermedi. Modalita: ${mode === 'biking' ? 'bici' : 'piedi'}.`
          : 'Attiva il routing per calcolare un percorso cliccando sulla mappa.'}
      </p>
      <div className="routing-stats">
        <span className="routing-stat">Punti: {pointCount}</span>
        <span className="routing-stat">{status}</span>
        {summary ? (
          <span className="routing-stat">
            {formatDistance(summary.distanceKm)} · {formatTime(summary.timeMin)}
          </span>
        ) : null}
        {summary ? <span className="routing-stat">+{Math.round(summary.elevationGainM)} m</span> : null}
        {summary ? <span className="routing-stat">-{Math.round(summary.elevationLossM)} m</span> : null}
      </div>
    </section>
  );
}

function RouteElevationProfile({ summary }: { summary: RouteSummary | null }) {
  if (!summary || summary.profile.length < 2) {
    return null;
  }

  const width = 420;
  const height = 210;
  const margin = {
    top: 14,
    right: 16,
    bottom: 36,
    left: 54
  };
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
    <section className="route-profile-panel" aria-label="Profilo altimetrico percorso">
      <div className="route-profile-header">
        <strong>Profilo altimetrico</strong>
        <span>relativo</span>
      </div>
      <div className="route-profile-metrics">
        <span>+{Math.round(summary.elevationGainM)} m</span>
        <span>-{Math.round(summary.elevationLossM)} m</span>
      </div>
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
    </section>
  );
}

export default function OutdoorModule() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const [activeSection, setActiveSection] = useState<OutdoorSection>(
    getActiveOutdoorSectionFromHash()
  );
  const [activeCyclabilitySubsection, setActiveCyclabilitySubsection] = useState<CyclabilitySubsection>(
    getActiveCyclabilitySubsectionFromHash()
  );
  const [activeTrailsSubsection, setActiveTrailsSubsection] = useState<TrailsSubsection>(
    getActiveTrailsSubsectionFromHash()
  );
  const [visibleLts, setVisibleLts] = useState<LtsLevel[]>(ALL_LTS_LEVELS);
  const [visibleTrailCategories, setVisibleTrailCategories] = useState<TrailCategory[]>(ALL_TRAIL_CATEGORIES);
  const [visibleWaterCategories, setVisibleWaterCategories] = useState<WaterCategory[]>(ALL_WATER_CATEGORIES);
  const [visibleBikeInfraCategories, setVisibleBikeInfraCategories] = useState<BikeInfraCategory[]>(ALL_BIKE_INFRA_CATEGORIES);
  const [visibleCyclabilitySlopeClasses, setVisibleCyclabilitySlopeClasses] = useState<SlopeClass[]>(ALL_SLOPE_CLASSES);
  const [visibleTrailSlopeClasses, setVisibleTrailSlopeClasses] = useState<SlopeClass[]>(ALL_SLOPE_CLASSES);
  const [routingEnabled, setRoutingEnabled] = useState(false);
  const [routingPoints, setRoutingPoints] = useState<RouteStatePoint[]>([]);
  const [routingGraph, setRoutingGraph] = useState<Awaited<ReturnType<typeof loadRoutingGraphForMode>> | null>(null);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [routeStatus, setRouteStatus] = useState('Nessun percorso calcolato');
  const routingMode: RoutingMode = activeSection === 'cyclability' ? 'biking' : 'walking';

  function toggleLtsLevel(level: LtsLevel): void {
    setVisibleLts((previous) => {
      if (previous.includes(level)) {
        return previous.filter((item) => item !== level);
      }

      return [...previous, level].sort() as LtsLevel[];
    });
  }

  function showAllLts(): void {
    setVisibleLts(ALL_LTS_LEVELS);
  }

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

  function toggleCyclabilitySlopeClass(slopeClass: SlopeClass): void {
    setVisibleCyclabilitySlopeClasses((previous) => {
      if (previous.includes(slopeClass)) {
        return previous.filter((item) => item !== slopeClass);
      }

      return [...previous, slopeClass].sort() as SlopeClass[];
    });
  }

  function showAllCyclabilitySlopeClasses(): void {
    setVisibleCyclabilitySlopeClasses(ALL_SLOPE_CLASSES);
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
      if (!routingEnabled) {
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

    map.getCanvas().style.cursor = routingEnabled ? 'crosshair' : '';
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

    const routeFeatures = routeSummary ? [routeSummary.line, ...routeSummary.points.features] : [];

    const applyData = () => {
      const source = map.getSource('route') as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData({ type: 'FeatureCollection', features: routeFeatures } as never);
      }
    };

    if (map.isStyleLoaded()) {
      applyData();
      return;
    }

    map.once('load', applyData);
  }, [routeSummary, activeSection, activeCyclabilitySubsection, activeTrailsSubsection]);

  useEffect(() => {
    const onHashChange = () => {
      const section = getActiveOutdoorSectionFromHash();
      const cyclabilitySubsection = getActiveCyclabilitySubsectionFromHash();
      const trailsSubsection = getActiveTrailsSubsectionFromHash();
      setActiveSection(section);
      setActiveCyclabilitySubsection(cyclabilitySubsection);
      setActiveTrailsSubsection(trailsSubsection);
    };

    window.addEventListener('hashchange', onHashChange);
    if (
      window.location.hash === '#/outdoor' ||
      window.location.hash === '#/outdoor/' ||
      window.location.hash === '#/outdoor/cyclability' ||
      window.location.hash === '#/outdoor/cyclability/'
    ) {
      navigateToOutdoorSection('cyclability', 'lts');
    }

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
    if (!map || activeSection !== 'cyclability' || activeCyclabilitySubsection !== 'lts') {
      return;
    }

    const applyFilter = () => {
      if (map.getLayer('lts-overlay')) {
        map.setFilter('lts-overlay', [
          'in',
          ['to-number', ['get', 'lts'], 0],
          ['literal', visibleLts]
        ]);
      }
    };

    if (map.isStyleLoaded()) {
      applyFilter();
      return;
    }

    map.once('load', applyFilter);
  }, [activeSection, activeCyclabilitySubsection, visibleLts]);

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

    if (map.isStyleLoaded()) {
      applyVisibility();
      return;
    }

    map.once('load', applyVisibility);
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

    if (map.isStyleLoaded()) {
      applyVisibility();
      return;
    }

    map.once('load', applyVisibility);
  }, [activeSection, activeTrailsSubsection, visibleTrailCategories, visibleWaterCategories]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const slopeLayerId =
      activeSection === 'cyclability' && activeCyclabilitySubsection === 'slope'
        ? 'slope-network-cyclability'
        : activeSection === 'trails' && activeTrailsSubsection === 'slope'
          ? 'slope-network-trails'
          : null;

    const visibleSlopeClasses =
      activeSection === 'cyclability' && activeCyclabilitySubsection === 'slope'
        ? visibleCyclabilitySlopeClasses
        : activeSection === 'trails' && activeTrailsSubsection === 'slope'
          ? visibleTrailSlopeClasses
          : null;

    if (!map || !slopeLayerId || !visibleSlopeClasses) {
      return;
    }

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

    if (map.isStyleLoaded()) {
      applyFilter();
      map.on('mousemove', slopeLayerId, handleMouseMove);
      map.on('mouseleave', slopeLayerId, handleLeave);
    } else {
      map.once('load', () => {
        applyFilter();
        map.on('mousemove', slopeLayerId, handleMouseMove);
        map.on('mouseleave', slopeLayerId, handleLeave);
      });
    }

    return () => {
      map.off('mousemove', slopeLayerId, handleMouseMove);
      map.off('mouseleave', slopeLayerId, handleLeave);
      map.getCanvas().style.cursor = '';
      popup.remove();
    };
  }, [
    activeSection,
    activeCyclabilitySubsection,
    activeTrailsSubsection,
    visibleCyclabilitySlopeClasses,
    visibleTrailSlopeClasses
  ]);

  return (
    <>
      <section className="legend-panel" aria-label="Sottosezioni Outdoor">
        <strong>Outdoor</strong>
        <div className="legend-row">
          {OUTDOOR_SECTIONS.map((section) => (
            <button
              key={section}
              type="button"
              className={activeSection === section ? 'module-link active' : 'module-link'}
              onClick={() => navigateToOutdoorSection(section, section === 'cyclability' ? 'lts' : undefined)}
            >
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

      <RoutingPanel
        enabled={routingEnabled}
        mode={routingMode}
        pointCount={routingPoints.length}
        summary={routeSummary}
        status={routeStatus}
        onToggleEnabled={() => setRoutingEnabled((previous) => !previous)}
        onUndo={undoRoutePoint}
        onClear={clearRoute}
      />

      {activeSection === 'cyclability' && activeCyclabilitySubsection === 'lts' ? (
        <LtsLegend visibleLts={visibleLts} onToggleLevel={toggleLtsLevel} onShowAll={showAllLts} />
      ) : null}

      {activeSection === 'cyclability' && activeCyclabilitySubsection === 'bike-infra' ? (
        <BikeInfraLegend
          visibleBikeInfraCategories={visibleBikeInfraCategories}
          onToggleCategory={toggleBikeInfraCategory}
          onShowAll={showAllBikeInfraCategories}
        />
      ) : null}

      {activeSection === 'cyclability' && activeCyclabilitySubsection === 'slope' ? (
        <SlopeLegend
          title="Slope (bike)"
          entries={getSlopeEntries('bike')}
          visibleSlopeClasses={visibleCyclabilitySlopeClasses}
          onToggleSlopeClass={toggleCyclabilitySlopeClass}
          onShowAll={showAllCyclabilitySlopeClasses}
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
        </>
      ) : null}

      {activeSection === 'trails' && activeTrailsSubsection === 'slope' ? (
        <SlopeLegend
          title="Slope (hiking)"
          entries={getSlopeEntries('trail')}
          visibleSlopeClasses={visibleTrailSlopeClasses}
          onToggleSlopeClass={toggleTrailSlopeClass}
          onShowAll={showAllTrailSlopeClasses}
        />
      ) : null}

      <section className="module-view" aria-label="Mappa Outdoor">
        <RouteElevationProfile summary={routeSummary} />
        <div ref={mapRef} className="map-canvas" />
      </section>
    </>
  );
}
