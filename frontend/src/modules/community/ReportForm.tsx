import { useEffect, useRef } from 'react';
import { CATEGORIES, type CategoryId, type FormState, type PhotoState } from './communityStore';

type Props = {
  pendingLocation: [number, number] | null;
  form: FormState;
  photo: PhotoState | null;
  submitted: boolean;
  onFormChange: (form: FormState) => void;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: () => void;
  onSubmit: () => void;
  onCancel: () => void;
};

export default function ReportForm({
  pendingLocation, form, photo, submitted,
  onFormChange, onPhotoChange, onRemovePhoto,
  onSubmit, onCancel,
}: Props) {
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Guide the user forward: once the pin is placed and the detail fields
  // appear, move focus straight to the first one instead of making them hunt.
  useEffect(() => {
    if (pendingLocation) titleInputRef.current?.focus();
  }, [pendingLocation]);

  return (
    <div className="community-form">
      <div className="community-header">
        <h2 className="community-title">Nuova segnalazione</h2>
        <button className="community-btn-cancel" onClick={onCancel}>Annulla</button>
      </div>

      {!pendingLocation ? (
        <div className="community-pin-instruction">
          <i className="bi bi-geo-alt-fill" aria-hidden="true" />
          {' '}Clicca sulla mappa per posizionare la segnalazione
        </div>
      ) : (
        <p className="community-pin-set">
          <i className="bi bi-check-circle-fill" style={{ color: '#2f9e44' }} aria-hidden="true" />
          {' '}Posizione impostata — {pendingLocation[1].toFixed(5)}, {pendingLocation[0].toFixed(5)}
          {' '}· clicca di nuovo sulla mappa per spostarla
        </p>
      )}

      {pendingLocation && (
        <>
          <label className="community-form-label">
            Categoria
            <select
              className="community-form-select"
              value={form.category}
              onChange={e => onFormChange({ ...form, category: e.target.value as CategoryId })}
            >
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>

          <label className="community-form-label">
            Titolo
            <input
              ref={titleInputRef}
              className="community-form-input"
              type="text"
              maxLength={100}
              placeholder="Es. Buca in via Roma"
              value={form.title}
              onChange={e => onFormChange({ ...form, title: e.target.value })}
            />
          </label>

          <label className="community-form-label">
            Descrizione (opzionale)
            <textarea
              className="community-form-textarea"
              maxLength={500}
              rows={4}
              placeholder="Descrivi il problema o la proposta…"
              value={form.description}
              onChange={e => onFormChange({ ...form, description: e.target.value })}
            />
          </label>

          <label className="community-form-label">
            Foto (opzionale)
            <div className="community-photo-row">
              <label className="community-photo-btn" htmlFor="community-photo-input">
                <i className="bi bi-camera" aria-hidden="true" /> Scegli foto
              </label>
              <input
                id="community-photo-input"
                type="file"
                accept="image/*"
                capture="environment"
                className="community-photo-input-hidden"
                onChange={onPhotoChange}
              />
              {photo && (
                <button
                  type="button"
                  className="community-photo-remove"
                  onClick={onRemovePhoto}
                  aria-label="Rimuovi foto"
                >
                  <i className="bi bi-x-circle" aria-hidden="true" />
                </button>
              )}
            </div>
            {photo && (
              <div className="community-photo-preview-wrap">
                <img className="community-photo-preview" src={photo.previewUrl} alt="Anteprima foto" />
                <span className="community-photo-name">{photo.fileName}</span>
                <span className="community-photo-hint">
                  <i className="bi bi-info-circle" aria-hidden="true" /> Allega il file all'email prima di inviare
                </span>
              </div>
            )}
          </label>

          {submitted ? (
            <p className="community-submit-ok">
              <i className="bi bi-envelope-check-fill" aria-hidden="true" /> Segnalazione salvata. Il client email si è aperto.
            </p>
          ) : (
            <button
              className="community-btn-submit"
              disabled={!form.title.trim()}
              onClick={onSubmit}
            >
              <i className="bi bi-send" aria-hidden="true" /> Invia al Comune
            </button>
          )}
        </>
      )}
    </div>
  );
}
