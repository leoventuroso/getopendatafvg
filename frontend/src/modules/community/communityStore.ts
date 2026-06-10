import type { CommunityReport } from '../../lib/duckdb';

export const MUNICIPALITY_EMAIL = 'info@comune.montereale-valcellina.pn.it';

const LS_KEY = 'mv_pending_reports';
const LS_VOTES_KEY = 'mv_report_votes';
const LS_VOTED_IDS_KEY = 'mv_voted_ids';

export const CATEGORIES = [
  { id: 'strade',        label: 'Viabilità e strade',  icon: 'bi-cone-striped',     color: '#e8590c' },
  { id: 'natura',        label: 'Sentieri e natura',    icon: 'bi-tree',             color: '#2f9e44' },
  { id: 'rifiuti',       label: 'Rifiuti e degrado',    icon: 'bi-trash',            color: '#7b2cbf' },
  { id: 'illuminazione', label: 'Illuminazione',        icon: 'bi-lightbulb',        color: '#f59f00' },
  { id: 'segnaletica',   label: 'Segnaletica',          icon: 'bi-sign-stop-fill',   color: '#1c7ed6' },
  { id: 'proposta',      label: 'Proposta',             icon: 'bi-chat-square-dots', color: '#0ca678' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];
export type Category = (typeof CATEGORIES)[number];

export type FormState = { category: CategoryId; title: string; description: string };
export type PhotoState = { fileName: string; previewUrl: string; dataUrl: string };

export const EMPTY_FORM: FormState = { category: 'strade', title: '', description: '' };

export function categoryColor(id: string): string {
  return CATEGORIES.find(c => c.id === id)?.color ?? '#6c757d';
}

export function categoryLabel(id: string): string {
  return CATEGORIES.find(c => c.id === id)?.label ?? id;
}

export function resizeImageToDataUrl(file: File, maxWidth = 1024, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('canvas')); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('load')); };
    img.src = objectUrl;
  });
}

export function loadPending(): CommunityReport[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw) as CommunityReport[];
    return items.map(r => ({ ...r, pending: true }));
  } catch {
    return [];
  }
}

export function savePending(reports: CommunityReport[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(reports.filter(r => r.pending)));
}

export function loadVotes(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LS_VOTES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export function saveVotes(votes: Record<string, number>): void {
  localStorage.setItem(LS_VOTES_KEY, JSON.stringify(votes));
}

export function loadVotedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_VOTED_IDS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export function saveVotedIds(ids: Set<string>): void {
  localStorage.setItem(LS_VOTED_IDS_KEY, JSON.stringify([...ids]));
}
