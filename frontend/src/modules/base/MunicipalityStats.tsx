type MunicipalityStats = {
  municipality: { name: string; province: string; region: string };
  geography: {
    waterways: string[];
    peaks: { name: string; elevation_m: number }[];
  };
  demographic: {
    population: number | null;
    population_year: number | null;
    area_km2: number | null;
    population_density_km2: number | null;
    localities_count: number | null;
    households: number | null;
    avg_household_size: number | null;
    avg_age: number | null;
    avg_age_scope: string | null;
    old_age_index: number | null;
    old_age_index_scope: string | null;
    pct_pop_65_over: number | null;
  };
  risk: {
    seismic_zone: string | null;
    seismic_zone_label: string | null;
    hydrogeological_risk_class: string | null;
  };
  services: {
    pharmacy: boolean | null;
    pharmacy_name: string | null;
    schools: string | null;
    nearest_emergency_room: { name: string | null; distance_km: number | null; drive_minutes: number | null };
    bank_branches: number | null;
  };
  pipeline_derived: {
    total_area_ha: number;
    green_area_pct: number;
    trails_cai_km: number;
    trails_mtb_km: number;
    cycling_km: number | null;
  };
};

type Props = { stats: MunicipalityStats };

export type { MunicipalityStats };

function fmt(v: number | null | undefined, suffix = ''): string {
  if (v == null) return '—';
  return `${v.toLocaleString('it-IT')}${suffix}`;
}

export default function MunicipalityStatsPanel({ stats }: Props) {
  return (
    <div className="home-stats">
      <section className="home-stats-section">
        <h3>Territorio</h3>
        <dl>
          <div><dt>Superficie</dt><dd>{fmt(stats.demographic.area_km2, ' km²')}</dd></div>
          <div><dt>Densità</dt><dd>{fmt(stats.demographic.population_density_km2, ' ab/km²')}</dd></div>
          <div><dt>Corsi d'acqua</dt><dd>{stats.geography.waterways.join(', ')}</dd></div>
          <div><dt>Cime principali</dt><dd>
            {stats.geography.peaks.map(p => `${p.name} (${p.elevation_m.toLocaleString('it-IT')} m)`).join(', ')}
          </dd></div>
          <div><dt>Vegetazione densa</dt><dd>{fmt(stats.pipeline_derived.green_area_pct, '%')}</dd></div>
          <div><dt>Sentieri CAI</dt><dd>{fmt(stats.pipeline_derived.trails_cai_km, ' km')}</dd></div>
          <div><dt>Percorsi MTB</dt><dd>{fmt(stats.pipeline_derived.trails_mtb_km, ' km')}</dd></div>
          <div><dt>Piste ciclabili</dt><dd>{fmt(stats.pipeline_derived.cycling_km, ' km')}</dd></div>
        </dl>
      </section>

      <section className="home-stats-section">
        <h3>Popolazione</h3>
        <dl>
          <div><dt>Residenti</dt><dd>
            {stats.demographic.population != null
              ? `${stats.demographic.population.toLocaleString('it-IT')} (${stats.demographic.population_year ?? ''})`
              : '—'}
          </dd></div>
          <div><dt>Famiglie</dt><dd>{fmt(stats.demographic.households)}</dd></div>
          <div><dt>Componenti medi</dt><dd>{fmt(stats.demographic.avg_household_size)}</dd></div>
          <div><dt>Età media</dt>
            <dd>{stats.demographic.avg_age != null
              ? <>{stats.demographic.avg_age} anni{stats.demographic.avg_age_scope === 'provincial' ? <span className="stat-scope"> (PN)</span> : null}</>
              : '—'}
            </dd>
          </div>
          <div><dt>Indice di vecchiaia</dt>
            <dd>{stats.demographic.old_age_index != null
              ? <>{stats.demographic.old_age_index}{stats.demographic.old_age_index_scope === 'provincial' ? <span className="stat-scope"> (PN)</span> : null}</>
              : '—'}
            </dd>
          </div>
          <div><dt>Pop. ≥ 65 anni</dt>
            <dd>{stats.demographic.pct_pop_65_over != null
              ? <>{stats.demographic.pct_pop_65_over}%<span className="stat-scope"> (PN)</span></>
              : '—'}
            </dd>
          </div>
        </dl>
      </section>

      <section className="home-stats-section">
        <h3>Rischio territorio</h3>
        <dl>
          <div><dt>Zona sismica</dt>
            <dd>{stats.risk.seismic_zone != null
              ? <>Zona {stats.risk.seismic_zone}{stats.risk.seismic_zone_label ? <span className="stat-scope"> — {stats.risk.seismic_zone_label}</span> : null}</>
              : '—'}
            </dd>
          </div>
          <div><dt>Rischio idrogeologico</dt><dd>{stats.risk.hydrogeological_risk_class ?? '—'}</dd></div>
        </dl>
      </section>

      <section className="home-stats-section">
        <h3>Servizi</h3>
        <dl>
          <div><dt>Sportelli bancari</dt><dd>{fmt(stats.services.bank_branches)}</dd></div>
          <div><dt>Farmacia</dt><dd>{stats.services.pharmacy_name ?? (stats.services.pharmacy ? 'Sì' : stats.services.pharmacy === false ? 'No' : '—')}</dd></div>
          <div><dt>Scuole</dt><dd>{stats.services.schools ?? '—'}</dd></div>
          <div><dt>Pronto soccorso</dt><dd>
            {stats.services.nearest_emergency_room.name
              ? <>{stats.services.nearest_emergency_room.name}<span className="stat-scope"> ({fmt(stats.services.nearest_emergency_room.distance_km, ' km')}, ~{stats.services.nearest_emergency_room.drive_minutes} min)</span></>
              : '—'}
          </dd></div>
        </dl>
      </section>
    </div>
  );
}
