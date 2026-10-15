import type { AtlasListingCard } from './atlasTools';

/**
 * Call memory for Atlas, kept in this browser only. A buyer who leaves and
 * comes back within 30 minutes of the last activity can pick the call back
 * up (Atlas is briefed on what was said); after that it expires and the next
 * call starts fresh. "Start over" clears it at any time.
 */
export const ATLAS_MEMORY_KEY = 'vb_atlas_call';
export const ATLAS_RESUME_WINDOW_MS = 30 * 60 * 1000;
const MAX_TURNS = 16;
const MAX_TEXT = 400;

export interface AtlasTurn {
  from: 'atlas' | 'you';
  text: string;
}

export interface AtlasMemory {
  updatedAt: number;
  turns: AtlasTurn[];
  cards: AtlasListingCard[];
  lastPath: string;
}

const storage = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

/** The saved call, or null when there is none or it is older than 30 minutes. */
export function loadAtlasMemory(now = Date.now()): AtlasMemory | null {
  const s = storage();
  try {
    const raw = s?.getItem(ATLAS_MEMORY_KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as AtlasMemory;
    if (!m || typeof m.updatedAt !== 'number' || !Array.isArray(m.turns)) throw new Error('bad');
    if (now - m.updatedAt > ATLAS_RESUME_WINDOW_MS || m.turns.length === 0) {
      s?.removeItem(ATLAS_MEMORY_KEY);
      return null;
    }
    return { ...m, cards: Array.isArray(m.cards) ? m.cards : [], lastPath: String(m.lastPath ?? '/') };
  } catch {
    try { s?.removeItem(ATLAS_MEMORY_KEY); } catch { /* ignore */ }
    return null;
  }
}

export function saveAtlasMemory(m: Omit<AtlasMemory, 'updatedAt'>, now = Date.now()): void {
  const s = storage();
  try {
    const turns = m.turns.slice(-MAX_TURNS).map((t) => ({ from: t.from, text: t.text.slice(0, MAX_TEXT) }));
    s?.setItem(ATLAS_MEMORY_KEY, JSON.stringify({ ...m, turns, cards: m.cards.slice(0, 6), updatedAt: now }));
  } catch {
    /* private mode / full storage: the call still works, just without memory */
  }
}

export function clearAtlasMemory(): void {
  try { storage()?.removeItem(ATLAS_MEMORY_KEY); } catch { /* ignore */ }
}

/** Briefing sent to Atlas when a buyer picks a call back up. */
export function buildResumeBriefing(m: AtlasMemory): string {
  const transcript = m.turns.map((t) => `${t.from === 'atlas' ? 'Atlas' : 'Buyer'}: ${t.text}`).join('\n');
  const shown = m.cards.length
    ? `\nListings you showed them: ${m.cards.map((c) => `${c.title} (${c.priceText}, ${c.location}, id ${c.id})`).join('; ')}.`
    : '';
  return `The buyer is picking up an earlier call with you from a few minutes ago. Do not reintroduce yourself or restart; greet them back briefly ("Welcome back") and continue from where you left off. They are now on ${m.lastPath}.${shown}\nEarlier conversation:\n${transcript}`;
}
