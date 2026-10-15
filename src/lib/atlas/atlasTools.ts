import { supabase } from '@/integrations/supabase/client';
import { invokeEdge } from '@/lib/edge/invokeFunction';
import { applyDiscoveryListingFilter, applyPublicListingFilter } from '@/lib/listings/publicVisibility';
import { excludeTestListings } from '@/lib/excludeTestListings';
import { estimateDelivery, formatUsd, normalizeDeliveryFeeType } from '@/lib/fulfillment/delivery';
import { FEE_CONFIG } from '../../../supabase/functions/_shared/feeConfig';
import { pageAction, scanPage } from './atlasPage';

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
}

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
  'id, title, mode, category, price_sale, price_daily, city, state, condition, cover_image_url, image_urls, description, year_built, featured_enabled, vendibook_freight_enabled, freight_payer, accepts_offers';

const DETAIL_COLUMNS =
  `${CARD_COLUMNS}, host_id, make, model, length_inches, included_items, highlights, amenities, fulfillment_type, delivery_radius_miles, delivery_fee, delivery_fee_type, latitude, longitude, postal_code, weight_lbs, width_inches, height_inches, hitch_ball_size, coupler_type, trailer_plug_type, tow_vehicle_requirement, fuel_type, renter_provides_tow_vehicle, no_known_problems, known_problems, status, published_at, deleted_at, moderation_status, unlisted`;

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
  const body = String(l.description ?? '').toLowerCase();
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

async function fetchPublicListing(id: string): Promise<Row | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const query: LooseQuery = supabase.from('listings').select(DETAIL_COLUMNS).eq('id', id);
  const { data } = await applyPublicListingFilter(query as LooseQuery).maybeSingle();
  return (data as Row | null) ?? null;
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
  return {
    search_listings: async (p: Row = {}) => {
      let q: LooseQuery = supabase.from('listings').select(CARD_COLUMNS);
      q = excludeTestListings(applyDiscoveryListingFilter(q));
      if (p.mode === 'sale' || p.mode === 'rent') q = q.eq('mode', p.mode);
      if (typeof p.category === 'string' && /^[a-z_]+$/.test(p.category)) q = q.eq('category', p.category);
      const priceCol = p.mode === 'rent' ? 'price_daily' : 'price_sale';
      const max = parseNum(p.max_price);
      const min = parseNum(p.min_price);
      if (max) q = q.lte(priceCol, max);
      if (min) q = q.gte(priceCol, min);
      const words = safeKeywords(p.keywords);
      if (words.length) {
        q = q.or(words.flatMap((w) => [`title.ilike.%${w}%`, `description.ilike.%${w}%`]).join(','));
      }
      const { data, error } = await q
        .order('featured_enabled', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(24);
      if (error) return 'Search is unavailable right now. Apologize and offer to try again or talk to a person.';
      let rows = (data ?? []) as Row[];
      if (words.length) {
        // ilike also hits substrings ("ice" in "service"); keep whole-word matches, best first.
        rows = rows
          .map((l) => ({ l, score: keywordScore(l, words, String(p.keywords ?? '')) }))
          .filter((r) => r.score > 0)
          .sort((a, b) => b.score - a.score)
          .map((r) => r.l);
      }
      const state = typeof p.state === 'string' ? p.state.trim().toUpperCase() : '';
      if (state) rows = [...rows].sort((a, b) => Number(String(b.state).toUpperCase() === state) - Number(String(a.state).toUpperCase() === state));
      rows = rows.slice(0, 6);
      deps.showResults(rows.map(toCard));
      if (!rows.length) return 'No listings match. Say so honestly and offer to widen the search (higher budget, other states, rent instead of buy).';
      return JSON.stringify(
        rows.map((l) => ({
          id: l.id,
          title: l.title,
          price: listingPriceText(l),
          location: [l.city, l.state].filter(Boolean).join(', '),
          type: l.category,
          condition: l.condition ?? 'not stated',
          year: l.year_built ?? undefined,
          shipping: l.mode === 'sale' && l.vendibook_freight_enabled ? (l.freight_payer === 'seller' ? 'free shipping' : 'ships nationwide') : undefined,
          about: excerpt(l.description, 220),
        })),
      );
    },

    show_listing: async (p: Row = {}) => {
      const l = await fetchPublicListing(String(p.listing_id ?? ''));
      if (!l) return 'That listing is not available anymore. Offer to find similar ones.';
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
      const l = await fetchPublicListing(String(p.listing_id ?? ''));
      if (!l) return 'That listing is not available anymore.';
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
      const l = await fetchPublicListing(String(p.listing_id ?? ''));
      if (!l) return 'That listing is not available anymore.';
      if (l.mode === 'rent') {
        deps.navigate(`/listing/${l.id}`);
        return 'Opened the listing. Rentals are booked by picking dates on the page, then the host approves.';
      }
      deps.navigate(`/checkout/${l.id}`);
      return 'Opened the Request to buy page. They review the order and tap to send it; the seller approves, then Vendibook sends the invoice. They may be asked to verify phone and ID first.';
    },

    draft_seller_message: async (p: Row = {}) => {
      const l = await fetchPublicListing(String(p.listing_id ?? ''));
      if (!l) return 'That listing is not available anymore.';
      const message = String(p.message ?? '').trim().slice(0, 1000);
      if (!message) return 'Write the message first, then call this again.';
      if (!deps.openMessage) return 'Messaging is not available here. Offer to open the listing so they can tap Ask.';
      if (deps.currentListingId() !== l.id) deps.navigate(`/listing/${l.id}`);
      deps.openMessage({ listingId: String(l.id), hostId: String(l.host_id), title: String(l.title ?? ''), message });
      return 'Opened a message to the seller with your draft on their screen. They can edit it and tap Send — you did not send it. Sellers reply through Vendibook messages.';
    },

    draft_offer: async (p: Row = {}) => {
      const l = await fetchPublicListing(String(p.listing_id ?? ''));
      if (!l) return 'That listing is not available anymore.';
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
        equipment_sales: `Sellers pay a ${FEE_CONFIG.saleSellerFeePct}% commission when the sale completes. Buyers pay no Vendibook fee — just the price plus any delivery and sales tax.`,
        rentals: `Renters pay a ${FEE_CONFIG.rentalRenterFeePct}% service fee on the rental subtotal; hosts pay a ${FEE_CONFIG.rentalHostFeePct}% commission.`,
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
        pricing: '/pricing',
        my_listings: '/dashboard/listings',
      };
      const page = String(p.page ?? '');
      const base = routes[page];
      if (!base) return 'That page is not available.';
      const text = typeof p.search_text === 'string' ? p.search_text.trim().slice(0, 80) : '';
      deps.navigate(page === 'search' && text ? `${base}?q=${encodeURIComponent(text)}` : base);
      return `Opened the ${page.replace(/_/g, ' ')} page.`;
    },

    look_at_page: async () => JSON.stringify(scanPage()),

    page_action: async (p: Row = {}) => pageAction(p),

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
