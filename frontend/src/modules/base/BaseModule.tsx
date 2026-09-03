import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { APP_CONFIG } from '../../config';
import { useModuleMap } from '../../hooks/useModuleMap';
import { onStyleReady } from '../../lib/map';
import ModuleCards from './ModuleCards';
import FrazioniList, { type FrazioneFeature } from './FrazioniList';
import MunicipalityStatsPanel, { type MunicipalityStats } from './MunicipalityStats';
import WeatherCard from './WeatherCard';
import './base.css';

type Parcel = { foglio: string; particella: string; lng: number; lat: number };

export default function BaseModule() {
  const { mapRef, mapInstanceRef } = useModuleMap('base');
  const [stats, setStats] = useState<MunicipalityStats | null>(null);
  const [frazioni, setFrazioni] = useState<FrazioneFeature[]>([]);
  const [selectedFrazione, setSelectedFrazione] = useState<string | null>(null);
  const [showCatasto, setShowCatasto] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const catastoLoadedRef = useRef(false);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/municipality_stats.json`)
      .then(r => r.json())
      .then(setStats)
      .catch(() => null);
  }, []);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/frazioni.geojson`)
      .then(r => r.json())
      .then((geojson) => {
        const items: FrazioneFeature[] = geojson.features.map(
          (f: { properties: FrazioneFeature }) => f.properties
        );
        setFrazioni(items);
      })
      .catch(() => null);
  }, []);

  function selectFrazione(f: FrazioneFeature) {
    const map = mapInstanceRef.current;
    if (!map) return;
    setSelectedFrazione(f.name);
    map.flyTo({ center: [f.centroid_lon, f.centroid_lat], zoom: 14, duration: 900 });
  }

  // Cadastral parcels: load on first enable, toggle layer visibility, and pull
  // the map close enough that the parcel markers (minzoom 15) actually show.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const apply = () => {
      const visibility = showCatasto ? 'visible' : 'none';
      for (const id of ['catasto-points', 'catasto-labels']) {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visibility);
      }
      if (showCatasto) {
        const source = map.getSource('catasto') as maplibregl.GeoJSONSource | undefined;
        if (source && !catastoLoadedRef.current) {
          source.setData(`${import.meta.env.BASE_URL}data/catasto.geojson`);
          catastoLoadedRef.current = true;
        }
        if (map.getZoom() < 15) map.easeTo({ zoom: 15.5, duration: 700 });
      }
    };

    return onStyleReady(map, apply);
  }, [showCatasto]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !showCatasto) return;

    // Parcel markers are tiny; query a small box around the click so near
    // misses still register.
    const boxAround = (p: { x: number; y: number }, r: number): [maplibregl.PointLike, maplibregl.PointLike] =>
      [[p.x - r, p.y - r], [p.x + r, p.y + r]];

    const onClick = (event: maplibregl.MapMouseEvent) => {
      if (!map.getLayer('catasto-points')) return;
      const p = event.point;
      // exact hit first, otherwise the nearest parcel within a wider radius
      const pick = (r: number) => map
        .queryRenderedFeatures(boxAround(p, r), { layers: ['catasto-points'] })
        .filter((feat): feat is typeof feat & { geometry: GeoJSON.Point } => feat.geometry.type === 'Point');

      let hits = pick(6);
      if (hits.length === 0) hits = pick(40);
      const f = hits.sort((a, b) => {
        const pa = map.project(a.geometry.coordinates as [number, number]);
        const pb = map.project(b.geometry.coordinates as [number, number]);
        return Math.hypot(pa.x - p.x, pa.y - p.y) - Math.hypot(pb.x - p.x, pb.y - p.y);
      })[0];
      if (!f) return;
      const [lng, lat] = f.geometry.coordinates as [number, number];
      setSelectedParcel({
        foglio: String(f.properties?.foglio ?? ''),
        particella: String(f.properties?.particella ?? ''),
        lng,
        lat
      });
    };
    const move = (event: maplibregl.MapMouseEvent) => {
      if (!map.getLayer('catasto-points')) return;
      const near = map.queryRenderedFeatures(
        [[event.point.x - 6, event.point.y - 6], [event.point.x + 6, event.point.y + 6]],
        { layers: ['catasto-points'] }
      );
      map.getCanvas().style.cursor = near.length ? 'pointer' : '';
    };

    map.on('click', onClick);
    map.on('mousemove', move);
    return () => {
      map.off('click', onClick);
      map.off('mousemove', move);
      map.getCanvas().style.cursor = '';
    };
  }, [showCatasto]);

  return (
    <section className="home-layout" aria-label="Home">
      <aside className="home-panel">
        <div className="home-intro">
          <h2 className="home-title">{APP_CONFIG.municipality.name}</h2>
          <p className="home-subtitle">
            Piattaforma civica open-source per la mobilità sostenibile, l'ambiente, la resilienza del territorio e la partecipazione della comunità.
          </p>
        </div>

        <WeatherCard />

        <ModuleCards />

        <section className="legend-panel catasto-panel" aria-label="Particelle catastali">
          <label className="catasto-toggle">
            <input
              type="checkbox"
              checked={showCatasto}
              onChange={(e) => { setShowCatasto(e.target.checked); if (!e.target.checked) setSelectedParcel(null); }}
            />
            <span className="chip" style={{ background: '#8a5a00' }} /> Particelle catastali
          </label>

          {showCatasto && !selectedParcel && (
            <p className="section-description">
              Zooma sulla mappa e clicca un punto per leggere <b>foglio</b> e <b>particella</b>.
            </p>
          )}

          {selectedParcel && (
            <div className="catasto-detail">
              <strong>Foglio {selectedParcel.foglio} &middot; Particella {selectedParcel.particella}</strong>
              <p>
                Comune catastale {APP_CONFIG.municipality.cadastralCode ?? ''} ({APP_CONFIG.municipality.name}).
                Serve per pagare IMU/TARI, chiedere una <b>visura</b>, pratiche edilizie (CILA/SCIA),
                successioni, compravendite, mutui.
              </p>
              <p className="catasto-links">
                <a
                  href="https://www.agenziaentrate.gov.it/portale/schede/fabbricatiterreni/visura-catastale/consultazione-rendite-catastali"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Consulta rendita / visura (Agenzia delle Entrate)
                </a>
              </p>
              <p className="catasto-caveat">
                Dati aperti onData (CC BY 4.0): solo catasto terreni, senza proprietari né rendite.
                Il confine catastale non è probatorio (non è il confine legale al centimetro), e un
                fabbricato non mappato qui va verificato a parte.
              </p>
            </div>
          )}
        </section>

        <FrazioniList
          frazioni={frazioni}
          selectedName={selectedFrazione}
          onSelect={selectFrazione}
        />

        {stats && <MunicipalityStatsPanel stats={stats} />}
      </aside>

      <div ref={mapRef} className="map-canvas home-map" />
    </section>
  );
}
