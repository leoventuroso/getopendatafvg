import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { createBaseMap } from '../lib/map';
import type { MapModule } from '../lib/map';

export function useModuleMap(module: MapModule) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    let map: maplibregl.Map | undefined;
    if (mapRef.current) {
      map = createBaseMap(mapRef.current, { module });
      mapInstanceRef.current = map;
    }
    return () => {
      map?.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  return { mapRef, mapInstanceRef };
}
