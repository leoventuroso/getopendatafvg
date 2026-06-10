import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useModuleMap } from '../../hooks/useModuleMap';
import { loadCommunityReports, type CommunityReport } from '../../lib/duckdb';
import {
  CATEGORIES, EMPTY_FORM, MUNICIPALITY_EMAIL,
  categoryLabel,
  loadPending, savePending,
  loadVotes, saveVotes,
  loadVotedIds, saveVotedIds,
  resizeImageToDataUrl,
  type FormState, type PhotoState,
} from './communityStore';
import FilterChips from './FilterChips';
import ReportList from './ReportList';
import ReportForm from './ReportForm';
import './community.css';

export default function CommunityModule() {
  const { mapRef, mapInstanceRef } = useModuleMap('community');
  const pinMarkerRef = useRef<maplibregl.Marker | null>(null);
  const markersRef = useRef<globalThis.Map<string, maplibregl.Marker>>(new globalThis.Map());

  const [view, setView] = useState<'list' | 'form'>('list');
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<CommunityReport | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [isPlacingPin, setIsPlacingPin] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<[number, number] | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [photo, setPhoto] = useState<PhotoState | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [votes, setVotes] = useState<Record<string, number>>(() => loadVotes());
  const [votedIds, setVotedIds] = useState<Set<string>>(() => loadVotedIds());

  // Markers cleanup on unmount (map.remove() in useModuleMap handles the map itself)
  useEffect(() => {
    return () => {
      for (const m of markersRef.current.values()) m.remove();
      pinMarkerRef.current?.remove();
    };
  }, []);

  // Load reports on mount
  useEffect(() => {
    const pending = loadPending();
    setReports(pending);
    loadCommunityReports().then(dbReports => {
      setReports(prev => {
        const pendingIds = new Set(prev.map(r => r.id));
        const fresh = dbReports.filter(r => !pendingIds.has(r.id));
        return [...prev, ...fresh];
      });
    });
  }, []);

  // HTML markers: recreate when reports change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: '200px',
      className: 'community-map-popup',
    });

    const createMarkers = () => {
      for (const m of markersRef.current.values()) m.remove();
      markersRef.current.clear();

      for (const report of reports) {
        if (report.lon === 0 && report.lat === 0) continue;

        const cat = CATEGORIES.find(c => c.id === report.category);
        const el = document.createElement('div');
        el.className = 'community-marker';
        el.innerHTML = `<i class="bi ${cat?.icon ?? 'bi-circle'}" aria-hidden="true"></i>`;

        el.addEventListener('mouseenter', () => {
          const photoHtml = report.photo_data_url
            ? `<img src="${report.photo_data_url}" style="width:100%;border-radius:4px;margin-top:0.35rem;display:block;max-height:110px;object-fit:cover;" />`
            : '';
          popup
            .setLngLat([report.lon, report.lat])
            .setHTML(
              `<div style="font-size:0.82rem">` +
              `<strong style="display:block;margin-bottom:0.15rem">${report.title}</strong>` +
              `<span style="color:#587089;font-size:0.75rem">${categoryLabel(report.category)}</span>` +
              photoHtml +
              `</div>`
            )
            .addTo(map);
        });

        el.addEventListener('mouseleave', () => popup.remove());

        el.addEventListener('click', () => {
          setSelectedReport(report);
          setView('list');
          map.flyTo({ center: [report.lon, report.lat], zoom: 15, duration: 700 });
          requestAnimationFrame(() => {
            document
              .querySelector(`[data-report-id="${report.id}"]`)
              ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          });
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([report.lon, report.lat])
          .addTo(map);
        markersRef.current.set(report.id, marker);
      }
    };

    if (map.isStyleLoaded()) createMarkers(); else map.once('load', createMarkers);

    return () => {
      for (const m of markersRef.current.values()) m.remove();
      markersRef.current.clear();
      popup.remove();
    };
  }, [reports]);

  // Map click: place pin
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      if (!isPlacingPin) return;
      const { lng, lat } = e.lngLat;
      setPendingLocation([lng, lat]);
      setIsPlacingPin(false);
      map.getCanvas().style.cursor = '';
      pinMarkerRef.current?.remove();
      pinMarkerRef.current = new maplibregl.Marker({ color: '#e03131' })
        .setLngLat([lng, lat])
        .addTo(map);
    };

    map.on('click', handleClick);
    return () => { map.off('click', handleClick); };
  }, [isPlacingPin]);

  // Crosshair cursor while placing pin
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = isPlacingPin ? 'crosshair' : '';
  }, [isPlacingPin]);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setPhoto({ fileName: file.name, previewUrl: dataUrl, dataUrl });
    } catch {
      // silently ignore resize errors
    }
  }

  function handleVote(reportId: string, e: React.MouseEvent) {
    e.stopPropagation();
    const alreadyVoted = votedIds.has(reportId);
    const newVotes = { ...votes };
    const newVotedIds = new Set(votedIds);
    if (alreadyVoted) {
      newVotes[reportId] = Math.max(0, (newVotes[reportId] ?? 1) - 1);
      newVotedIds.delete(reportId);
    } else {
      newVotes[reportId] = (newVotes[reportId] ?? 0) + 1;
      newVotedIds.add(reportId);
    }
    setVotes(newVotes);
    setVotedIds(newVotedIds);
    saveVotes(newVotes);
    saveVotedIds(newVotedIds);
  }

  function startNewReport() {
    setView('form');
    setSelectedReport(null);
    setPendingLocation(null);
    setForm(EMPTY_FORM);
    setPhoto(null);
    setSubmitted(false);
    pinMarkerRef.current?.remove();
    pinMarkerRef.current = null;
    setIsPlacingPin(true);
  }

  function cancelForm() {
    setView('list');
    setIsPlacingPin(false);
    setPendingLocation(null);
    setForm(EMPTY_FORM);
    setPhoto(null);
    pinMarkerRef.current?.remove();
    pinMarkerRef.current = null;
  }

  function submitForm() {
    if (!pendingLocation || !form.title.trim()) return;

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newReport: CommunityReport = {
      id,
      category: form.category,
      title: form.title.trim(),
      description: form.description.trim(),
      status: 'pending',
      lon: pendingLocation[0],
      lat: pendingLocation[1],
      created_at: now,
      pending: true,
      photo_data_url: photo?.dataUrl,
    };

    const updated = [...reports, newReport];
    setReports(updated);
    savePending(updated);

    const catLabel = categoryLabel(form.category);
    const subject = `[Segnalazione] ${catLabel}: ${form.title.trim()}`;
    const body = [
      `Categoria: ${catLabel}`,
      `Posizione: lat ${pendingLocation[1].toFixed(5)}, lon ${pendingLocation[0].toFixed(5)}`,
      ``,
      `Descrizione:`,
      form.description.trim() || '(nessuna descrizione)',
      ...(photo ? [``, `Fotografia allegata: ${photo.fileName}`, `   → Allegare il file all'email prima di inviare.`] : []),
      ``,
      `---`,
      `Inviato dal portale Montereale Valcellina Open`,
    ].join('\n');

    window.location.href = `mailto:${MUNICIPALITY_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    setSubmitted(true);
    pinMarkerRef.current?.remove();
    pinMarkerRef.current = null;

    setTimeout(() => {
      setView('list');
      setSubmitted(false);
      setForm(EMPTY_FORM);
      setPhoto(null);
      setPendingLocation(null);
    }, 2000);
  }

  const filteredReports = categoryFilter
    ? reports.filter(r => r.category === categoryFilter)
    : reports;

  return (
    <section className="community-layout" aria-label="Modulo Segnala">
      <aside className="community-panel">
        {view === 'list' ? (
          <>
            <div className="community-header">
              <h2 className="community-title">Segnalazioni</h2>
              <button className="community-btn-new" onClick={startNewReport}>
                <i className="bi bi-plus-circle" aria-hidden="true" /> Nuova segnalazione
              </button>
            </div>
            <FilterChips
              categories={CATEGORIES}
              activeFilter={categoryFilter}
              onFilterChange={setCategoryFilter}
            />
            <ReportList
              reports={filteredReports}
              selectedReport={selectedReport}
              votes={votes}
              votedIds={votedIds}
              onSelect={r => {
                setSelectedReport(r);
                if (r.lon !== 0 || r.lat !== 0) {
                  mapInstanceRef.current?.flyTo({ center: [r.lon, r.lat], zoom: 15, duration: 700 });
                }
              }}
              onVote={handleVote}
            />
          </>
        ) : (
          <ReportForm
            pendingLocation={pendingLocation}
            form={form}
            photo={photo}
            submitted={submitted}
            onFormChange={setForm}
            onPhotoChange={handlePhotoChange}
            onRemovePhoto={() => setPhoto(null)}
            onSubmit={submitForm}
            onCancel={cancelForm}
            onRepin={() => {
              setPendingLocation(null);
              pinMarkerRef.current?.remove();
              pinMarkerRef.current = null;
              setIsPlacingPin(true);
            }}
          />
        )}
      </aside>
      <div ref={mapRef} className="map-canvas community-map" />
    </section>
  );
}
