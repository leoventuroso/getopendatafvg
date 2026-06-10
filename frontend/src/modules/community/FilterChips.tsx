import type { Category } from './communityStore';

type Props = {
  categories: readonly Category[];
  activeFilter: string | null;
  onFilterChange: (id: string | null) => void;
};

export default function FilterChips({ categories, activeFilter, onFilterChange }: Props) {
  return (
    <div className="community-filter-chips">
      <button
        className={`community-chip${!activeFilter ? ' community-chip--active' : ''}`}
        onClick={() => onFilterChange(null)}
      >
        Tutte
      </button>
      {categories.map(c => (
        <button
          key={c.id}
          className={`community-chip${activeFilter === c.id ? ' community-chip--active' : ''}`}
          style={activeFilter === c.id ? { borderColor: c.color, background: c.color + '22' } : {}}
          onClick={() => onFilterChange(activeFilter === c.id ? null : c.id)}
        >
          <i className={`bi ${c.icon}`} aria-hidden="true" /> {c.label}
        </button>
      ))}
    </div>
  );
}
