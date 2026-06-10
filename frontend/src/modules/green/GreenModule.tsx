import { useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useModuleMap } from '../../hooks/useModuleMap';
import GreenLegend, {
  ALL_NDVI_CLASSES, NDVI_CLASS_CONFIG, NBR_CLASS_CONFIG, LST_CLASS_CONFIG,
  type NdviClass, type NbrClass, type LstClass, type ClassStats,
} from './GreenLegend';
import './green.css';

function computeStats(
  features: { properties: Record<string, unknown> }[]
): Record<NdviClass, ClassStats> | null {
  const totals: Partial<Record<NdviClass, number>> = {};
  let hasArea = false;

  for (const f of features) {
    const cls = f.properties.ndvi_class as NdviClass;
    const area = f.properties.area_m2 as number | undefined;
    if (!cls || area == null) continue;
    hasArea = true;
    totals[cls] = (totals[cls] ?? 0) + area;
  }

  if (!hasArea) return null;

  const totalAll = Object.values(totals).reduce((s, v) => s + (v ?? 0), 0);
  if (totalAll === 0) return null;

  return Object.fromEntries(
    ALL_NDVI_CLASSES.map(cls => {
      const areaM2 = totals[cls] ?? 0;
      return [cls, { areaM2, pct: (areaM2 / totalAll) * 100 }];
    })
  ) as Record<NdviClass, ClassStats>;
}

export default function GreenModule() {
  const { mapRef, mapInstanceRef } = useModuleMap('green');
  const [visibleClasses, setVisibleClasses] = useState<NdviClass[]>(ALL_NDVI_CLASSES);
  const [showShade, setShowShade] = useState(false);
  const [showLst, setShowLst] = useState(false);
  const [showNbr, setShowNbr] = useState(false);
  const [stats, setStats] = useState<Record<NdviClass, ClassStats> | null>(null);

  useEffect(() => {
    fetch('/data/greenery.geojson')
      .then(r => r.json())
      .then(fc => setStats(computeStats(fc.features ?? [])))
      .catch(() => {});
  }, []);

  // NDVI class filter
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const filter: maplibregl.FilterSpecification =
      visibleClasses.length > 0
        ? ['in', ['get', 'ndvi_class'], ['literal', visibleClasses]]
        : ['==', ['get', 'ndvi_class'], '__none__'];

    const apply = () => {
      if (map.getLayer('greenery-fill')) map.setFilter('greenery-fill', filter);
      if (map.getLayer('greenery-outline')) map.setFilter('greenery-outline', filter);
    };

    if (map.isStyleLoaded()) apply(); else map.once('load', apply);
  }, [visibleClasses]);

  // Shade corridors toggle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const visibility = showShade ? 'visible' : 'none';
    const apply = () => {
      if (map.getLayer('shade-corridors')) map.setLayoutProperty('shade-corridors', 'visibility', visibility);
      if (map.getLayer('shade-corridors-casing')) map.setLayoutProperty('shade-corridors-casing', 'visibility', visibility);
    };
    if (map.isStyleLoaded()) apply(); else map.once('load', apply);
  }, [showShade]);

  // NBR toggle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const visibility = showNbr ? 'visible' : 'none';
    const apply = () => {
      if (map.getLayer('nbr-fill')) map.setLayoutProperty('nbr-fill', 'visibility', visibility);
      if (map.getLayer('nbr-outline')) map.setLayoutProperty('nbr-outline', 'visibility', visibility);
    };
    if (map.isStyleLoaded()) apply(); else map.once('load', apply);
  }, [showNbr]);

  // NBR popup
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
    const handleMove = (e: maplibregl.MapLayerMouseEvent) => {
      if (!showNbr) return;
      const cls = e.features?.[0]?.properties?.nbr_class as NbrClass;
      const config = NBR_CLASS_CONFIG[cls];
      if (!config) return;
      map.getCanvas().style.cursor = 'pointer';
      popup.setLngLat(e.lngLat).setHTML(`<strong>${config.label}</strong><br/>NBR ${config.range}`).addTo(map);
    };
    const handleLeave = () => { map.getCanvas().style.cursor = ''; popup.remove(); };
    const attach = () => {
      map.on('mousemove', 'nbr-fill', handleMove);
      map.on('mouseleave', 'nbr-fill', handleLeave);
    };
    if (map.isStyleLoaded()) attach(); else map.once('load', attach);
    return () => {
      map.off('mousemove', 'nbr-fill', handleMove);
      map.off('mouseleave', 'nbr-fill', handleLeave);
      popup.remove();
    };
  }, [showNbr]);

  // LST toggle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const visibility = showLst ? 'visible' : 'none';
    const apply = () => {
      if (map.getLayer('lst-fill')) map.setLayoutProperty('lst-fill', 'visibility', visibility);
      if (map.getLayer('lst-outline')) map.setLayoutProperty('lst-outline', 'visibility', visibility);
    };
    if (map.isStyleLoaded()) apply(); else map.once('load', apply);
  }, [showLst]);

  // LST popup
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
    const handleMove = (e: maplibregl.MapLayerMouseEvent) => {
      if (!showLst) return;
      const cls = e.features?.[0]?.properties?.lst_class as LstClass;
      const config = LST_CLASS_CONFIG[cls];
      if (!config) return;
      map.getCanvas().style.cursor = 'pointer';
      popup.setLngLat(e.lngLat).setHTML(`<strong>${config.label}</strong><br/>${config.range}`).addTo(map);
    };
    const handleLeave = () => { map.getCanvas().style.cursor = ''; popup.remove(); };
    const attach = () => {
      map.on('mousemove', 'lst-fill', handleMove);
      map.on('mouseleave', 'lst-fill', handleLeave);
    };
    if (map.isStyleLoaded()) attach(); else map.once('load', attach);
    return () => {
      map.off('mousemove', 'lst-fill', handleMove);
      map.off('mouseleave', 'lst-fill', handleLeave);
      popup.remove();
    };
  }, [showLst]);

  // NDVI popup
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
    const handleMove = (e: maplibregl.MapLayerMouseEvent) => {
      const cls = String(e.features?.[0]?.properties?.ndvi_class ?? '');
      const config = NDVI_CLASS_CONFIG[cls as NdviClass];
      if (!config) return;
      map.getCanvas().style.cursor = 'pointer';
      popup.setLngLat(e.lngLat).setHTML(`<strong>${config.label}</strong>`).addTo(map);
    };
    const handleLeave = () => { map.getCanvas().style.cursor = ''; popup.remove(); };
    const attach = () => {
      map.on('mousemove', 'greenery-fill', handleMove);
      map.on('mouseleave', 'greenery-fill', handleLeave);
    };
    if (map.isStyleLoaded()) attach(); else map.once('load', attach);
    return () => {
      map.off('mousemove', 'greenery-fill', handleMove);
      map.off('mouseleave', 'greenery-fill', handleLeave);
      popup.remove();
    };
  }, []);

  // Shade popup
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
    const handleMove = (e: maplibregl.MapLayerMouseEvent) => {
      if (!showShade) return;
      const props = e.features?.[0]?.properties ?? {};
      const name = (props.name as string) || '';
      const shadePct = props.shade_pct as number;
      const lengthM = props.length_m as number;
      const type = props.type === 'trail' ? 'Sentiero' : 'Strada';
      map.getCanvas().style.cursor = 'pointer';
      popup
        .setLngLat(e.lngLat)
        .setHTML(
          `<strong>${name || type}</strong><br/>` +
          `Ombra: <strong>${shadePct}%</strong><br/>` +
          `Lunghezza: ${lengthM >= 1000 ? (lengthM / 1000).toFixed(1) + ' km' : lengthM + ' m'}`
        )
        .addTo(map);
    };
    const handleLeave = () => { map.getCanvas().style.cursor = ''; popup.remove(); };
    const attach = () => {
      map.on('mousemove', 'shade-corridors', handleMove);
      map.on('mouseleave', 'shade-corridors', handleLeave);
    };
    if (map.isStyleLoaded()) attach(); else map.once('load', attach);
    return () => {
      map.off('mousemove', 'shade-corridors', handleMove);
      map.off('mouseleave', 'shade-corridors', handleLeave);
      popup.remove();
    };
  }, [showShade]);

  return (
    <>
      <GreenLegend
        visibleClasses={visibleClasses}
        showShade={showShade}
        showNbr={showNbr}
        showLst={showLst}
        stats={stats}
        onToggleClass={cls =>
          setVisibleClasses(prev =>
            prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
          )
        }
        onShowAll={() => setVisibleClasses(ALL_NDVI_CLASSES)}
        onToggleShade={setShowShade}
        onToggleNbr={setShowNbr}
        onToggleLst={setShowLst}
      />
      <section className="module-view" aria-label="Mappa copertura vegetale">
        <div ref={mapRef} className="map-canvas" />
      </section>
    </>
  );
}
