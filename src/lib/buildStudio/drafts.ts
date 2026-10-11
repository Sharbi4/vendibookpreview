import { EQUIPMENT, EXTERIOR_COLORS, type BuildConfig } from './catalog';

export const DRAFT_KEY = 'vb.buildStudio.draft.v2';
export const SAVES_KEY = 'vb.buildStudio.saves.v1';
export type StudioDraft = { name: string; savedAt: string; config: BuildConfig; categories?: string[]; menu?: string[] };

/** Treat browser storage as untrusted input; ignore malformed and retired catalog entries. */
export function parseDraft(value: unknown): StudioDraft | null {
  if (!value || typeof value !== 'object') return null;
  const d = value as StudioDraft;
  if (typeof d.name !== 'string' || typeof d.savedAt !== 'string' || !Number.isFinite(Date.parse(d.savedAt)) || !d.config || !Array.isArray(d.config.items)) return null;
  if (!EXTERIOR_COLORS.some(c => c.id === d.config.color)) return null;
  if (d.config.items.length > 100 || d.config.items.some(p => !p || typeof p.uid !== 'string' || !EQUIPMENT.some(e => e.id === p.id) || !['back', 'service'].includes(p.wall) || !Number.isFinite(p.x))) return null;
  if (new Set(d.config.items.map(p => p.uid)).size !== d.config.items.length) return null;
  return { name: d.name.slice(0, 80), savedAt: d.savedAt, config: { color: d.config.color, items: d.config.items.map(p => ({ uid: p.uid, id: p.id, wall: p.wall, x: p.x })) },
    categories: Array.isArray(d.categories) ? d.categories.filter(x => typeof x === 'string').slice(0, 9) : [],
    menu: Array.isArray(d.menu) ? d.menu.filter(x => typeof x === 'string').map(x => x.slice(0, 40)).slice(0, 20) : [] };
}
export function readDrafts(storage: Pick<Storage, 'getItem'>, key = SAVES_KEY): StudioDraft[] {
  const raw = storage.getItem(key);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Saved builds are unreadable.');
  const drafts = parsed.map(parseDraft);
  if (drafts.some(d => d === null)) throw new Error('A saved build uses unavailable catalog data.');
  return drafts as StudioDraft[];
}
