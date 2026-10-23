/**
 * Owner launch: Atlas is the public assistant. An explicit build-time false
 * remains the emergency off switch; old per-browser preview flags are ignored.
 */
export function isAtlasEnabled(): boolean {
  return import.meta.env.VITE_ATLAS_ENABLED !== 'false';
}

/** What a visitor asked Atlas for when starting a call from a page button. */
export type AtlasTopic = 'buy' | 'rent' | 'list' | 'launch' | 'negotiate' | 'menu' | 'meeting';

export const ATLAS_START_EVENT = 'atlas:start';

/** Start a call with Atlas from anywhere on the site (e.g. the /atlas page). */
export function startAtlas(opts: { mode?: 'voice' | 'text'; topic?: AtlasTopic } = {}) {
  window.dispatchEvent(new CustomEvent(ATLAS_START_EVENT, { detail: { mode: opts.mode ?? 'voice', topic: opts.topic } }));
}

/** Briefing sent to Atlas when the call starts from a topic button. */
export const ATLAS_TOPIC_BRIEFINGS: Record<AtlasTopic, string> = {
  negotiate: 'The buyer wants to understand negotiation. Explain choosing an offer, drafting the exact seller message for their approval, and their own final submission of formal offers. Ask which listing they mean. Never promise acceptance or send without approval.',
  menu: 'The buyer wants to picture a menu. Identify their listing and call show_menu_concept to display ideas supported by its listed equipment. Ask which direction they like; do not predict earnings or infer unlisted appliances.',
  meeting: 'The buyer wants a customer-success meeting about buying or a listing. Use attached Calendly tools to find the appropriate existing event type and availability. Confirm time zone, slot and email before booking. Never claim success without the actual booking result. If unavailable offer a consented follow-up.',
  buy: 'The visitor pressed "Help me buy" on the Atlas page. After your greeting and getting their city or ZIP, help them find and buy the right truck or trailer.',
  rent: 'The visitor pressed "Help me rent" on the Atlas page. After your greeting and getting their city or ZIP, help them find a rental and pick dates.',
  list: 'The visitor pressed "Help me list mine" on the Atlas page. They want to sell or rent out their own equipment: walk them through creating a great listing (open_page "sell"), pricing, photos, and rent-while-you-sell.',
  launch: 'The visitor pressed "Help me launch" on the Atlas page. They have (or are about to have) their truck or trailer and want help launching and growing the business: menu, pricing, where to set up, permits, marketing and extra income. Be their business coach.',
};
