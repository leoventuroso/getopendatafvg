import { useEffect, useState } from 'react';
import { APP_CONFIG } from '../../config';
import { useModuleMap } from '../../hooks/useModuleMap';
import ModuleCards from './ModuleCards';
import FrazioniList, { type FrazioneFeature } from './FrazioniList';
import MunicipalityStatsPanel, { type MunicipalityStats } from './MunicipalityStats';
import './base.css';

export default function BaseModule() {
  const { mapRef, mapInstanceRef } = useModuleMap('base');
  const [stats, setStats] = useState<MunicipalityStats | null>(null);
  const [frazioni, setFrazioni] = useState<FrazioneFeature[]>([]);
  const [selectedFrazione, setSelectedFrazione] = useState<string | null>(null);

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

  return (
    <section className="home-layout" aria-label="Home">
      <aside className="home-panel">
        <div className="home-intro">
          <h2 className="home-title">{APP_CONFIG.municipality.name}</h2>
          <p className="home-subtitle">
            Piattaforma civica open-source per la mobilità sostenibile, l'ambiente, la resilienza del territorio e la partecipazione della comunità.
          </p>
        </div>

        <ModuleCards />

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
