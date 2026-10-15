/**
 * Atlas is off for the public until the owner turns it on. It shows when
 * VITE_ATLAS_ENABLED=true, or for a single browser after visiting any page
 * with ?atlas=1 (?atlas=0 turns it back off).
 */
const KEY = 'vb_atlas';

export function isAtlasEnabled(): boolean {
  if (import.meta.env.VITE_ATLAS_ENABLED === 'true') return true;
  if (typeof window === 'undefined') return false;
  try {
    const param = new URLSearchParams(window.location.search).get('atlas');
    if (param === '1') window.localStorage.setItem(KEY, '1');
    if (param === '0') window.localStorage.removeItem(KEY);
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/** What a visitor asked Atlas for when starting a call from a page button. */
export type AtlasTopic = 'buy' | 'rent' | 'list' | 'launch';

export const ATLAS_START_EVENT = 'atlas:start';

/** Start a call with Atlas from anywhere on the site (e.g. the /atlas page). */
export function startAtlas(opts: { mode?: 'voice' | 'text'; topic?: AtlasTopic } = {}) {
  window.dispatchEvent(new CustomEvent(ATLAS_START_EVENT, { detail: { mode: opts.mode ?? 'voice', topic: opts.topic } }));
}

/** Briefing sent to Atlas when the call starts from a topic button. */
export const ATLAS_TOPIC_BRIEFINGS: Record<AtlasTopic, string> = {
  buy: 'The visitor pressed "Help me buy" on the Atlas page. After your greeting and getting their city or ZIP, help them find and buy the right truck or trailer.',
  rent: 'The visitor pressed "Help me rent" on the Atlas page. After your greeting and getting their city or ZIP, help them find a rental and pick dates.',
  list: 'The visitor pressed "Help me list mine" on the Atlas page. They want to sell or rent out their own equipment: walk them through creating a great listing (open_page "sell"), pricing, photos, and rent-while-you-sell.',
  launch: 'The visitor pressed "Help me launch" on the Atlas page. They have (or are about to have) their truck or trailer and want help launching and growing the business: menu, pricing, where to set up, permits, marketing and extra income. Be their business coach.',
};
