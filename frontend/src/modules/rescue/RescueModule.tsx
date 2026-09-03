import { useEffect, useMemo, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { useModuleMap } from '../../hooks/useModuleMap';
import { onStyleReady } from '../../lib/map';
import Faq from '../../components/Faq';

const ASSET_LAYERS = ['aed', 'hems', 'fire-hydrants', 'assembly-points'] as const;
const ASSET_SITE_LAYERS = ['aed-sites', 'hems-sites', 'fire-hydrant-sites', 'assembly-point-sites'];

// The rii census carries surveys of very different vintage. We let people filter
// by how current the data is rather than by an (absent) official risk class.
const RII_FILTERS = ['recenti', 'storici'] as const;
const RII_STATI: Record<RiiFilter, string[]> = {
  recenti: ['aggiornato_2024', 'solo_foto_2024'],
  storici: ['storico_2013', 'storico_2007'],
};

const FIRE_CAUSES = ['dolosa', 'colposa', 'naturale', 'ignota'] as const;
const FIRE_CAUSE_LABEL: Record<FireCause, string> = {
  dolosa: 'Dolose',
  colposa: 'Colpose',
  naturale: 'Naturali (fulmini)',
  ignota: 'Ignote',
};

// Compact legend for the optional NBR overlay (mirrors the Green module's NBR
// classes / colours from pipeline/scripts/process_nbr.py).
const NBR_LEGEND: Array<{ label: string; color: string }> = [
  { label: 'Vegetazione sana', color: '#1a9641' },
  { label: 'Moderata', color: '#a6d96a' },
  { label: 'Stress idrico', color: '#ffffbf' },
  { label: 'Degradata', color: '#fdae61' },
  { label: 'Suolo nudo / bruciato', color: '#d7191c' },
];

type RescueGroup = 'events' | 'fire' | 'assets';
type RiiFilter = (typeof RII_FILTERS)[number];
type FireCause = (typeof FIRE_CAUSES)[number];
type AssetLayer = (typeof ASSET_LAYERS)[number];

const STATO_BADGE: Record<string, string> = {
  aggiornato_2024: 'Rilievo 2024',
  solo_foto_2024: 'Solo foto 2024',
  storico_2013: 'Dati fermi al 2013',
  storico_2007: 'Dati fermi al 2007',
};

function getLayerVisibility(visible: boolean): 'visible' | 'none' {
  return visible ? 'visible' : 'none';
}

function groupLabel(group: RescueGroup): string {
  if (group === 'events') return 'Rii a rischio';
  if (group === 'fire') return 'Incendi boschivi';
  return 'Presidi di soccorso';
}

function groupIcon(group: RescueGroup): string {
  if (group === 'events') return 'bi-exclamation-triangle';
  if (group === 'fire') return 'bi-fire';
  return 'bi-heart-pulse';
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function riiSection(title: string, body: unknown): string {
  const text = String(body ?? '').trim();
  if (!text || /^non disponibile/i.test(text) || /^non documentata/i.test(text)) return '';
  return `<p class="rii-field"><b>${esc(title)}</b><br/>${esc(text)}</p>`;
}

function riiPopupHTML(props: Record<string, unknown>): string {
  const base = import.meta.env.BASE_URL;
  const stato = String(props.stato ?? '');
  const badge = STATO_BADGE[stato] ?? '';
  const posLabel = props.pos_approssimata
    ? 'posizione approssimata'
    : `posizione ${props.pos_affidabilita || 'da verificare'}`;

  const photo = props.foto
    ? `<img class="rii-photo" src="${esc(base + props.foto)}" alt="Foto ${esc(props.nome)}" loading="lazy" />`
    : '';
  const evento = props.foto_evento
    ? `<figure class="rii-evento"><img src="${esc(base + props.foto_evento)}" alt="${esc(props.foto_evento_didascalia)}" loading="lazy" />` +
      `<figcaption>${esc(props.foto_evento_didascalia)}</figcaption></figure>`
    : '';

  return (
    `<div class="rii-popup">` +
    photo +
    `<strong>${esc(props.nome)}</strong>` +
    `<div class="rii-badges"><span class="rii-badge rii-badge-${esc(stato)}">${esc(badge)}</span>` +
    `<span class="rii-badge rii-badge-pos">${esc(posLabel)}</span></div>` +
    (props.area ? `<p class="rii-area">${esc(props.area)}</p>` : '') +
    (props.anno_rilievo ? `<p class="rii-area">Rilievo: ${esc(props.anno_rilievo)}</p>` : '') +
    riiSection('Criticità', props.descrizione) +
    riiSection('Punti critici', props.punti_critici) +
    riiSection('Interventi proposti', props.interventi) +
    riiSection('Eventi recenti', props.eventi_recenti) +
    evento +
    `</div>`
  );
}

// Source values carry hyphen separators ("Prati - Pascoli") and ISO dates
// ("1993-01-08"). Reformat both for display.
function tidyDashes(text: string): string {
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return text.replace(/\s+-\s+/g, ' / ');
}

function fireRow(label: string, value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text || /^assenti?$/i.test(text)) return '';
  return `<p class="rii-field"><b>${esc(label)}</b><br/>${esc(tidyDashes(text))}</p>`;
}

function firePopupHTML(props: Record<string, unknown>): string {
  const localita = String(props.localita ?? '').trim() || 'Località non indicata';
  const title = props.anno ? `${esc(localita)} (${esc(props.anno)})` : esc(localita);
  return (
    `<div class="rii-popup">` +
    `<strong>${title}</strong>` +
    `<div class="rii-badges"><span class="rii-badge rii-badge-fire-${esc(props.causa_classe)}">${esc(props.causa ?? '')}</span></div>` +
    fireRow('Data di inizio', props.data_inizio) +
    fireRow('Durata', props.durata) +
    fireRow('Luogo di innesco', props.luogo_inizio) +
    fireRow('Stato della vegetazione', props.stato_vegetazione) +
    fireRow('Vincoli naturali', props.vincoli_naturali) +
    fireRow('Codice foglio notizie', props.codice) +
    `</div>`
  );
}

const ASSET_KIND: Record<string, string> = {
  defibrillator: 'Defibrillatore (DAE)',
  hems: 'Elisuperficie',
  fire_hydrant: 'Idrante',
  assembly_point: 'Punto di raccolta',
};

function accessLabel(value: string): string {
  const map: Record<string, string> = {
    yes: 'libero', permissive: 'libero', public: 'libero',
    customers: 'riservato (clienti / utenti)', private: 'privato', permit: 'su richiesta',
  };
  return map[value] ?? value;
}

function assetPopupHTML(props: Record<string, unknown>): string {
  const kind = ASSET_KIND[String(props.class ?? '')] ?? 'Presidio';
  const name = String(props['name:it'] ?? props.name ?? props.address ?? '').trim();
  const hours = String(props.opening_hours ?? '').trim();
  const rows =
    fireRow('Dove si trova', props['defibrillator:location'] ?? props.description) +
    fireRow('Orari', hours === '24/7' ? 'Sempre accessibile (24/7)' : hours) +
    (props.access ? fireRow('Accesso', accessLabel(String(props.access))) : '') +
    (props.indoor === 'yes' ? fireRow('Collocazione', 'Interno') : '') +
    fireRow('Gestore', props.operator) +
    fireRow('Telefono', props.phone);
  const note = props.geocoded
    ? `<p class="rii-area">Posizione ricavata dall'indirizzo (${esc(props.geo_precision ?? 'approssimata')}), da verificare sul posto.</p>`
    : props.fixme
      ? `<p class="rii-area">Posizione indicativa, da verificare sul posto.</p>`
      : '';
  return (
    `<div class="rii-popup">` +
    `<strong>${esc(name || kind)}</strong>` +
    `<div class="rii-badges"><span class="rii-badge">${esc(kind)}</span></div>` +
    rows +
    note +
    `</div>`
  );
}

export default function RescueModule() {
  const { mapRef, mapInstanceRef } = useModuleMap('rescue');
  const [activeGroup, setActiveGroup] = useState<RescueGroup>('events');
  const [visibleRii, setVisibleRii] = useState<RiiFilter[]>([...RII_FILTERS]);
  const [visibleCauses, setVisibleCauses] = useState<FireCause[]>([...FIRE_CAUSES]);
  const [showBurnIndex, setShowBurnIndex] = useState(false);
  const [visibleAssets, setVisibleAssets] = useState<AssetLayer[]>([...ASSET_LAYERS]);

  const allowedStati = useMemo(() => visibleRii.flatMap(f => RII_STATI[f]), [visibleRii]);

  function toggleRiiFilter(filter: RiiFilter): void {
    setVisibleRii(prev => prev.includes(filter) ? prev.filter(l => l !== filter) : [...prev, filter]);
  }

  function toggleCause(cause: FireCause): void {
    setVisibleCauses(prev => prev.includes(cause) ? prev.filter(c => c !== cause) : [...prev, cause]);
  }

  function toggleAssetLayer(layer: AssetLayer): void {
    setVisibleAssets(prev => prev.includes(layer) ? prev.filter(l => l !== layer) : [...prev, layer]);
  }

  function showAllVisibleLayers(): void {
    if (activeGroup === 'events') setVisibleRii([...RII_FILTERS]);
    else if (activeGroup === 'fire') setVisibleCauses([...FIRE_CAUSES]);
    else setVisibleAssets([...ASSET_LAYERS]);
  }

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: 'min(320px, calc(100vw - 32px))',
      className: 'rii-popup-shell',
    });
    let hovered: { source: string; id: string | number } | undefined;
    let listenersAttached = false;

    const setVisibility = (layerId: string, visibility: 'visible' | 'none') => {
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visibility);
    };

    const RII_LAYERS = ['rii-line-casing', 'rii-line', 'rii-points', 'rii-labels'];
    const FIRE_LAYERS = ['fire-perimeters-fill', 'fire-perimeters-outline'];

    const applyVisibility = () => {
      const ev = activeGroup === 'events';
      const fi = activeGroup === 'fire';
      const as = activeGroup === 'assets';

      const statoMatch: maplibregl.ExpressionSpecification = allowedStati.length > 0
        ? ['in', ['get', 'stato'], ['literal', allowedStati]]
        : ['==', ['get', 'stato'], '__none__'];

      for (const id of RII_LAYERS) {
        if (!map.getLayer(id)) continue;
        setVisibility(id, getLayerVisibility(ev));
        const geom = id === 'rii-points' ? 'Point' : id === 'rii-labels' ? null : 'LineString';
        map.setFilter(id, geom
          ? ['all', ['==', ['geometry-type'], geom], statoMatch]
          : statoMatch);
      }

      const causeMatch: maplibregl.ExpressionSpecification = visibleCauses.length > 0
        ? ['in', ['get', 'causa_classe'], ['literal', [...visibleCauses]]]
        : ['==', ['get', 'causa_classe'], '__none__'];
      for (const id of FIRE_LAYERS) {
        if (!map.getLayer(id)) continue;
        setVisibility(id, getLayerVisibility(fi));
        map.setFilter(id, causeMatch);
      }

      setVisibility('nbr-fill', getLayerVisibility(fi && showBurnIndex));
      setVisibility('nbr-outline', getLayerVisibility(fi && showBurnIndex));

      setVisibility('aed-sites',             getLayerVisibility(as && visibleAssets.includes('aed')));
      setVisibility('aed-labels',            getLayerVisibility(as && visibleAssets.includes('aed')));
      setVisibility('hems-sites',            getLayerVisibility(as && visibleAssets.includes('hems')));
      setVisibility('hems-labels',           getLayerVisibility(as && visibleAssets.includes('hems')));
      setVisibility('fire-hydrant-sites',    getLayerVisibility(as && visibleAssets.includes('fire-hydrants')));
      setVisibility('fire-hydrant-labels',   getLayerVisibility(as && visibleAssets.includes('fire-hydrants')));
      setVisibility('assembly-point-sites',  getLayerVisibility(as && visibleAssets.includes('assembly-points')));
      setVisibility('assembly-point-labels', getLayerVisibility(as && visibleAssets.includes('assembly-points')));
    };

    const clearHover = () => {
      if (hovered) { map.setFeatureState(hovered, { hover: false }); hovered = undefined; }
      map.getCanvas().style.cursor = '';
    };

    const hoverLayersFor = (): { source: string; layers: string[] } | undefined => {
      if (activeGroup === 'events') return { source: 'rii', layers: ['rii-points', 'rii-line'] };
      if (activeGroup === 'fire') return { source: 'firePerimeters', layers: ['fire-perimeters-fill'] };
      return undefined;
    };

    const handleMove = (event: maplibregl.MapMouseEvent) => {
      const cfg = hoverLayersFor();
      const layers = cfg?.layers.filter(l => map.getLayer(l)) ?? [];
      if (!cfg || layers.length === 0) { clearHover(); return; }

      const feature = map.queryRenderedFeatures(event.point, { layers })[0];
      if (!feature || feature.id === undefined) { clearHover(); return; }

      const next = { source: cfg.source, id: feature.id };
      if (hovered && (hovered.source !== next.source || hovered.id !== next.id)) {
        map.setFeatureState(hovered, { hover: false });
      }
      hovered = next;
      map.setFeatureState(hovered, { hover: true });
      map.getCanvas().style.cursor = 'pointer';
    };

    const handleRiiClick = (event: maplibregl.MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) return;
      const anchor = feature.geometry.type === 'Point'
        ? (feature.geometry.coordinates as [number, number])
        : [event.lngLat.lng, event.lngLat.lat] as [number, number];
      popup.setLngLat(anchor).setHTML(riiPopupHTML(feature.properties ?? {})).addTo(map);
    };

    const handleFireClick = (event: maplibregl.MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) return;
      popup.setLngLat(event.lngLat).setHTML(firePopupHTML(feature.properties ?? {})).addTo(map);
    };

    const handleAssetClick = (event: maplibregl.MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature || feature.geometry.type !== 'Point') return;
      map.getCanvas().style.cursor = 'pointer';
      popup.setLngLat(feature.geometry.coordinates as [number, number])
        .setHTML(assetPopupHTML(feature.properties ?? {})).addTo(map);
    };

    const attachListeners = () => {
      if (listenersAttached) return;
      map.on('mousemove', handleMove);
      map.on('click', 'rii-points', handleRiiClick);
      map.on('click', 'rii-line', handleRiiClick);
      map.on('click', 'fire-perimeters-fill', handleFireClick);
      for (const l of ASSET_SITE_LAYERS) map.on('click', l, handleAssetClick);
      listenersAttached = true;
    };

    const offStyleReady = onStyleReady(map, () => { applyVisibility(); attachListeners(); });

    return () => {
      offStyleReady();
      if (listenersAttached) {
        map.off('mousemove', handleMove);
        map.off('click', 'rii-points', handleRiiClick);
        map.off('click', 'rii-line', handleRiiClick);
        map.off('click', 'fire-perimeters-fill', handleFireClick);
        for (const l of ASSET_SITE_LAYERS) map.off('click', l, handleAssetClick);
      }
      clearHover();
      popup.remove();
    };
  }, [activeGroup, allowedStati, visibleCauses, showBurnIndex, visibleAssets]);

  return (
    <>
      <section className="legend-panel" aria-label="Modulo soccorso ed emergenza">
        <strong>Modulo Soccorso ed Emergenza</strong>
        <p className="section-description">
          Scegli cosa vuoi vedere: i rii a rischio esondazione, i perimetri degli incendi boschivi,
          o i presidi utili in caso di emergenza.
        </p>
        <div className="legend-row" role="tablist">
          {(['events', 'fire', 'assets'] as RescueGroup[]).map(group => (
            <button
              key={group}
              type="button"
              role="tab"
              aria-selected={activeGroup === group}
              className={activeGroup === group ? 'module-link active' : 'module-link'}
              onClick={() => setActiveGroup(group)}
            >
              <i className={`bi ${groupIcon(group)} tab-icon`} aria-hidden="true" />
              {groupLabel(group)}
            </button>
          ))}
        </div>
      </section>

      {activeGroup === 'events' && (
        <section className="legend-panel" aria-label="Rii a rischio esondazione">
          <strong>Rii a rischio esondazione</strong>
          <p className="section-description">
            Censimento dei piccoli corsi d'acqua ("rii") sopra l'abitato che esondano durante le
            piogge intense, quando detriti e vegetazione ostruiscono grate e attraversamenti e
            l'acqua scende lungo piste forestali e strade. Dove il rio è mappato su OpenStreetMap
            è disegnato il suo tracciato reale; altrimenti un punto. Tocca il rio per la scheda con
            foto, criticità e interventi proposti.
          </p>
          <p className="data-caveat">
            <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" /> Ricognizione volontaria
            del Gruppo Comunale di Protezione Civile (rilievi 2013 e 2024): è un supporto conoscitivo,
            non uno studio tecnico né un riferimento per le decisioni in caso di allerta.
          </p>
          <div className="legend-row">
            <label>
              <input type="checkbox" checked={visibleRii.includes('recenti')} onChange={() => toggleRiiFilter('recenti')} />
              <span className="chip chip-rii-2024" /> Rilievi 2024
            </label>
            <label>
              <input type="checkbox" checked={visibleRii.includes('storici')} onChange={() => toggleRiiFilter('storici')} />
              <span className="chip chip-rii-storico" /> Rilievi meno recenti
            </label>
            <button type="button" onClick={showAllVisibleLayers}>Mostra tutti</button>
          </div>
          <Faq>
            Il censimento nasce nel 2013 su 10 corsi d'acqua; nel 2024 il Gruppo Comunale di Protezione
            Civile ne ha rilevati nuovamente 3 (Povoleit, Spia, sistema Cian/Cjasarile) dopo le allerte
            del novembre 2023 e la piena del 10 ottobre 2024. In questa visualizzazione, dove
            OpenStreetMap ha il corso d'acqua (Rio Spia, Rio Ciasarile, Rio Bennata, e il rio senza
            nome presso Cao Malnisio) abbiamo usato il suo tracciato. Un ulteriore rio censito nel 2013
            non compare in mappa perché privo di coordinate e di nome certo (foto datate 2007). Il
            documento di riferimento è il «Censimento RII», in gestione al Gruppo Comunale di Protezione
            Civile di Montereale Valcellina.
          </Faq>
        </section>
      )}

      {activeGroup === 'fire' && (
        <section className="legend-panel" aria-label="Incendi boschivi">
          <strong>Incendi boschivi</strong>
          <p className="section-description">
            Perimetri degli incendi boschivi rilevati dalle Stazioni Forestali della Regione FVG.
            Colore per causa dell'innesco. Tocca un'area per data, durata, luogo di innesco e stato
            della vegetazione.
          </p>
          <p className="data-caveat">
            <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" /> Archivio storico
            (perimetri digitalizzati dai Fogli Notizie Incendi Boschivi, dal 1990): registra dove il
            fuoco è già passato, non è una mappa previsionale di pericolosità. La precisione dei
            rilievi più vecchi è variabile.
          </p>
          <div className="legend-row">
            {FIRE_CAUSES.map(cause => (
              <label key={cause}>
                <input type="checkbox" checked={visibleCauses.includes(cause)} onChange={() => toggleCause(cause)} />
                <span className={`chip chip-fire-${cause}`} /> {FIRE_CAUSE_LABEL[cause]}
              </label>
            ))}
            <button type="button" onClick={showAllVisibleLayers}>Mostra tutti</button>
          </div>

          <div className="legend-row">
            <label>
              <input type="checkbox" checked={showBurnIndex} onChange={() => setShowBurnIndex(v => !v)} />
              Indice satellitare vegetazione secca / bruciata <span className="tech-name">(NBR)</span>
            </label>
          </div>
          {showBurnIndex && (
            <>
              <p className="section-description">
                Da immagine Sentinel-2 (set. 2025): vegetazione secca, degradata o suolo nudo/bruciato.
                È una condizione attuale, non l'effetto di un singolo incendio.
              </p>
              <div className="legend-row">
                {NBR_LEGEND.map(({ label, color }) => (
                  <span key={label} className="rii-area" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span className="chip" style={{ background: color }} /> {label}
                  </span>
                ))}
              </div>
            </>
          )}
          <Faq>
            Fonte: Regione Autonoma Friuli-Venezia Giulia, IRDAT FVG, dataset "Perimetro degli incendi
            boschivi" (n. 1232), ottenuto dal geoservizio regionale (WFS). I perimetri derivano dalla
            digitalizzazione delle cartografie allegate ai Fogli Notizie Incendi Boschivi redatti dalle
            Stazioni Forestali, con rilievi GPS sul campo. La causa ("dolosa", "colposa", "naturale" da
            fulmine, "ignota") è quella registrata nel foglio notizie. È un archivio di eventi passati,
            aggiornato quando le Stazioni Forestali trasmettono nuovi rilievi.
          </Faq>
        </section>
      )}

      {activeGroup === 'assets' && (
        <section className="legend-panel" aria-label="Presidi di soccorso">
          <strong>Presidi di soccorso</strong>
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
            <button type="button" onClick={showAllVisibleLayers}>Mostra tutti</button>
          </div>
          <Faq>
            Defibrillatori (DAE), elisuperfici per l'elisoccorso (HEMS), idranti antincendio e punti di
            raccolta per le emergenze. I DAE sono l'elenco fornito dal Comune di Montereale Valcellina,
            unito ai punti già presenti su OpenStreetMap; alcuni sono posizionati a partire dall'indirizzo
            (da verificare sul posto), come indicato nel dettaglio. Elisuperfici, idranti e punti di
            raccolta vengono da OpenStreetMap: se ne conosci uno mancante puoi aggiungerlo tu stesso.
          </Faq>
        </section>
      )}

      <section className="module-view" aria-label="Mappa Soccorso ed Emergenza">
        <div ref={mapRef} className="map-canvas" />
      </section>
    </>
  );
}
