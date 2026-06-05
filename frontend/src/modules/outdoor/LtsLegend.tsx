type LtsLevel = 1 | 2 | 3 | 4;

type LtsLegendProps = {
  visibleLts: LtsLevel[];
  onToggleLevel: (level: LtsLevel) => void;
  onShowAll: () => void;
};

export default function LtsLegend({ visibleLts, onToggleLevel, onShowAll }: LtsLegendProps) {
  return (
    <section className="legend-panel" aria-label="Filtro livelli LTS">
      <strong>Modulo Outdoor - Legenda LTS</strong>
      <div className="legend-row">
        <label>
          <input
            type="checkbox"
            checked={visibleLts.includes(1)}
            onChange={() => onToggleLevel(1)}
          />
          <span className="chip chip-lts1" /> LTS 1
        </label>
        <label>
          <input
            type="checkbox"
            checked={visibleLts.includes(2)}
            onChange={() => onToggleLevel(2)}
          />
          <span className="chip chip-lts2" /> LTS 2
        </label>
        <label>
          <input
            type="checkbox"
            checked={visibleLts.includes(3)}
            onChange={() => onToggleLevel(3)}
          />
          <span className="chip chip-lts3" /> LTS 3
        </label>
        <label>
          <input
            type="checkbox"
            checked={visibleLts.includes(4)}
            onChange={() => onToggleLevel(4)}
          />
          <span className="chip chip-lts4" /> LTS 4
        </label>
        <button type="button" onClick={onShowAll}>Mostra tutti</button>
      </div>
    </section>
  );
}
