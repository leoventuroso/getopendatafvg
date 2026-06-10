type FrazioneFeature = {
  name: string;
  type: 'capoluogo' | 'frazione' | 'borgata';
  centroid_lon: number;
  centroid_lat: number;
  name_fur?: string;
};

type Props = {
  frazioni: FrazioneFeature[];
  selectedName: string | null;
  onSelect: (f: FrazioneFeature) => void;
};

export type { FrazioneFeature };

export default function FrazioniList({ frazioni, selectedName, onSelect }: Props) {
  const visible = frazioni.filter(f => f.type !== 'borgata');
  if (visible.length === 0) return null;

  return (
    <div className="home-frazioni">
      <h3 className="home-frazioni-title">Frazioni</h3>
      <ul className="home-frazioni-list">
        {visible.map(f => (
          <li key={f.name}>
            <button
              className={`home-frazione-btn${selectedName === f.name ? ' home-frazione-btn--selected' : ''}`}
              onClick={() => onSelect(f)}
            >
              <span className="home-frazione-name">{f.name}</span>
              {f.name_fur && <span className="home-frazione-fur">{f.name_fur}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
