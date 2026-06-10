import { useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useModuleMap } from '../../hooks/useModuleMap';

const EVENT_LAYERS = ['hydraulic-risk', 'landslide-risk'] as const;
const ASSET_LAYERS = ['aed', 'hems', 'fire-hydrants', 'assembly-points'] as const;

type RescueGroup = 'events' | 'assets';
type EventLayer = (typeof EVENT_LAYERS)[number];
type AssetLayer = (typeof ASSET_LAYERS)[number];

function getLayerVisibility(visible: boolean): 'visible' | 'none' {
  return visible ? 'visible' : 'none';
}

function groupLabel(group: RescueGroup): string {
  return group === 'events' ? 'Eventi e rischi' : 'Presidi utili';
}

export default function RescueModule() {
  const { mapRef, mapInstanceRef } = useModuleMap('rescue');
  const [activeGroup, setActiveGroup] = useState<RescueGroup>('assets');
  const [visibleEvents, setVisibleEvents] = useState<EventLayer[]>([...EVENT_LAYERS]);
  const [visibleAssets, setVisibleAssets] = useState<AssetLayer[]>([...ASSET_LAYERS]);

  function toggleEventLayer(layer: EventLayer): void {
    setVisibleEvents(prev => prev.includes(layer) ? prev.filter(l => l !== layer) : [...prev, layer]);
  }

  function toggleAssetLayer(layer: AssetLayer): void {
    setVisibleAssets(prev => prev.includes(layer) ? prev.filter(l => l !== layer) : [...prev, layer]);
  }

  function showAllVisibleLayers(): void {
    if (activeGroup === 'events') setVisibleEvents([...EVENT_LAYERS]);
    else setVisibleAssets([...ASSET_LAYERS]);
  }

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
    let hoveredFeature: { source: string; id: string | number } | undefined;
    let listenersAttached = false;

    const setVisibility = (layerId: string, visibility: 'visible' | 'none') => {
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visibility);
    };

    const applyVisibility = () => {
      const ev = activeGroup === 'events';
      const as = activeGroup === 'assets';

      setVisibility('hydraulic-risk-fill',       getLayerVisibility(ev && visibleEvents.includes('hydraulic-risk')));
      setVisibility('hydraulic-risk-outline',     getLayerVisibility(ev && visibleEvents.includes('hydraulic-risk')));
      setVisibility('hydraulic-risk-fill-label',  getLayerVisibility(ev && visibleEvents.includes('hydraulic-risk')));
      setVisibility('landslide-risk-fill',        getLayerVisibility(ev && visibleEvents.includes('landslide-risk')));
      setVisibility('landslide-risk-outline',     getLayerVisibility(ev && visibleEvents.includes('landslide-risk')));
      setVisibility('landslide-risk-fill-label',  getLayerVisibility(ev && visibleEvents.includes('landslide-risk')));
      setVisibility('aed-sites',                  getLayerVisibility(as && visibleAssets.includes('aed')));
      setVisibility('aed-labels',                 getLayerVisibility(as && visibleAssets.includes('aed')));
      setVisibility('hems-sites',                 getLayerVisibility(as && visibleAssets.includes('hems')));
      setVisibility('hems-labels',                getLayerVisibility(as && visibleAssets.includes('hems')));
      setVisibility('fire-hydrant-sites',         getLayerVisibility(as && visibleAssets.includes('fire-hydrants')));
      setVisibility('fire-hydrant-labels',        getLayerVisibility(as && visibleAssets.includes('fire-hydrants')));
      setVisibility('assembly-point-sites',       getLayerVisibility(as && visibleAssets.includes('assembly-points')));
      setVisibility('assembly-point-labels',      getLayerVisibility(as && visibleAssets.includes('assembly-points')));
    };

    const clearHover = () => {
      if (hoveredFeature) { map.setFeatureState(hoveredFeature, { hover: false }); hoveredFeature = undefined; }
      map.getCanvas().style.cursor = '';
      popup.remove();
    };

    const handleMove = (event: maplibregl.MapMouseEvent) => {
      if (activeGroup !== 'events') { clearHover(); return; }

      const activeLayers = [
        ...(visibleEvents.includes('hydraulic-risk') ? ['hydraulic-risk-fill'] : []),
        ...(visibleEvents.includes('landslide-risk') ? ['landslide-risk-fill'] : []),
      ];
      const features = activeLayers.length > 0 ? map.queryRenderedFeatures(event.point, { layers: activeLayers }) : [];
      const feature = features[0];

      if (!feature || feature.id === undefined) { clearHover(); return; }

      const source = String(feature.layer.source);
      const next = { source, id: feature.id };

      if (hoveredFeature && (hoveredFeature.source !== next.source || hoveredFeature.id !== next.id)) {
        map.setFeatureState(hoveredFeature, { hover: false });
      }

      hoveredFeature = next;
      map.setFeatureState(hoveredFeature, { hover: true });
      map.getCanvas().style.cursor = 'pointer';

      const props = feature.properties ?? {};
      popup
        .setLngLat(event.lngLat)
        .setHTML(
          `<strong>${props.name ?? 'Area di rischio'}</strong><br/>` +
          `Classe: ${props.risk_class ?? ''}<br/>` +
          `Ultimo evento: ${props.most_recent_event ?? 'N/D'}<br/>` +
          `${props.event_note ?? ''}` +
          (props.source_note ? `<br/><small>${props.source_note}</small>` : '')
        )
        .addTo(map);
    };

    const attachListeners = () => {
      if (listenersAttached) return;
      map.on('mousemove', handleMove);
      map.on('mouseleave', 'hydraulic-risk-fill', clearHover);
      map.on('mouseleave', 'landslide-risk-fill', clearHover);
      listenersAttached = true;
    };

    if (map.isStyleLoaded()) { applyVisibility(); attachListeners(); }
    else map.once('load', () => { applyVisibility(); attachListeners(); });

    return () => {
      if (listenersAttached) {
        map.off('mousemove', handleMove);
        map.off('mouseleave', 'hydraulic-risk-fill', clearHover);
        map.off('mouseleave', 'landslide-risk-fill', clearHover);
      }
      clearHover();
      popup.remove();
    };
  }, [activeGroup, visibleEvents, visibleAssets]);

  return (
    <>
      <section className="legend-panel" aria-label="Modulo soccorso ed emergenza">
        <strong>Modulo Soccorso ed Emergenza</strong>
        <p className="section-description">
          Due gruppi: eventi di rischio e presidi utili per il soccorso.
        </p>
        <div className="legend-row">
          {(['events', 'assets'] as RescueGroup[]).map(group => (
            <button
              key={group}
              type="button"
              className={activeGroup === group ? 'module-link active' : 'module-link'}
              onClick={() => setActiveGroup(group)}
            >
              {groupLabel(group)}
            </button>
          ))}
          <button type="button" onClick={showAllVisibleLayers}>Mostra tutti</button>
        </div>

        {activeGroup === 'events' ? (
          <div className="legend-row">
            <label>
              <input type="checkbox" checked={visibleEvents.includes('hydraulic-risk')} onChange={() => toggleEventLayer('hydraulic-risk')} />
              <span className="chip chip-hydraulic-risk" /> Rischio idraulico
            </label>
            <label>
              <input type="checkbox" checked={visibleEvents.includes('landslide-risk')} onChange={() => toggleEventLayer('landslide-risk')} />
              <span className="chip chip-landslide-risk" /> Frane e dissesto
            </label>
          </div>
        ) : (
          <div className="legend-row">
            <label>
              <input type="checkbox" checked={visibleAssets.includes('aed')} onChange={() => toggleAssetLayer('aed')} />
              <span className="chip chip-aed" /> Defibrillatori
            </label>
            <label>
              <input type="checkbox" checked={visibleAssets.includes('hems')} onChange={() => toggleAssetLayer('hems')} />
              <span className="chip chip-hems" /> Elisoccorso
            </label>
            <label>
              <input type="checkbox" checked={visibleAssets.includes('fire-hydrants')} onChange={() => toggleAssetLayer('fire-hydrants')} />
              <span className="chip chip-fire-hydrant" /> Idranti
            </label>
            <label>
              <input type="checkbox" checked={visibleAssets.includes('assembly-points')} onChange={() => toggleAssetLayer('assembly-points')} />
              <span className="chip chip-assembly-point" /> Punti raccolta
            </label>
          </div>
        )}
      </section>

      <section className="module-view" aria-label="Mappa Soccorso ed Emergenza">
        <div ref={mapRef} className="map-canvas" />
      </section>
    </>
  );
}
