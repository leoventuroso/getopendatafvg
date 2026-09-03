import Faq from '../../components/Faq';

type NdviClass = 'water' | 'bare' | 'sparse' | 'moderate' | 'dense' | 'very_dense';
type LstClass = 'fresco' | 'moderato_fresco' | 'temperato' | 'caldo' | 'molto_caldo';
type NbrClass = 'sana' | 'moderata' | 'stress' | 'degradata' | 'bruciata';
type GreenTab = 'ndvi' | 'shade' | 'nbr' | 'lst';

export const ALL_NDVI_CLASSES: NdviClass[] = ['water', 'bare', 'sparse', 'moderate', 'dense', 'very_dense'];
export const ALL_NBR_CLASSES: NbrClass[] = ['sana', 'moderata', 'stress', 'degradata', 'bruciata'];
export const ALL_LST_CLASSES: LstClass[] = ['fresco', 'moderato_fresco', 'temperato', 'caldo', 'molto_caldo'];

export const NDVI_CLASS_CONFIG: Record<NdviClass, { label: string; color: string }> = {
  water:      { label: 'Acqua / superfici riflettenti', color: '#4a90d9' },
  bare:       { label: 'Suolo nudo / edificato',        color: '#c9a96e' },
  sparse:     { label: 'Vegetazione rada',              color: '#a8d08d' },
  moderate:   { label: 'Vegetazione moderata',          color: '#5aaa5a' },
  dense:      { label: 'Foresta densa',                 color: '#238b45' },
  very_dense: { label: 'Foresta molto densa',           color: '#004d20' },
};

export const NBR_CLASS_CONFIG: Record<NbrClass, { label: string; color: string; range: string }> = {
  sana:      { label: 'Vegetazione sana',     color: '#1a9641', range: '> 0.4' },
  moderata:  { label: 'Vegetazione moderata', color: '#a6d96a', range: '0.2 – 0.4' },
  stress:    { label: 'Stress idrico',        color: '#ffffbf', range: '0.0 – 0.2' },
  degradata: { label: 'Vegetazione degradata',color: '#fdae61', range: '-0.2 – 0.0' },
  bruciata:  { label: 'Suolo nudo / bruciato',color: '#d7191c', range: '< -0.2' },
};

export const LST_CLASS_CONFIG: Record<LstClass, { label: string; color: string; range: string }> = {
  fresco:          { label: 'Fresco',          color: '#4575b4', range: '< 18°C' },
  moderato_fresco: { label: 'Moderato-fresco', color: '#91bfdb', range: '18–22°C' },
  temperato:       { label: 'Temperato',       color: '#fee090', range: '22–26°C' },
  caldo:           { label: 'Caldo',           color: '#fc8d59', range: '26–30°C' },
  molto_caldo:     { label: 'Molto caldo',     color: '#d73027', range: '> 30°C' },
};

const TABS: { id: GreenTab; icon: string; label: string }[] = [
  { id: 'ndvi', icon: 'bi-flower1', label: 'Vegetazione' },
  { id: 'shade', icon: 'bi-tree', label: 'Ombra naturale' },
  { id: 'nbr', icon: 'bi-heart-pulse', label: 'Salute vegetazione' },
  { id: 'lst', icon: 'bi-thermometer-sun', label: 'Temperatura suolo' },
];

export type ClassStats = { areaM2: number; pct: number };

type Props = {
  activeTab: GreenTab;
  onSelectTab: (tab: GreenTab) => void;
  visibleClasses: NdviClass[];
  stats: Record<NdviClass, ClassStats> | null;
  onToggleClass: (cls: NdviClass) => void;
  onShowAll: () => void;
};

export type { GreenTab, NdviClass, NbrClass, LstClass };

export default function GreenLegend({
  activeTab, onSelectTab, visibleClasses, stats, onToggleClass, onShowAll,
}: Props) {
  return (
    <>
      <section className="legend-panel" aria-label="Modulo Verde">
        <strong>Modulo Verde: ambiente e vegetazione</strong>
        <p className="section-description">
          Scegli cosa vuoi vedere sulla mappa. Ogni scheda mostra un solo indicatore alla volta.
        </p>
        <div className="legend-row" role="tablist" aria-label="Indicatori ambientali">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? 'module-link active' : 'module-link'}
              onClick={() => onSelectTab(tab.id)}
            >
              <i className={`bi ${tab.icon} tab-icon`} aria-hidden="true" />{tab.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'ndvi' && (
        <section className="legend-panel" aria-label="Vegetazione">
          <strong>Vegetazione <span className="tech-name">(NDVI)</span></strong>
          <p className="section-description">
            Quanto è coperto ogni punto del territorio da vegetazione sana, dal suolo nudo alla foresta più densa.
          </p>

          <div className="legend-row">
            {ALL_NDVI_CLASSES.map(cls => {
              const { label, color } = NDVI_CLASS_CONFIG[cls];
              return (
                <label key={cls}>
                  <input
                    type="checkbox"
                    checked={visibleClasses.includes(cls)}
                    onChange={() => onToggleClass(cls)}
                  />
                  <span className="slope-swatch" style={{ backgroundColor: color, border: '1px solid #ccc' }} />
                  {label}
                </label>
              );
            })}
            <button type="button" onClick={onShowAll}>Mostra tutti</button>
          </div>

          {stats && (
            <details className="ndvi-stats">
              <summary><strong>Copertura del suolo: dettaglio</strong></summary>
              <div className="ndvi-stats-bar">
                {ALL_NDVI_CLASSES.filter(cls => stats[cls].pct > 0).map(cls => (
                  <div
                    key={cls}
                    title={`${NDVI_CLASS_CONFIG[cls].label}: ${stats[cls].pct.toFixed(1)}%`}
                    style={{ width: `${stats[cls].pct}%`, backgroundColor: NDVI_CLASS_CONFIG[cls].color, height: '100%' }}
                  />
                ))}
              </div>
              <ul className="ndvi-stats-list">
                {ALL_NDVI_CLASSES.filter(cls => stats[cls].areaM2 > 0).map(cls => (
                  <li key={cls}>
                    <span className="slope-swatch" style={{ backgroundColor: NDVI_CLASS_CONFIG[cls].color, border: '1px solid #ccc' }} />
                    <span className="ndvi-stats-label">{NDVI_CLASS_CONFIG[cls].label}</span>
                    <span className="ndvi-stats-values">
                      {(stats[cls].areaM2 / 1_000_000).toFixed(2)} km²
                      <em>{stats[cls].pct.toFixed(1)}%</em>
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <Faq>
            Misura quanto una zona è coperta da vegetazione sana confrontando la luce rossa e quella infrarossa
            vicina catturate dal satellite Sentinel-2, a 10 m di risoluzione. Più il valore è alto, più la
            vegetazione è densa; i toni chiari indicano suolo nudo o superfici costruite.
          </Faq>
        </section>
      )}

      {activeTab === 'shade' && (
        <section className="legend-panel" aria-label="Ombra naturale">
          <strong>Ombra naturale</strong>
          <p className="section-description">
            Strade e sentieri colorati in base a quanto sono coperti dalle chiome degli alberi, utile per
            scegliere un percorso fresco nelle giornate calde.
          </p>
          <div className="legend-row">
            <span className="legend-item"><span className="shade-swatch" /> Poca o nessuna ombra → molta ombra</span>
          </div>
          <p className="shade-legend-hint">
            Verde scuro = strade ombreggiate · verde chiaro = sentieri ombreggiati · opacità proporzionale alla copertura
          </p>
          <Faq>
            Percentuale di copertura arborea sopra ogni tratto di strada o sentiero, calcolata incrociando le
            aree di vegetazione densa (dallo stesso indice di vegetazione) con i tracciati stradali e i
            sentieri di OpenStreetMap.
          </Faq>
        </section>
      )}

      {activeTab === 'nbr' && (
        <section className="legend-panel" aria-label="Salute della vegetazione">
          <strong>Salute della vegetazione <span className="tech-name">(NBR)</span></strong>
          <p className="section-description">
            Individua vegetazione in sofferenza, degradata o bruciata: non solo quanto verde c'è, ma come sta.
          </p>
          <p className="shade-legend-hint">Da Sentinel-2 · 20 m · settembre 2025 · ombre mascherate</p>
          <div className="legend-row">
            {ALL_NBR_CLASSES.map(cls => {
              const { label, color, range } = NBR_CLASS_CONFIG[cls];
              return (
                <span key={cls} className="legend-item">
                  <span className="slope-swatch" style={{ backgroundColor: color, border: '1px solid #ccc' }} />
                  {label} <em style={{ color: '#5a6e7a', fontSize: '0.8rem' }}>{range}</em>
                </span>
              );
            })}
          </div>
          <Faq>
            Confronta due bande infrarosse di Sentinel-2 (B8A e B12) a 20 m di risoluzione per individuare
            stress idrico, degrado o aree bruciate; i pixel di ombra e acqua vengono esclusi dal calcolo.
            Valori bassi o negativi segnalano vegetazione in sofferenza o suolo bruciato.
          </Faq>
        </section>
      )}

      {activeTab === 'lst' && (
        <section className="legend-panel" aria-label="Temperatura del suolo">
          <strong>Temperatura del suolo <span className="tech-name">(LST)</span></strong>
          <p className="section-description">
            Le zone più calde e quelle più fresche del territorio, misurate dal satellite.
          </p>
          <p className="shade-legend-hint">Da Landsat 8 · 30 m · settembre 2023</p>
          <div className="legend-row">
            {ALL_LST_CLASSES.map(cls => {
              const { label, color, range } = LST_CLASS_CONFIG[cls];
              return (
                <span key={cls} className="legend-item">
                  <span className="slope-swatch" style={{ backgroundColor: color, border: '1px solid #ccc' }} />
                  {label} <em style={{ color: '#5a6e7a', fontSize: '0.8rem' }}>{range}</em>
                </span>
              );
            })}
          </div>
          <Faq>
            Temperatura misurata dal sensore termico di Landsat 8/9 a 30 m di risoluzione: è la temperatura
            della superficie del terreno, non dell'aria. Aiuta a individuare le isole di calore nelle zone
            urbanizzate rispetto alle aree rinfrescate dagli alberi.
          </Faq>
        </section>
      )}
    </>
  );
}
