type NdviClass = 'water' | 'bare' | 'sparse' | 'moderate' | 'dense' | 'very_dense';
type LstClass = 'fresco' | 'moderato_fresco' | 'temperato' | 'caldo' | 'molto_caldo';
type NbrClass = 'sana' | 'moderata' | 'stress' | 'degradata' | 'bruciata';

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

export type ClassStats = { areaM2: number; pct: number };

type Props = {
  visibleClasses: NdviClass[];
  showShade: boolean;
  showNbr: boolean;
  showLst: boolean;
  stats: Record<NdviClass, ClassStats> | null;
  onToggleClass: (cls: NdviClass) => void;
  onShowAll: () => void;
  onToggleShade: (v: boolean) => void;
  onToggleNbr: (v: boolean) => void;
  onToggleLst: (v: boolean) => void;
};

export type { NdviClass, NbrClass, LstClass };

export default function GreenLegend({
  visibleClasses, showShade, showNbr, showLst, stats,
  onToggleClass, onShowAll, onToggleShade, onToggleNbr, onToggleLst,
}: Props) {
  return (
    <>
      <section className="legend-panel" aria-label="Modulo Green">
        <strong>Modulo Green — Copertura vegetale NDVI</strong>
        <p className="section-description">
          Classificazione della vegetazione da immagini Sentinel-2. Ogni classe corrisponde a un indice NDVI calcolato a 10 m di risoluzione.
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

        <div className="shade-toggle">
          <label>
            <input
              type="checkbox"
              checked={showShade}
              onChange={e => onToggleShade(e.target.checked)}
            />
            <span className="shade-swatch" />
            Corridoi d'ombra naturale (strade e sentieri)
          </label>
          {showShade && (
            <p className="shade-legend-hint">
              Verde scuro = strade ombreggiate · verde chiaro = sentieri ombreggiati · opacità proporzionale alla copertura
            </p>
          )}
        </div>

        {stats && (
          <div className="ndvi-stats">
            <strong>Copertura del suolo</strong>
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
          </div>
        )}
      </section>

      <section className="legend-panel" aria-label="Indice NBR">
        <div className="shade-toggle">
          <label>
            <input type="checkbox" checked={showNbr} onChange={e => onToggleNbr(e.target.checked)} />
            <span className="nbr-swatch" />
            Stress vegetazione — NBR
          </label>
          <p className="shade-legend-hint">Da Sentinel-2 · 20 m · settembre 2025 · ombre SCL mascherate</p>
        </div>
        {showNbr && (
          <div className="legend-row" style={{ marginTop: '0.5rem' }}>
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
        )}
      </section>

      <section className="legend-panel" aria-label="Temperatura superficiale">
        <div className="shade-toggle">
          <label>
            <input type="checkbox" checked={showLst} onChange={e => onToggleLst(e.target.checked)} />
            <span className="lst-swatch" />
            Temperatura superficiale (LST)
          </label>
          <p className="shade-legend-hint">Da Landsat 8 · 30 m · settembre 2023</p>
        </div>
        {showLst && (
          <div className="legend-row" style={{ marginTop: '0.5rem' }}>
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
        )}
      </section>
    </>
  );
}
