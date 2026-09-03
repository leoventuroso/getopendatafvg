import type { CommunityReport } from '../../lib/duckdb';
import { categoryColor, categoryLabel } from './communityStore';

type Props = {
  reports: CommunityReport[];
  selectedReport: CommunityReport | null;
  votes: Record<string, number>;
  votedIds: Set<string>;
  onSelect: (report: CommunityReport) => void;
  onVote: (reportId: string, e: React.MouseEvent) => void;
  onDelete: (reportId: string, e: React.MouseEvent) => void;
};

export default function ReportList({ reports, selectedReport, votes, votedIds, onSelect, onVote, onDelete }: Props) {
  if (reports.length === 0) {
    return (
      <p className="community-empty">
        Nessuna segnalazione ancora. Clicca "Nuova segnalazione" per iniziare.
      </p>
    );
  }

  return (
    <ul className="community-list">
      {reports.map(r => (
        <li key={r.id} data-report-id={r.id}>
          <button
            className={`community-report-item${selectedReport?.id === r.id ? ' community-report-item--selected' : ''}`}
            onClick={() => onSelect(r)}
          >
            <span
              className="community-report-dot"
              style={{ background: categoryColor(r.category) }}
            />
            <span className="community-report-body">
              <span className="community-report-title">{r.title}</span>
              <span className="community-report-meta">
                {categoryLabel(r.category)}
                {r.pending && <span className="community-badge-pending">In attesa</span>}
              </span>
            </span>
            <button
              className={`community-vote-btn${votedIds.has(r.id) ? ' community-vote-btn--voted' : ''}`}
              onClick={e => onVote(r.id, e)}
              title={votedIds.has(r.id) ? 'Rimuovi voto' : 'Anche a me importa'}
            >
              <i className="bi bi-hand-thumbs-up" aria-hidden="true" />
              <span>{votes[r.id] ?? 0}</span>
            </button>
          </button>

          {selectedReport?.id === r.id && (
            <div className="community-report-detail">
              {r.description && <p>{r.description}</p>}
              {r.photo_data_url && (
                <img
                  className="community-photo-preview community-photo-preview--detail"
                  src={r.photo_data_url}
                  alt="Foto segnalazione"
                />
              )}
              <p className="community-report-coords">
                {r.lat.toFixed(5)}, {r.lon.toFixed(5)}
                {r.foglio && r.particella && (
                  <> &middot; catasto F.{r.foglio} P.{r.particella}</>
                )}
              </p>
              {r.pending && (
                <button
                  type="button"
                  className="community-report-delete"
                  onClick={e => onDelete(r.id, e)}
                >
                  <i className="bi bi-trash" aria-hidden="true" /> Elimina segnalazione
                </button>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
