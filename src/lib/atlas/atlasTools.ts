import { supabase } from '@/integrations/supabase/client';
import { invokeEdge } from '@/lib/edge/invokeFunction';
import { applyDiscoveryListingFilter, applyPublicListingFilter } from '@/lib/listings/publicVisibility';
import { excludeTestListings, isExcludedTestListingTitle } from '@/lib/excludeTestListings';
import { estimateDelivery, formatUsd, normalizeDeliveryFeeType } from '@/lib/fulfillment/delivery';
import { FEE_CONFIG } from '../../../supabase/functions/_shared/feeConfig';
import { pageAction, pickOption, scanPage } from './atlasPage';
import { GUIDE_FAQ, type GuideFaq } from './atlasGuideFaq';
import { cookingIntent, matchCookingEquipment, normalizeAtlasState, STATE_NAMES } from './atlasEquipment';
import { getPermitRequirements } from './atlasPermitKnowledge';
import { menuIdeasForListing, type AtlasMenuConcept } from './atlasMenu';

const FAQ_STOP = new Set(['a', 'an', 'the', 'i', 'my', 'me', 'do', 'does', 'is', 'are', 'can', 'to', 'of', 'for', 'and', 'or', 'on', 'in', 'it', 'what', 'how', 'if', 'you', 'your', 'with', 'be', 'get', 'will', 'there', 'this']);
const faqWords = (s: string) => s.toLowerCase().replace(/[^a-z0-9%$ ]+/g, ' ').split(/\s+/).filter((w) => w.length > 1 && !FAQ_STOP.has(w));

/** Best matches from the owner's master-guide FAQ bank for a free-text question. */
export function searchGuideFaq(question: string, limit = 3): GuideFaq[] {
  const words = faqWords(question);
  if (!words.length) return [];
  const stem = (w: string) => w.replace(/(ing|es|s)$/, '');
  const qStems = words.map(stem);
  return GUIDE_FAQ.map((e) => {
    const qw = faqWords(e.question).map(stem);
    const aw = new Set(faqWords(e.answer).map(stem));
    const score = qStems.reduce((n, w) => n + (qw.includes(w) ? 3 : 0) + (aw.has(w) ? 1 : 0), 0);
    return { e, score };
  })
    .filter((r) => r.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.e);
}

/**
 * Paid products Atlas may mention, with the benefit wording he may use.
 * Prices always come live from monetization_products. The concierge listing
 * service is deliberately absent (owner: no Concierge).
 */
export const ATLAS_PRODUCTS: Record<string, string> = {
  vendibook_pro: 'Monthly membership for sellers: BuyerMatch finds buyers for your sale listings, plus a Featured Boost credit every billing period and PricePilot appraisals.',
  'boost-featured-30': 'Featured badge and a spot in the Featured row on the homepage for 30 days.',
  pro_listing_30: 'Upgrades one listing to Pro placement and presentation for 30 days.',
  tool_pricepilot: 'A data-backed pricing appraisal with comparable listings and a recommended asking price.',
  listing_rewrite: 'A rewrite of the listing title, description and highlights, reviewed by a Vendibook editor.',
  permit_path_plus_monthly: 'PermitPath Plus: saved permit roadmaps, documents and renewal reminders.',
};

/**
 * Client tools for Atlas, the Vendibook sales agent. Each returns a short
 * plain-text/JSON string for the agent to speak from. Only public listing
 * data is read; shipping returns quote totals, never the formula.
 */

export interface AtlasListingCard {
  id: string;
  title: string;
  priceText: string;
  location: string;
  photo: string | null;
  mode: 'sale' | 'rent';
}

export interface AtlasToolDeps {
  navigate: (to: string) => void;
  showResults: (cards: AtlasListingCard[]) => void;
  currentListingId: () => string | null;
  /** Opens the live support chat; false when it isn't loaded. */
  openLiveChat?: () => boolean;
  /** Opens the seller message form prefilled; the buyer taps Send. */
  openMessage?: (d: AtlasSellerDraft) => void;
  /** Opens Make offer prefilled; the buyer reviews and sends. */
  openOffer?: (d: AtlasOfferDraft) => void;
  /** Signed-in buyer's user id, or null for guests. */
  currentUserId?: () => string | null;
  openBuyerFollowUp?: (draft: { topic: string; summary: string; declined?: boolean }) => boolean;
  showMenuConcept?: (concept: AtlasMenuConcept) => void;
  /**
   * Sends a draft the buyer approved out loud, through normal Vendibook
   * messaging (risk scan + phone/ID gate apply). Resolves to the conversation id.
   */
  sendSellerMessage?: (d: AtlasSellerDraft) => Promise<string>;
}

/** How long a draft shown on screen stays sendable by voice approval. */
export const ATLAS_DRAFT_TTL_MS = 15 * 60 * 1000;

export interface AtlasSellerDraft {
  listingId: string;
  hostId: string;
  title: string;
  message: string;
}

export interface AtlasOfferDraft extends AtlasSellerDraft {
  askingPrice: number;
  amount: number;
}

const CARD_COLUMNS =
  'id, title, mode, category, price_sale, price_daily, city, state, condition, cover_image_url, image_urls, description, year_built, featured_enabled, vendibook_freight_enabled, freight_payer, accepts_offers, available_to, amenities, highlights, included_items';

const DETAIL_COLUMNS =
  `${CARD_COLUMNS}, host_id, make, model, length_inches, fulfillment_type, delivery_radius_miles, delivery_fee, delivery_fee_type, latitude, longitude, postal_code, weight_lbs, width_inches, height_inches, hitch_ball_size, coupler_type, trailer_plug_type, tow_vehicle_requirement, fuel_type, renter_provides_tow_vehicle, no_known_problems, known_problems, status, published_at, deleted_at, moderation_status, unlisted`;

// Untyped rows: the dynamic column lists defeat the generated Supabase types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseQuery = any;

const money = (n: unknown) =>
  typeof n === 'number' || (typeof n === 'string' && n !== '')
    ? `$${Math.round(Number(n)).toLocaleString('en-US')}`
    : null;

export function listingPriceText(l: Row): string {
  if (l.mode === 'rent') return l.price_daily ? `${money(l.price_daily)}/day` : 'Rate on request';
  return money(l.price_sale) ?? 'Price on request';
}

export function toCard(l: Row): AtlasListingCard {
  return {
    id: String(l.id),
    title: String(l.title ?? 'Untitled listing').trim(),
    priceText: listingPriceText(l),
    location: [l.city, l.state].filter(Boolean).join(', '),
    photo: l.cover_image_url || (Array.isArray(l.image_urls) ? l.image_urls[0] : null) || null,
    mode: l.mode === 'rent' ? 'rent' : 'sale',
  };
}

const excerpt = (text: unknown, max: number) => {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max).trimEnd()}…` : s;
};

/** Strip characters that would break a PostgREST or() filter. */
export function safeKeywords(raw: unknown): string[] {
  return String(raw ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3)
    .slice(0, 4);
}

/** Whole-word relevance: the full phrase counts most, title beats description. */
export function keywordScore(l: Row, words: string[], phrase: string): number {
  const title = String(l.title ?? '').toLowerCase();
  const body = [l.description, l.included_items, ...(Array.isArray(l.amenities) ? l.amenities : []), ...(Array.isArray(l.highlights) ? l.highlights : [])].filter(Boolean).join(' ').toLowerCase();
  const p = phrase.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  let score = 0;
  if (p.includes(' ')) {
    if (title.includes(p)) score += 8;
    if (body.includes(p)) score += 4;
  }
  for (const w of words) {
    const re = new RegExp(`\\b${w}`, 'i');
    if (re.test(title)) score += 2;
    if (re.test(body)) score += 1;
  }
  return score;
}

const parseNum = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Atlas only ever offers listings a buyer can act on today: on top of the public
 * filter (published, not deleted/archived/paused, moderation clear), never a test
 * listing and never a rental whose availability window has already ended.
 */
export function isStillOffered(l: Row, today = new Date().toISOString().slice(0, 10)): boolean {
  if (isExcludedTestListingTitle(typeof l.title === 'string' ? l.title : null)) return false;
  if (l.mode === 'rent' && typeof l.available_to === 'string' && l.available_to.slice(0, 10) < today) return false;
  return true;
}

async function fetchPublicListing(id: string): Promise<Row | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const query: LooseQuery = supabase.from('listings').select(DETAIL_COLUMNS).eq('id', id);
  const { data } = await applyPublicListingFilter(query as LooseQuery).maybeSingle();
  const l = (data as Row | null) ?? null;
  return l && isStillOffered(l) ? l : null;
}

/** Of these ids, the ones still live in discovery (used to re-check listings remembered from an earlier call). */
export async function liveListingIds(ids: string[]): Promise<Set<string>> {
  const clean = ids.filter((id) => UUID.test(id)).slice(0, 12);
  if (!clean.length) return new Set();
  let q: LooseQuery = supabase.from('listings').select('id, title, mode, available_to').in('id', clean);
  q = excludeTestListings(applyDiscoveryListingFilter(q));
  const { data, error } = await q;
  if (error) return new Set();
  return new Set(((data ?? []) as Row[]).filter((l) => isStillOffered(l)).map((l) => String(l.id)));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORDINALS: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, last: -1 };

/** Edit distance, capped: voice models drop or swap a few characters of long ids. */
function editDistance(a: string, b: string, cap = 6): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, cur[j]);
    }
    if (best > cap) return cap + 1;
    prev = cur;
  }
  return prev[b.length];
}

export type ListingRef = { id: string; title?: unknown };

/**
 * Which listing the agent means. Accepts the exact id, a result number or
 * ordinal ("1", "#2", "first", "last"), "this"/"current" (the listing on
 * screen), an id with a few wrong characters, or a title from the last
 * results. Returns null when nothing matches.
 */
export function resolveListingRef(raw: unknown, recent: ListingRef[], currentId: string | null): string | null {
  const text = String(raw ?? '').trim().toLowerCase();
  if (UUID.test(text)) {
    if (recent.some((r) => r.id === text) || !recent.length) return text;
  }
  if (!text || /^(this|current|this one|that one|it)$/.test(text)) return currentId;
  const num = text.match(/^(?:#|no\.?\s*|number\s*|result\s*)?(\d{1,2})$/);
  const ordKey = text.replace(/\s*(one|listing|result)$/, '').trim();
  const ord = Object.prototype.hasOwnProperty.call(ORDINALS, ordKey) ? ORDINALS[ordKey] : undefined;
  const index = num ? Number(num[1]) : ord;
  if (index) {
    const hit = index === -1 ? recent[recent.length - 1] : recent[index - 1];
    if (hit) return hit.id;
  }
  const hex = text.replace(/[^0-9a-f]/g, '');
  if (hex.length >= 8) {
    const byPrefix = recent.filter((r) => r.id.replace(/-/g, '').startsWith(hex.slice(0, 8)));
    if (byPrefix.length === 1) return byPrefix[0].id;
    const close = recent
      .map((r) => ({ id: r.id, d: editDistance(hex, r.id.replace(/-/g, '')) }))
      .filter((r) => r.d <= 4)
      .sort((a, b) => a.d - b.d);
    if (close.length && (close.length === 1 || close[0].d < close[1].d)) return close[0].id;
  }
  if (UUID.test(text)) return text;
  const words = text.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  if (words.length) {
    const byTitle = recent.filter((r) => {
      const title = String(r.title ?? '').toLowerCase();
      return words.every((w) => title.includes(w));
    });
    if (byTitle.length === 1) return byTitle[0].id;
  }
  return null;
}

/** Mirrors DeliveryCheckSheet: fulfillment_type defaults to pickup. */
const fulfillmentOf = (l: Row) => {
  const ft = String(l.fulfillment_type || 'pickup');
  return { sellerDelivers: ft === 'delivery' || ft === 'both', pickup: ft === 'pickup' || ft === 'on_site' || ft === 'both' };
};

const fulfillmentSummary = (l: Row) => {
  const parts: string[] = [];
  const f = fulfillmentOf(l);
  if (f.pickup) parts.push('pickup available');
  if (f.sellerDelivers) {
    parts.push(l.delivery_radius_miles ? `seller delivers within ${l.delivery_radius_miles} miles` : 'seller delivery available');
  }
  if (l.mode === 'sale' && l.vendibook_freight_enabled) {
    parts.push(l.freight_payer === 'seller' ? 'free nationwide shipping (seller covers freight)' : 'nationwide Vendibook Freight available (quote by ZIP)');
  }
  return parts.join('; ');
};

export function createAtlasTools(deps: AtlasToolDeps) {
  // Listings Atlas has shown in this call, newest search first, so "the first
  // one" or a slightly garbled id still lands on the right listing.
  let recent: ListingRef[] = [];
  // The last draft shown on screen per listing. send_seller_message only ever
  // sends this exact text, so the agent can't change it after the buyer said yes.
  const shownDrafts = new Map<string, AtlasSellerDraft & { shownAt: number }>();

  /** The listing the agent means, or a sentence explaining why not. */
  const listingFor = async (p: Row): Promise<{ l: Row; why?: never } | { l?: never; why: string }> => {
    const id = resolveListingRef(p.listing_id, recent, deps.currentListingId());
    if (!id) {
      return {
        why: 'Not sure which listing that is. Use the id from search_listings, the result number (1 = first result), or "current" for the listing on their screen. Do not tell the buyer it is unavailable.',
      };
    }
    const l = await fetchPublicListing(id);
    if (!l) return { why: 'That listing was taken down and is no longer available. Say so briefly and offer similar ones.' };
    if (!recent.some((r) => r.id === l.id)) recent = [...recent, { id: String(l.id), title: l.title }];
    return { l };
  };

  return {
    get_permit_requirements: async (p: Row = {}) => JSON.stringify(getPermitRequirements(p)),

    show_menu_concept: async (p: Row = {}) => {
      const result = await listingFor(p);
      if (result.why) return result.why;
      const listing = result.l!;
      const items = menuIdeasForListing(listing);
      if (!items.length) return 'The listing does not confirm enough cooking equipment to build a supported menu. Ask the seller about equipment before showing dish ideas; do not infer appliances from the title or photos.';
      const concept: AtlasMenuConcept = { listingId: String(listing.id), listingTitle: String(listing.title), photo: toCard(listing).photo, items,
        note: 'Concept ideas, not an approved operating menu or earnings forecast. Confirm equipment condition, refrigeration, sinks, water, utilities, ventilation, food safety and local approval. Set prices only after checking your own ingredient, labor and operating costs.' };
      if (!deps.showMenuConcept) return 'Menu display is unavailable. Do not say it is on screen.';
      deps.showMenuConcept(concept);
      return JSON.stringify({ ...concept, next_question: 'Which of these menu directions fits what you want to cook?', status: 'concept_displayed' });
    },

    offer_buyer_follow_up: async (p: Row = {}) => {
      if (!deps.openBuyerFollowUp) return 'Follow-up form unavailable. Offer the contact page; do not claim a request was saved.';
      if (p.declined === true) {
        deps.openBuyerFollowUp({ topic: '', summary: '', declined: true });
        return 'Buyer declined follow-up. No form opened or contact saved. Suppress the end-of-call prompt and continue helping without asking again.';
      }
      const opened = deps.openBuyerFollowUp({ topic: String(p.topic || 'Buying shortlist').slice(0, 120), summary: String(p.summary || 'Buyer would like help continuing their search.').slice(0, 1500) });
      if (!opened) return 'This optional follow-up was already offered in this session. Do not repeat it; continue helping the buyer.';
      return 'Opened an optional email follow-up form. The buyer enters their name/email and consents themselves. Nothing is saved or sent until they submit. Do not say an email or booking has been sent. Respect dismissal and keep helping.';
    },

    search_listings: async (p: Row = {}) => {
      const state = normalizeAtlasState(p.state);
      const city = String(p.city ?? '').trim().slice(0,80).toLowerCase();
      const shipsOnly = p.ships_nationwide === true || p.ships_nationwide === 'true';
      const nationwide = p.search_scope === 'nationwide' || shipsOnly;
      if (!state && !nationwide) return JSON.stringify({results:[],search_status:'location_needed',note:'Ask for their city and state or ZIP before recommending inventory. Do not jump to nationwide shipping.'});
      const intent = cookingIntent(p.food_concept || p.keywords);
      const required = String(p.required_equipment ?? '').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean).slice(0,8);
      const words = intent ? [] : safeKeywords(p.keywords);
      const found = new Map<string,Row>();
      let incomplete = false;
      for (let page=0; page<10; page++) {
        const inventoryQuery: LooseQuery = supabase.from('listings').select(CARD_COLUMNS);
        let q: LooseQuery = excludeTestListings(applyDiscoveryListingFilter(inventoryQuery));
        if (shipsOnly) q=q.eq('mode','sale').eq('vendibook_freight_enabled',true);
        else if (p.mode==='sale' || p.mode==='rent') q=q.eq('mode',p.mode);
        if (['food_truck','food_trailer','ghost_kitchen','vendor_space','vendor_lot'].includes(p.category)) q=q.eq('category',p.category);
        if (!nationwide) q=q.or(`state.ilike.${state},state.ilike.${STATE_NAMES[state]}`);
        const priceCol=p.mode==='rent'?'price_daily':'price_sale';
        const max=parseNum(p.max_price),min=parseNum(p.min_price);
        if(max) q=q.lte(priceCol,max);
        if(min) q=q.gte(priceCol,min);
        q=q.order('published_at',{ascending:false}).order('id',{ascending:true});
        const {data,error}=await (typeof q.range==='function'?q.range(page*200,page*200+199):q.limit(200));
        if(error) return JSON.stringify({results:[],search_status:'unavailable',note:'Inventory could not be checked. This is not evidence of no suitable local trucks. Offer retry; do not use nationwide fallback to mask the failure.'});
        const batch=(data??[]) as Row[];
        for(const l of batch) if(isStillOffered(l) && (nationwide || normalizeAtlasState(l.state)===state)) found.set(String(l.id),l);
        if(batch.length<200) break;
        if(page===9) incomplete=true;
      }
      const candidates=[...found.values()].map(l=>{
        const equipment=intent?matchCookingEquipment(l,intent):null;
        const additional=required.map(term=>({term,confirmed:matchCookingEquipment(l,{name:'requested equipment',cooking:[term],optional:[],question:''}).cooking.length>0}));
        const relevance=words.length?keywordScore(l,words,String(p.keywords??'')):0;
        const cityMatch=!!city && String(l.city??'').trim().toLowerCase()===city;
        return {l,equipment,additional,relevance,cityMatch,fit:(!intent || !!equipment?.cooking.length) && additional.every(r=>r.confirmed)};
      }).filter(r=>!words.length || r.relevance>0);
      candidates.sort((a,b)=>Number(normalizeAtlasState(b.l.state)===state)-Number(normalizeAtlasState(a.l.state)===state)
        || Number(b.fit)-Number(a.fit) || Number(b.cityMatch)-Number(a.cityMatch) || b.relevance-a.relevance);
      const selected=candidates.slice(0,6);
      if(selected.length) recent=selected.map(r=>({id:String(r.l.id),title:r.l.title}));
      deps.showResults(selected.map(r=>toCard(r.l)));
      const confirmed=candidates.filter(r=>r.fit).length;
      return JSON.stringify({
        search_scope:nationwide?'nationwide_with_buyer_permission':'requested_state',
        requested_location:[p.city,state].filter(Boolean).join(', '),
        search_complete:!incomplete,candidate_count:candidates.length,
        in_your_state:selected.filter(r=>normalizeAtlasState(r.l.state)===state).length,
        ...(intent?{cooking_plan:intent.name,clarifying_question:intent.question,equipment_confirmed_count:confirmed}:{}),
        note: incomplete?'The candidate scan reached its safety limit. Do not claim this is all inventory or that no suitable local option exists.'
          : selected.length===0?'No confirmed match in this search. Clarify menu, equipment and travel radius, retry a broader local category or ask about undocumented equipment. Only expand nationwide after the buyer agrees.'
          : intent && confirmed===0?'These are local candidates with cooking equipment unconfirmed. Do not describe them as ready for this menu. Ask the cooking-method question, inspect full details or offer to confirm with sellers. Do not immediately pitch nationwide shipping.'
          : 'Describe only listed equipment as potential menu fit. Ask one useful follow-up; confirm condition, capacity, utilities, ventilation, sinks, refrigeration and local approval separately. Stay local unless the buyer asks to widen. Do not pitch freight during the first local search.',
        results:selected.map(({l,equipment,additional,fit},i)=>({
          result:i+1,id:l.id,title:l.title,price:listingPriceText(l),location:[l.city,l.state].filter(Boolean).join(', '),type:l.category,
          condition:l.condition??'not stated',year:l.year_built??undefined,
          ...(equipment?{fit_status:fit?'potential_equipment_match':'equipment_unconfirmed',listed_cooking_equipment:equipment.cooking,listed_optional_equipment:equipment.optional}:{}),
          ...(required.length?{required_equipment_check:additional}:{}),
          equipment:Array.isArray(l.amenities)?l.amenities.slice(0,20):[],
          ships_nationwide:l.mode==='sale'&&Boolean(l.vendibook_freight_enabled),
          shipping:l.mode==='sale'&&l.vendibook_freight_enabled?(l.freight_payer==='seller'?'free shipping':'Vendibook Freight available; quote only if requested'):undefined,
          about:excerpt(l.description,220),
        })),
      });
    },

    show_listing: async (p: Row = {}) => {
      const { l, why } = await listingFor(p);
      if (!l) return why;
      deps.navigate(`/listing/${l.id}`);
      return JSON.stringify({
        opened: true,
        title: l.title,
        price: listingPriceText(l),
        location: [l.city, l.state].filter(Boolean).join(', '),
        mode: l.mode,
        condition: l.condition ?? 'not stated',
        year: l.year_built ?? undefined,
        make_model: [l.make, l.model].filter(Boolean).join(' ') || undefined,
        length_ft: l.length_inches ? Math.round(Number(l.length_inches) / 12) : undefined,
        width_ft: l.width_inches ? Math.round((Number(l.width_inches) / 12) * 10) / 10 : undefined,
        height_ft: l.height_inches ? Math.round((Number(l.height_inches) / 12) * 10) / 10 : undefined,
        towing: {
          weight_lbs: l.weight_lbs ?? 'not listed',
          hitch_ball: l.hitch_ball_size ?? 'not listed',
          coupler: l.coupler_type ?? 'not listed',
          plug: l.trailer_plug_type ?? 'not listed',
          tow_vehicle: l.tow_vehicle_requirement ?? undefined,
        },
        fuel_or_power: l.fuel_type ?? 'not listed',
        highlights: Array.isArray(l.highlights) ? l.highlights.slice(0, 8) : undefined,
        equipment: Array.isArray(l.amenities) ? l.amenities.slice(0, 15) : undefined,
        included: excerpt(l.included_items, 300) || undefined,
        known_issues: l.no_known_problems ? 'seller reports none' : excerpt(l.known_problems, 200) || 'not stated',
        accepts_offers: Boolean(l.accepts_offers),
        delivery: fulfillmentSummary(l),
        about: excerpt(l.description, 600),
      });
    },

    get_delivery_quote: async (p: Row = {}) => {
      const zip = String(p.zip ?? '').replace(/\D/g, '').slice(0, 5);
      if (zip.length !== 5) return 'Ask for a 5-digit ZIP code.';
      const { l, why } = await listingFor(p);
      if (!l) return why;
      const geo = await invokeEdge<{ results?: Row[] }>('geocode-location', { body: { query: zip, limit: 1 } }, { retries: 1 });
      const hit = geo.data?.results?.[0];
      const [lng, lat] = Array.isArray(hit?.center) ? hit!.center : [];
      if (typeof lat !== 'number' || typeof lng !== 'number') return 'That ZIP code was not found. Ask them to double-check it.';
      const place = [hit?.city || hit?.text, hit?.state].filter(Boolean).join(', ') || zip;
      const options: Row[] = [];
      const hasCoords = typeof l.latitude === 'number' && typeof l.longitude === 'number';
      const miles = hasCoords ? haversine(l.latitude, l.longitude, lat, lng) : null;

      const f = fulfillmentOf(l);
      if (f.sellerDelivers && miles !== null && (!l.delivery_radius_miles || miles <= Number(l.delivery_radius_miles))) {
        const est = estimateDelivery(l.delivery_fee, l.delivery_fee_type, miles);
        const flat = normalizeDeliveryFeeType(l.delivery_fee_type) !== 'per_mile';
        options.push({
          option: 'Seller delivery',
          quote: !l.delivery_fee ? 'included at no extra charge' : est.isRange ? `about ${formatUsd(est.minFee)}–${formatUsd(est.maxFee)}` : formatUsd(est.fee),
          note: flat ? 'flat charge set by the seller' : 'estimate, confirmed at checkout',
        });
      }
      if (l.mode === 'sale' && l.vendibook_freight_enabled) {
        if (l.freight_payer === 'seller') {
          options.push({ option: 'Vendibook Freight', quote: 'Free shipping (the seller covers it)' });
        } else {
          const { data } = await invokeEdge<{ estimate?: Row }>('estimate-freight', {
            body: {
              origin_address: [l.city, l.state, l.postal_code].filter(Boolean).join(', '),
              destination_address: zip,
              origin_coords: hasCoords ? { lat: l.latitude, lng: l.longitude } : undefined,
              destination_coords: { lat, lng },
              item_category: 'oversized',
            },
          }, { retries: 1 });
          const e = data?.estimate;
          if (e?.total_cost) {
            options.push({
              option: 'Vendibook Freight',
              quote: `${formatUsd(Number(e.total_cost))} including tax`,
              transit: e.estimated_transit_days ? `${e.estimated_transit_days.min}–${e.estimated_transit_days.max} business days` : undefined,
            });
          } else {
            options.push({ option: 'Vendibook Freight', quote: 'available; exact amount shown at checkout' });
          }
        }
      }
      if (f.pickup) options.push({ option: 'Pickup', quote: `free, in ${[l.city, l.state].filter(Boolean).join(', ')}` });
      if (!options.length) return `No delivery option reaches ${place}. Pickup in ${[l.city, l.state].filter(Boolean).join(', ')} may still work — suggest asking the seller.`;
      // Quote totals only — never the rate or the math behind them.
      return JSON.stringify({ to: place, options });
    },

    start_request_to_buy: async (p: Row = {}) => {
      const { l, why } = await listingFor(p);
      if (!l) return why;
      if (l.mode === 'rent') {
        deps.navigate(`/listing/${l.id}`);
        return 'Opened the listing. Rentals are booked by picking dates on the page, then the host approves.';
      }
      deps.navigate(`/checkout/${l.id}`);
      return 'Opened the Request to buy page. They review the order and tap to send it; the seller approves, then Vendibook sends the invoice. They may be asked to verify phone and ID first.';
    },

    draft_seller_message: async (p: Row = {}) => {
      const { l, why } = await listingFor(p);
      if (!l) return why;
      const message = String(p.message ?? '').trim().slice(0, 1000);
      if (!message) return 'Write the message first, then call this again.';
      if (!deps.openMessage) return 'Messaging is not available here. Offer to open the listing so they can tap Ask.';
      if (deps.currentListingId() !== l.id) deps.navigate(`/listing/${l.id}`);
      const draft = { listingId: String(l.id), hostId: String(l.host_id), title: String(l.title ?? ''), message };
      deps.openMessage(draft);
      shownDrafts.set(draft.listingId, { ...draft, shownAt: Date.now() });
      return deps.currentUserId?.()
        ? 'The draft is on their screen; nothing is sent yet. Read the key line back and ask "Want me to send that for you?" Only after a clear yes, call send_seller_message. If they want changes, call draft_seller_message again with the new text. They can also edit it and tap Send themselves.'
        : 'The draft is on their screen; nothing is sent yet. They are not signed in, so you cannot send it for them: they can tap Send to ask as a guest, or sign in and then you can send it.';
    },

    send_seller_message: async (p: Row = {}) => {
      if (p.buyer_approved !== true && p.buyer_approved !== 'true') {
        return 'Not sent. Ask the buyer "Want me to send that for you?" and only call this after they clearly say yes.';
      }
      const { l, why } = await listingFor(p);
      if (!l) return why;
      const draft = shownDrafts.get(String(l.id));
      if (!draft || Date.now() - draft.shownAt > ATLAS_DRAFT_TTL_MS) {
        return 'Not sent: there is no current draft on their screen for this listing. Call draft_seller_message first, let them see it, and ask before sending.';
      }
      const buyerId = deps.currentUserId?.() ?? null;
      if (!buyerId || !deps.sendSellerMessage) {
        return 'Not sent: they need to be signed in for you to send it. The message is still on their screen; they can sign in, or tap Send to ask as a guest.';
      }
      if (buyerId === draft.hostId) return 'Not sent: this is their own listing.';
      try {
        await deps.sendSellerMessage(draft);
        shownDrafts.delete(draft.listingId);
        return 'Sent to the seller through Vendibook messages, exactly as shown. Tell them it went out, that the seller replies in their Vendibook inbox (with an email or text alert), and keep helping.';
      } catch (e) {
        const msg = String((e as { message?: string })?.message ?? '');
        if (/verif|phone|identity|\bid\b/i.test(msg)) {
          return 'Not sent: Vendibook needs them to verify their phone and ID before contacting sellers. The message is still on their screen; tapping Send there walks them through it. Do not ask for any numbers yourself.';
        }
        return 'Not sent: messaging failed just now. The message is still on their screen; they can tap Send, or you can try again in a moment.';
      }
    },

    draft_offer: async (p: Row = {}) => {
      const { l, why } = await listingFor(p);
      if (!l) return why;
      if (l.mode !== 'sale') return 'Offers are only for listings that are for sale. For rentals, suggest asking the host about their rate.';
      if (!l.accepts_offers) return 'This seller is not taking offers on this listing. Offer to draft a message asking if the price is flexible instead.';
      const asking = Number(l.price_sale);
      const amount = Math.round(Number(p.amount));
      if (!Number.isFinite(amount) || amount <= 0) return 'Ask the buyer what amount they want to offer.';
      if (asking && amount >= asking) return `That is at or above the asking price of ${money(asking)}. They can simply request to buy.`;
      if (!deps.openOffer) return 'Offers are not available here. Suggest tapping Make offer on the listing.';
      if (deps.currentListingId() !== l.id) deps.navigate(`/listing/${l.id}`);
      deps.openOffer({
        listingId: String(l.id),
        hostId: String(l.host_id),
        title: String(l.title ?? ''),
        message: String(p.note ?? '').trim().slice(0, 500),
        askingPrice: asking,
        amount,
      });
      return `Opened a ${money(amount)} offer (asking ${money(asking)}) on their screen. They review it and tap Send; the seller can accept, counter or decline. Never promise the seller will accept.`;
    },

    estimate_earnings: async (p: Row = {}) => {
      const ticket = parseNum(p.avg_ticket);
      const customers = parseNum(p.customers_per_day);
      const days = parseNum(p.days_per_week);
      const foodPct = Number(p.food_cost_percent);
      if (!ticket || !customers || !days || !Number.isFinite(foodPct) || foodPct <= 0 || foodPct >= 100) {
        return 'Ask the buyer for their average sale per customer, customers per day, days per week and food cost percent before estimating.';
      }
      const weekly = ticket * customers * Math.min(days, 7);
      const monthly = weekly * 4.33;
      const afterFood = monthly * (1 - foodPct / 100);
      const price = parseNum(p.equipment_price);
      return JSON.stringify({
        their_assumptions: { avg_ticket: money(ticket), customers_per_day: customers, days_per_week: Math.min(days, 7), food_cost_percent: foodPct },
        monthly_sales: money(monthly),
        monthly_after_food_cost: money(afterFood),
        months_of_after_food_cost_to_equal_price: price ? Math.ceil(price / Math.max(afterFood, 1)) : undefined,
        say_this: 'This is simple math on their own numbers, before rent, fuel, labor, permits, commissary, insurance and taxes. It is not a prediction or a promise of income.',
      });
    },

    get_faq: async (p: Row = {}) => {
      const question = String(p.question ?? '').trim().slice(0, 200);
      if (!question) return 'Ask a specific question, e.g. "how do payouts work" or "can I pay cash".';
      const hits = searchGuideFaq(question);
      if (!hits.length) {
        return 'Nothing in the Vendibook policy guide matches. Say you are not sure, do not guess policy, and offer talk_to_person or support@vendibook.com.';
      }
      return JSON.stringify({
        source: 'Vendibook support policy (official). Answer in your own words, briefly, keeping every qualifier; quote numbers exactly.',
        answers: hits.map((h) => ({ question: h.question, answer: h.answer })),
      });
    },

    get_pricing: async () => {
      const { data } = await (supabase.from('monetization_products') as LooseQuery)
        .select('slug, name, price_cents, is_active')
        .in('slug', Object.keys(ATLAS_PRODUCTS))
        .eq('is_active', true);
      const products = ((data ?? []) as Row[]).map((r) => ({
        name: r.name,
        price: `${money(Number(r.price_cents) / 100)}${r.slug === 'vendibook_pro' || r.slug === 'permit_path_plus_monthly' ? '/month' : ''}`,
        what_you_get: ATLAS_PRODUCTS[String(r.slug)],
      }));
      return JSON.stringify({
        listing: 'Free to list. No listing fee.',
        equipment_sales: `Sellers pay a ${FEE_CONFIG.saleSellerFeePct}% commission on the agreed equipment amount for new online sales; the same rate for Free and Pro sellers. Buyers pay no Vendibook platform fee; the invoice may separately show tax, freight or other agreed amounts. Older committed orders keep their agreed terms.`,
        pay_in_person: 'Not available: Vendibook no longer supports pay-in-person or cash sales.',
        rentals: `Renters pay a ${FEE_CONFIG.rentalRenterFeePct}% service fee and hosts pay a ${FEE_CONFIG.rentalHostFeePct}% commission. Active Vendibook Pro hosts pay ${FEE_CONFIG.proSellerFeePct}% instead, with savings capped at $${FEE_CONFIG.proMaxSavingsCents / 100} per completed transaction. The checkout shows the exact math.`,
        free_plan: 'The Free plan allows two active listings (some founding members have more); drafts are free.',
        optional_upgrades: products,
        note: 'Upgrades are optional and never required to list or sell.',
      });
    },

    open_page: async (p: Row = {}) => {
      const routes: Record<string, string> = {
        home: '/',
        search: '/search',
        financing: '/financing',
        how_it_works: '/how-it-works',
        freight: '/vendibook-freight',
        payments: '/payments',
        sell: '/list',
        contact: '/contact',
        permits: '/tools/permitpath',
        permit_sources: '/atlas#permit-sources',
        pricing: '/pricing',
        my_listings: '/dashboard/listings',
        insurance: '/insurance',
        account: '/dashboard/account',
      };
      const page = String(p.page ?? '');
      const base = routes[page];
      if (!base) return 'That page is not available.';
      const text = typeof p.search_text === 'string' ? p.search_text.trim().slice(0, 80) : '';
      deps.navigate(page === 'search' && text ? `${base}?q=${encodeURIComponent(text)}` : base);
      return `Opened the ${page.replace(/_/g, ' ')} page.`;
    },

    look_at_page: async () => JSON.stringify(scanPage()),

    page_action: async (p: Row = {}) => {
      const target = typeof p.target === 'string' ? p.target : '';
      const el = p.action === 'fill' && /^c\d{1,3}$/.test(target) ? document.querySelector(`[data-atlas-ref="${target}"]`) : null;
      // Custom dropdowns open and pick asynchronously.
      if (el && el.getAttribute('role') === 'combobox' && !(el instanceof HTMLInputElement)) return pickOption(p);
      return pageAction(p);
    },

    request_follow_up: async (p: Row = {}) => {
      const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
      const name = str(p.name, 80);
      const phone = str(p.phone, 30);
      const email = str(p.email, 120);
      if (!name) return 'Ask for their name first, then call request_follow_up again.';
      if (!phone && !email && !deps.currentUserId?.()) {
        return 'Ask for the best phone number or email for the team to reach them, then call request_follow_up again.';
      }
      const { data, error } = await invokeEdge<{ reference_code: string; follow_up_by: string; team_open_now: boolean }>(
        'atlas-follow-up',
        {
          body: {
            name,
            phone,
            email,
            topic: str(p.topic, 120),
            summary: str(p.summary, 1500),
            preferred_contact: p.preferred_contact,
            listing_id: deps.currentListingId(),
            page_url: typeof window !== 'undefined' ? window.location.pathname : '',
          },
        },
      );
      if (error || !data) {
        return error && /already on the way/i.test(error)
          ? 'A follow-up is already set up for them. Tell them the team will reach out at the time they were given.'
          : `${error ?? 'The follow-up could not be set up.'} Apologize, and offer support@vendibook.com or the contact page (open_page "contact").`;
      }
      return JSON.stringify({
        reference: data.reference_code,
        follow_up_by: data.follow_up_by,
        team_open_now: data.team_open_now,
        say: `Tell them a Vendibook teammate will reach out by ${data.follow_up_by}, and give the reference ${data.reference_code}.${data.team_open_now ? '' : ' The team is offline right now (Monday to Friday, 8 AM to 8 PM Eastern), so that is the next business window.'}`,
      });
    },

    talk_to_person: async () => {
      if (deps.openLiveChat?.()) {
        return 'Opened the live chat with the Vendibook team on their screen. Tell them a teammate will pick up there.';
      }
      deps.navigate('/contact');
      return deps.currentListingId()
        ? 'Opened the contact page for the Vendibook team. They can also message the seller from the listing page.'
        : 'Opened the contact page for the Vendibook team.';
    },
  };
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export type AtlasTools = ReturnType<typeof createAtlasTools>;
