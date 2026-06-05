import { useEffect, useRef } from 'react';
import type { Map } from 'maplibre-gl';
import { createBaseMap } from '../../lib/map';

export default function BaseModule() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<Map | null>(null);

  useEffect(() => {
    let map: Map | undefined;

    if (mapRef.current) {
      map = createBaseMap(mapRef.current, { module: 'base' });
      mapInstanceRef.current = map;
    }

    return () => {
      map?.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  return (
    <section className="module-view" aria-label="Mappa base">
      <div ref={mapRef} className="map-canvas" />
    </section>
  );
}
