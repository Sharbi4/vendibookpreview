/**
 * "List with Vendi" — deterministic conversational listing builder engine.
 *
 * This is a free, self-serve product. It is NOT a lead form and NOT a human
 * concierge handoff: every answer maps directly onto the existing listing
 * schema and is written through the normal draft/publish path.
 *
 * Rules:
 *  - Only explicitly-stated facts are captured. Nothing is inferred.
 *  - Rental listings may be priced monthly, weekly, daily, and/or hourly.
 *  - The user always sees a final review and must explicitly confirm publish.
 *  - Field names and allowed values mirror the step-by-step wizard exactly.
 */

import {
  AMENITIES_BY_CATEGORY, SUBCATEGORIES_BY_CATEGORY, SUBCATEGORY_LABELS,
  CATEGORY_LABELS, ListingCategory,
} from '@/types/listing';
import { DOCUMENT_TYPE_LABELS, type DocumentType } from '@/types/documents';
import type { ListingPreview } from '@/components/ai-listing/LivePreviewPanel';
import {
  cleanText, isSkip, parseDimensions, parseList, parseLocation, parseMoney, parseYesNo,
} from './extract';
import {
  importSummary, isUrlOnly, parseExistingListing, URL_ONLY_REPLY, type PendingConfirm,
} from './importText';
// The manual wizard's disclosure matrix is the single source of truth. Vendi
// asks the same questions in conversation so both paths publish listings with
// identical buyer-facing disclosures.
import {
  CONDITION_OPTIONS, LIEN_OPTIONS, READINESS_OPTIONS, TITLE_STATUS_OPTIONS,
  getCategoryBasics, getStageRequirements, isTitledAsset, requiresSaleDimensions,
  type KnownProblem,
} from '@/lib/listings/stages';

export type VendiDraft = ListingPreview & {
  zip_code?: string | null;
  /** Which rental rate the seller priced first. */
  rent_period?: string | null;
  /** Ambiguous values pulled from a pasted listing, awaiting confirmation. */
  pending_confirm?: PendingConfirm[];
  // Fulfillment / logistics — same columns the manual wizard writes.
  delivery_fee?: number | null;
  delivery_radius_miles?: number | null;
  pickup_instructions?: string | null;
  delivery_instructions?: string | null;
  // Static-location detail (shared kitchens, vendor spaces).
  access_instructions?: string | null;
  hours_of_access?: string | null;
  location_notes?: string | null;
  // Seller disclosures — parity with the manual wizard's required matrix.
  condition?: string | null;
  operational_status?: string | null;
  title_status?: string | null;
  has_lien?: string | null;
  no_known_problems?: boolean | null;
  known_problems?: KnownProblem[];
  included_items?: string | null;
  photos_exclusions_answered?: boolean | null;
  photos_exclusions_note?: string | null;
  // Sale payment preferences (PayPal / pay in person only).
  accept_paypal_checkout?: boolean | null;
  accept_cash_payment?: boolean | null;
  // Optional freight branch for eligible sale listings.
  vendibook_freight_enabled?: boolean | null;
  /** Rental screening documents, written to listing_required_documents. */
  required_documents?: DocumentType[];
};


export type QuestionKind =
  | 'choice' | 'text' | 'money' | 'location' | 'yesno' | 'list' | 'photos' | 'paste' | 'date_range';

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

export interface ApplyResult {
  patch?: Partial<VendiDraft>;
  error?: string;
  /** Other interview questions this answer already satisfies. */
  answeredIds?: string[];
  /** A friendly recap Vendi says after applying the answer. */
  say?: string;
}

export interface Question {
  id: string;
  kind: QuestionKind;
  /** `core` runs before review; `extra` only if the owner asks to go deeper. */
  tier?: 'core' | 'extra';
  prompt: (d: VendiDraft) => string;
  /** A short, contextual tip shown under the prompt. */
  tip?: (d: VendiDraft) => string | null;
  placeholder?: string;
  optional?: boolean;
  options?: (d: VendiDraft) => QuestionOption[];
  /** Offers a one-tap value built only from already-confirmed facts. */
  suggest?: (d: VendiDraft) => string | null;
  when?: (d: VendiDraft) => boolean;
  apply: (d: VendiDraft, raw: string) => ApplyResult;
}

const MOBILE_CATEGORIES = ['food_truck', 'food_trailer'];
const STATIC_CATEGORIES = ['ghost_kitchen', 'vendor_space', 'vendor_lot'];

export const isMobileAsset = (category?: string | null) => MOBILE_CATEGORIES.includes(category ?? '');
export const isStaticLocation = (category?: string | null) => STATIC_CATEGORIES.includes(category ?? '');

export const CATEGORY_OPTIONS: QuestionOption[] = [
  { value: 'food_truck', label: 'Food Truck', description: 'Drivable mobile kitchen' },
  { value: 'food_trailer', label: 'Food Trailer', description: 'Towable concession build' },
  { value: 'ghost_kitchen', label: 'Commercial Kitchen', description: 'Licensed kitchen space' },
  { value: 'vendor_lot', label: 'Vendor Lot', description: 'Land or lot for vendors' },
  { value: 'vendor_space', label: 'Vendor Space', description: 'Stall or spot at a venue' },
];

export const RENT_PERIOD_OPTIONS: QuestionOption[] = [
  { value: 'monthly', label: 'Per month', description: 'Best for long-term leases' },
  { value: 'weekly', label: 'Per week' },
  { value: 'daily', label: 'Per day' },
  { value: 'hourly', label: 'Per hour' },
];

export const FULFILLMENT_OPTIONS: QuestionOption[] = [
  { value: 'pickup', label: 'Pickup only' },
  { value: 'delivery', label: 'I deliver it' },
  { value: 'both', label: 'Pickup or delivery' },
];

export const PAYMENT_OPTIONS: QuestionOption[] = [
  { value: 'both', label: 'PayPal or in person', description: 'Widest reach — recommended' },
  { value: 'paypal', label: 'PayPal checkout only', description: 'Buyer pays online' },
  { value: 'in_person', label: 'In person only', description: 'Cash sales are free on Vendibook' },
];

export const RENTAL_DOC_OPTIONS: DocumentType[] = [
  'drivers_license',
  'commercial_liability_insurance',
  'vehicle_insurance',
  'food_handler_certificate',
  'business_license',
];

const RATE_KEY: Record<string, keyof VendiDraft> = {
  monthly: 'price_monthly', weekly: 'price_weekly', daily: 'price_daily', hourly: 'price_hourly',
};

const money = (n: number) => `$${n.toLocaleString('en-US')}`;

const amenitySuggestions = (category?: string | null): string[] => {
  const groups = AMENITIES_BY_CATEGORY[(category ?? '') as ListingCategory];
  if (!groups) return [];
  return groups.flatMap((g) => g.items.map((i) => i.label)).slice(0, 8);
};

/** Parses "daily 250, weekly 900" style multi-rate input. Explicit only. */
export function parseExtraRates(raw: string): Partial<VendiDraft> {
  const patch: Partial<VendiDraft> = {};
  const text = raw.toLowerCase();
  const periods: Array<[string, RegExp]> = [
    ['monthly', /(month|monthly|\/\s*mo\b|per month)/],
    ['weekly', /(week|weekly|\/\s*wk\b|per week)/],
    ['daily', /(day|daily|\/\s*day|per day)/],
    ['hourly', /(hour|hourly|\/\s*hr\b|per hour)/],
  ];
  for (const segment of raw.split(/[,;\n]+/)) {
    const seg = segment.toLowerCase();
    const value = parseMoney(seg);
    if (!value) continue;
    const period = periods.find(([, re]) => re.test(seg));
    if (!period) continue;
    patch[RATE_KEY[period[0]] as 'price_monthly'] = value;
  }
  // A single trailing period word applied to the whole line, e.g. "250 a day"
  if (!Object.keys(patch).length) {
    const value = parseMoney(text);
    const period = periods.find(([, re]) => re.test(text));
    if (value && period) patch[RATE_KEY[period[0]] as 'price_monthly'] = value;
  }
  return patch;
}

const rateSummary = (d: VendiDraft): string => {
  const parts: string[] = [];
  if (d.price_monthly) parts.push(`${money(d.price_monthly)}/month`);
  if (d.price_weekly) parts.push(`${money(d.price_weekly)}/week`);
  if (d.price_daily) parts.push(`${money(d.price_daily)}/day`);
  if (d.price_hourly) parts.push(`${money(d.price_hourly)}/hour`);
  return parts.join(' · ');
};

const parseDateRange = (raw: string): { from: string | null; to: string | null } => {
  const dates = raw.match(/\d{4}-\d{2}-\d{2}/g) ?? [];
  return { from: dates[0] ?? null, to: dates[1] ?? null };
};

/**
 * Vendi's voice — applied to every prompt, tip and acknowledgement below.
 *
 *  - Warm, knowledgeable marketplace assistant; a helpful person, not a form.
 *  - Concise and natural. Acknowledge what was just learned, then ask the single
 *    highest-value missing thing.
 *  - Explain why a question matters only when it actually helps.
 *  - A seller may answer several fields at once; anything captured is never
 *    asked again (see `extractExtraFacts`).
 *  - Never invent a spec. Only explicitly stated facts are captured.
 *  - No canned filler: no "Quick head start", "First things first",
 *    "A few quick questions", or "Perfect!" on every turn.
 */
export const VENDI_WELCOME =
  'Hey! I’m Vendi 👋 I’m here to help you get your listing ready. You can just talk to me normally — tell me what you’re ' +
  'selling or renting, upload photos or video as we go, and I’ll organize everything into the listing for you. You can ' +
  'review it, make changes, save it for later, and nothing goes live until you’re ready.';

/** Plain, lowercase asset wording for inline sentences ("a food trailer"). */
export const categoryLabel = (d: VendiDraft): string | null => {
  if (!d.category) return null;
  const label = CATEGORY_LABELS[d.category as ListingCategory];
  return label ? label.toLowerCase() : null;
};

/** The exact bubble text for a question, including its contextual tip. */
export function promptText(q: Question, d: VendiDraft): string {
  const tip = q.tip?.(d);
  return tip ? `${q.prompt(d)}\n\n${tip}` : q.prompt(d);
}

/**
 * One short resume line for a returning seller. Only confirmed saved fields are
 * used — nothing about the listing is invented to sound smarter.
 */
export function resumeMessage(d: VendiDraft, answered: string[] = []): string {
  const label = categoryLabel(d);
  if (!label) return 'Welcome back 👋 I saved where we left off. Let’s keep going.';
  const where = d.city && d.state ? ` in ${d.city}, ${d.state}` : '';
  const nearlyDone = progressPercent(d, answered) >= 70;
  return `Welcome back 👋 I saved your ${label} listing${where}.${
    nearlyDone ? ' We were almost done —' : ''
  } Let’s keep going.`;
}

/**
 * Equipment terms Vendi recognises when a seller names them outright. Matching a
 * written term is not inference — nothing here is guessed from context, photos,
 * or category. Longest match wins so "3-compartment sink" never also logs "sink".
 */
const EQUIPMENT_LEXICON = [
  'espresso machine', 'espresso setup', 'coffee brewer', 'grinder', 'refrigerator', 'refrigeration',
  'fridge', 'freezer', 'three-compartment sink', '3-compartment sink', 'three compartment sink',
  '3 compartment sink', 'three comp sink', '3 comp sink', 'hand sink', 'sink', 'generator',
  'griddle', 'flat top', 'deep fryer', 'fryer', 'pizza oven', 'convection oven', 'oven', 'smoker',
  'char grill', 'grill', 'range', 'exhaust hood', 'hood', 'fire suppression', 'ice machine',
  'water tank', 'fresh water tank', 'grey water tank', 'propane', 'air conditioning', 'pos system',
  'soft serve machine', 'blender', 'food warmer', 'steam table', 'prep table', 'solar',
];

const titleFirst = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const listPhrase = (items: string[]): string =>
  items.length <= 1
    ? items[0] ?? ''
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/** Equipment explicitly named in the seller's own words. */
function matchEquipment(lower: string, category?: string | null): string[] {
  const vocabulary = [
    ...EQUIPMENT_LEXICON,
    ...amenitySuggestions(category).map((a) => a.toLowerCase()),
  ];
  const hits = vocabulary.filter((term) => lower.includes(term));
  // Drop any term fully contained in a longer match ("sink" inside "hand sink").
  const distinct = hits.filter((term) => !hits.some((other) => other !== term && other.includes(term)));
  return Array.from(new Set(distinct)).slice(0, 10).map(titleFirst);
}

/**
 * Pull additional, explicitly-stated facts out of a free-text answer so a seller
 * who says several things at once is never asked for them again. Only fields
 * that are still empty are filled, and nothing is inferred.
 */
export function extractExtraFacts(
  d: VendiDraft,
  raw: string,
): { patch: Partial<VendiDraft>; answeredIds: string[]; captured: string[] } {
  const text = cleanText(raw);
  const lower = text.toLowerCase();
  const patch: Partial<VendiDraft> = {};
  const answeredIds: string[] = [];
  const captured: string[] = [];

  // ── Location ──────────────────────────────────────────────────────────
  if (!d.city || !d.state) {
    const inline = text.match(/\b([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,2}),\s*([A-Z]{2})\b(?:\s+(\d{5}))?/);
    if (inline) {
      const loc = parseLocation(inline[0]);
      if (loc.city && loc.state) {
        patch.city = loc.city;
        patch.state = loc.state;
        patch.zip_code = loc.zip_code;
        patch.address = `${loc.city}, ${loc.state}`;
        answeredIds.push('location');
        captured.push('location');
      }
    }
  }

  // ── Price (only when a currency amount is actually written) ───────────
  if (text.includes('$')) {
    const segment = text.match(/[^.\n]*\$\s?[0-9][^.\n]*/)?.[0] ?? '';
    const periodic = /(per\s*(month|week|day|hour)|\/\s*(mo|wk|day|hr)|monthly|weekly|daily|hourly|a\s*(month|week|day|hour))/i;
    if (d.mode === 'sale' && !d.price_sale && segment && !periodic.test(segment)) {
      const amount = parseMoney(segment);
      if (amount) {
        patch.price_sale = amount;
        answeredIds.push('sale_price');
        captured.push('price');
      }
    }
    const noRateYet = !(d.price_monthly || d.price_weekly || d.price_daily || d.price_hourly);
    if (d.mode === 'rent' && noRateYet) {
      const rates = parseExtraRates(text);
      const keys = Object.keys(rates);
      if (keys.length) {
        Object.assign(patch, rates);
        const period = Object.entries(RATE_KEY).find(([, field]) => keys.includes(field as string))?.[0];
        if (period && !d.rent_period) {
          (patch as VendiDraft).rent_period = period;
          answeredIds.push('rent_period');
        }
        answeredIds.push('rent_price');
        captured.push('rate');
      }
    }
  }

  // ── Dimensions ────────────────────────────────────────────────────────
  if (!d.length_inches) {
    const hasUnit = /\b(ft|foot|feet|in|inch|inches)\b|'|"/i.test(text);
    const dims = parseDimensions(text);
    if (dims.length_inches && dims.width_inches && hasUnit) {
      Object.assign(patch, dims);
      answeredIds.push('dimensions');
      captured.push('dimensions');
    } else {
      const single = lower.match(/(\d{1,3})(?:\.\d+)?\s*-?\s*(?:ft|foot|feet)\b/);
      if (single) {
        patch.length_inches = Math.round(Number(single[1]) * 12);
        answeredIds.push('dimensions');
        captured.push('dimensions');
      }
    }
  }

  // ── Equipment named outright ──────────────────────────────────────────
  if (!d.amenities?.length) {
    const found = matchEquipment(lower, d.category);
    if (found.length) {
      patch.amenities = found;
      answeredIds.push('amenities');
      captured.push('equipment');
    }
  }

  return { patch, answeredIds, captured };
}

/**
 * A compact, conversational recap of what Vendi now holds. Every clause comes
 * from a confirmed field — never from an assumption.
 */
export function captureSummary(d: VendiDraft): string {
  const size = d.length_inches ? `${Math.round(d.length_inches / 12)}-foot ` : '';
  const build = d.subcategory ? `${(SUBCATEGORY_LABELS[d.subcategory] ?? '').toLowerCase()} ` : '';
  const label = categoryLabel(d);

  const clauses: string[] = [];
  if (label) clauses.push(`a ${size}${build}${label}`.replace(/\s+/g, ' '));
  if (d.city && d.state) clauses.push(`in ${d.city}, ${d.state}`);
  if (d.amenities?.length) clauses.push(`with ${listPhrase(d.amenities.slice(0, 5).map((a) => a.toLowerCase()))}`);
  if (d.price_sale) clauses.push(`asking ${money(d.price_sale)}`);
  else {
    const rates = rateSummary(d);
    if (rates) clauses.push(`at ${rates}`);
  }

  if (!clauses.length) return 'Got it — that’s in your listing now.';
  return `Nice — that gives me a lot to work with. I’ve got ${clauses.join(', ')}. That’s already a strong start.`;
}

export const QUESTIONS: Question[] = [

  {
    id: 'import_choice',
    kind: 'choice',
    tier: 'core',
    prompt: () =>
      'Fastest way to do this: tell me everything you already know in one go — year, build, equipment, condition, price, ' +
      'city — or paste a description you’ve already written. I’ll sort it into the listing. Prefer questions one at a time? That works too.',
    options: () => [
      { value: 'paste', label: 'Tell me everything at once', description: 'Type or paste it all — I’ll organise it' },
      { value: 'fresh', label: 'Ask me one at a time', description: 'Short guided questions' },
    ],
    apply: (_d, raw) => {
      const v = cleanText(raw).toLowerCase();
      if (v.startsWith('paste') || v.startsWith('use') || v.startsWith('tell') || v.startsWith('yes')) return { patch: {} };
      if (v.startsWith('fresh') || v.startsWith('ask') || v.startsWith('start') || v.startsWith('no') || v.startsWith('skip')) {
        return {
          patch: {},
          answeredIds: ['import_paste'],
          say: 'Perfect — we’ll build it together. 😊',
        };
      }
      return { error: 'Either tell me everything at once, or choose “Ask me one at a time”.' };
    },
  },
  {
    id: 'import_paste',
    kind: 'paste',
    tier: 'core',
    optional: true,
    prompt: () =>
      'Go ahead — everything you know, in any order. It doesn’t have to be formatted or complete. I’ll pull out the details ' +
      'that are actually there, show you exactly what I captured, and then we’ll only fill in what’s missing.',
    tip: () =>
      'Anything works: a marketplace or dealer page you wrote, an old description, or rough notes. Paste your own text — I never pull anything from another site.',
    placeholder: 'e.g. 2019 20ft coffee trailer, espresso machine, 3-compartment sink, Mesa AZ, asking $45,000…',
    apply: (d, raw) => {
      if (isSkip(raw)) return { patch: {} };
      if (isUrlOnly(raw)) return { error: URL_ONLY_REPLY };
      const result = parseExistingListing(raw);
      // A bulk dump often carries facts a listing-shaped parse won't label
      // (equipment named in a sentence, dimensions, an inline city).
      const seeded = { ...d, ...(result.patch as Partial<VendiDraft>) } as VendiDraft;
      const extra = extractExtraFacts(seeded, raw);
      const found = [...result.found];
      if (extra.captured.includes('equipment') && !found.some((f) => f.startsWith('Equipment'))) found.push('Equipment list');
      if (extra.captured.includes('dimensions')) found.push('Dimensions');
      if (extra.captured.includes('location') && !found.some((f) => f.startsWith('Location'))) found.push('Location');
      if (!found.length && !result.confirms.length) {
        return { error: 'I couldn’t find anything definite in there. Add a bit more, or type “skip” and we’ll do it together.' };
      }
      return {
        patch: {
          ...(result.patch as Partial<VendiDraft>),
          ...extra.patch,
          pending_confirm: result.confirms,
        },
        answeredIds: [...result.answered, ...extra.answeredIds],
        say: importSummary({ ...result, found }),
      };
    },
  },

  {
    id: 'category',
    kind: 'choice',
    tier: 'core',
    prompt: () => 'What are you looking to list?',
    options: () => CATEGORY_OPTIONS,
    apply: (_d, raw) => {
      const v = cleanText(raw).toLowerCase().replace(/\s+/g, '_');
      const match = CATEGORY_OPTIONS.find((o) => o.value === v);
      if (!match) return { error: 'Pick the closest category — that’s how buyers find you.' };
      return { patch: { category: match.value } };
    },
  },
  {
    id: 'mode',
    kind: 'choice',
    tier: 'core',
    prompt: (d) => {
      const label = categoryLabel(d);
      return label
        ? `Got it — a ${label}. Are you looking to sell it or rent it out?`
        : 'Are you looking to sell it or rent it out?';
    },
    options: () => [
      { value: 'sale', label: 'Sell it', description: 'One-time sale to a buyer' },
      { value: 'rent', label: 'Rent it out', description: 'Recurring income from bookings' },
    ],
    apply: (_d, raw) => {
      const v = cleanText(raw).toLowerCase();
      if (v.startsWith('rent') || v.startsWith('lease')) {
        return { patch: { mode: 'rent' }, say: 'Great — you’re renting it out. Let’s make sure renters get a clear picture of what you have.' };
      }
      if (v.startsWith('sale') || v.startsWith('sell')) {
        return { patch: { mode: 'sale' }, say: 'Great — you’re selling it. Let’s make sure buyers get a clear picture of what you have.' };
      }
      return { error: 'Selling it, or renting it out — either one works, I just need to know which.' };
    },
  },
  {
    id: 'subcategory',
    kind: 'choice',
    tier: 'core',
    optional: true,
    when: (d) => !!d.category && (SUBCATEGORIES_BY_CATEGORY[d.category as ListingCategory]?.length ?? 0) > 0,
    prompt: () => 'Which build is it closest to?',
    tip: () => 'This puts you on the right specialty pages — coffee, BBQ, pizza and so on.',
    options: (d) => SUBCATEGORIES_BY_CATEGORY[d.category as ListingCategory] ?? [],
    apply: (d, raw) => {
      if (isSkip(raw)) return { patch: { subcategory: null } };
      const v = cleanText(raw).toLowerCase().replace(/\s+/g, '_');
      const list = SUBCATEGORIES_BY_CATEGORY[d.category as ListingCategory] ?? [];
      const match = list.find((o) => o.value === v);
      if (!match) return { error: 'Pick one of the build types, or skip it — we can always add it later.' };
      return { patch: { subcategory: match.value } };
    },
  },
  {
    id: 'location',
    kind: 'location',
    tier: 'core',
    prompt: (d) => {
      if (isStaticLocation(d.category)) return 'Where is the space?';
      const label = categoryLabel(d);
      return label ? `Where is the ${label} located?` : 'Where is it based?';
    },
    tip: () => 'City and state is enough — a ZIP helps local search. Your exact address stays private until a booking or sale is confirmed.',
    placeholder: 'e.g. Mesa, AZ 85201',
    apply: (_d, raw) => {
      const loc = parseLocation(raw);
      if (!loc.city || !loc.state) {
        return { error: 'I need a city and state, like “Mesa, AZ”.' };
      }
      return {
        patch: {
          city: loc.city,
          state: loc.state,
          zip_code: loc.zip_code,
          address: [loc.city, loc.state].filter(Boolean).join(', '),
        },
        say: `${loc.city}, ${loc.state} — that’s on your preview now.`,
      };
    },
  },

  {
    id: 'sale_price',
    kind: 'money',
    tier: 'core',
    when: (d) => d.mode === 'sale',
    prompt: () => 'What’s your asking price?',
    placeholder: 'e.g. $45,000',
    apply: (_d, raw) => {
      const value = parseMoney(raw);
      if (!value) return { error: 'Give me a number, like $45,000.' };
      return { patch: { price_sale: value }, say: `${money(value)} asking. Buyers can still send you offers.` };
    },
  },
  {
    id: 'rent_period',
    kind: 'choice',
    tier: 'core',
    when: (d) => d.mode === 'rent',
    prompt: () => 'How do you want to price it?',
    tip: () => 'Pick your main rate now — you can add more rates in a moment.',
    options: () => RENT_PERIOD_OPTIONS,
    apply: (_d, raw) => {
      const v = cleanText(raw).toLowerCase();
      const match = RENT_PERIOD_OPTIONS.find((o) => v.includes(o.value) || v.includes(o.label.toLowerCase()));
      if (!match) return { error: 'Monthly, weekly, daily, or hourly — whichever fits how you rent it.' };
      return { patch: { rent_period: match.value } as Partial<VendiDraft> };
    },
  },
  {
    id: 'rent_price',
    kind: 'money',
    tier: 'core',
    when: (d) => d.mode === 'rent' && !!d.rent_period,
    prompt: (d) => {
      const label = RENT_PERIOD_OPTIONS.find((o) => o.value === d.rent_period)?.label.toLowerCase() ?? 'per month';
      return `What’s the rate ${label}?`;
    },
    placeholder: 'e.g. $1,000',
    apply: (d, raw) => {
      const value = parseMoney(raw);
      if (!value) return { error: 'Give me a number, like $1,000.' };
      const key = RATE_KEY[d.rent_period ?? ''];
      if (!key) return { error: 'Let me know the rental period first.' };
      const period = (d.rent_period ?? 'monthly').replace('ly', '');
      return {
        patch: { [key]: value } as Partial<VendiDraft>,
        say: `Perfect — ${money(value)} per ${period === 'dai' ? 'day' : period}. I’ve added that to your preview.`,
      };
    },
  },
  {
    id: 'description',
    kind: 'text',
    tier: 'core',
    prompt: (d) => {
      const label = categoryLabel(d);
      if (isStaticLocation(d.category)) {
        return 'Now tell me about the space in your own words — size, equipment, who it suits, anything a vendor would want to know. ' +
          'You don’t have to organize it; I’ll do that part.';
      }
      return `Now tell me about the ${label ?? 'it'} in your own words — year, condition, what it was used for, equipment that’s ` +
        'included, anything you think a buyer would want to know. You don’t have to organize it; I’ll do that part.';
    },
    tip: () => 'Naming the actual equipment is what turns browsers into buyers. Only what you know for sure.',
    placeholder: 'Tell me about the build, equipment, and condition…',
    apply: (d, raw) => {
      const description = cleanText(raw).slice(0, 4000);
      if (description.length < 20) return { error: 'A couple more sentences would help — at least 20 characters.' };
      // A seller can answer several fields at once. Anything explicitly stated
      // here is captured now and never asked again.
      const facts = extractExtraFacts(d, raw);
      const merged = { ...d, description, ...facts.patch } as VendiDraft;
      return {
        patch: { description, ...facts.patch },
        answeredIds: facts.answeredIds,
        say: facts.captured.length ? captureSummary(merged) : undefined,
      };
    },
  },

  // ——— Seller disclosures (identical requirements to the manual wizard) ———

  {
    id: 'condition',
    kind: 'choice',
    tier: 'core',
    when: (d) => !!d.category,
    prompt: () => 'How would you describe the overall condition?',
    tip: () => 'Buyers trust an honest rating far more than a perfect one.',
    options: () => CONDITION_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    apply: (_d, raw) => {
      const v = cleanText(raw).toLowerCase().replace(/\s+/g, '_');
      const match = CONDITION_OPTIONS.find((o) => o.value === v || o.label.toLowerCase() === cleanText(raw).toLowerCase());
      if (!match) return { error: 'Pick the condition that fits best — new, like new, good, fair, or needs work.' };
      return { patch: { condition: match.value } };
    },
  },
  {
    id: 'operational_status',
    kind: 'choice',
    tier: 'core',
    when: (d) => !!d.category,
    prompt: (d) => {
      const readiness = getCategoryBasics(d.category as ListingCategory).readiness;
      if (readiness === 'drivable') return 'Does it start, run and drive right now?';
      if (readiness === 'towable') return 'Is it road ready and towable right now?';
      return 'Is the space operational and usable today?';
    },
    tip: () => 'This is the question buyers ask first, so answering it here saves you a dozen messages.',
    options: (d) => {
      const readiness = getCategoryBasics(d.category as ListingCategory).readiness;
      return READINESS_OPTIONS[readiness].map((o) => ({ value: o.value, label: o.label }));
    },
    apply: (d, raw) => {
      const readiness = getCategoryBasics(d.category as ListingCategory).readiness;
      const list = READINESS_OPTIONS[readiness];
      const text = cleanText(raw).toLowerCase();
      const match = list.find((o) => o.value === text.replace(/\s+/g, '_') || o.label.toLowerCase() === text);
      if (!match) return { error: 'Pick the option that matches — “Not sure” is a perfectly good answer.' };
      return { patch: { operational_status: match.value } };
    },
  },
  {
    id: 'title_status',
    kind: 'choice',
    tier: 'core',
    when: (d) => !!d.category && !!d.mode && isTitledAsset(d.category as ListingCategory, d.mode as 'rent' | 'sale'),
    prompt: () => 'What’s the title status?',
    tip: () => 'Required disclosure on any titled sale. Buyers and lenders both check it.',
    options: () => TITLE_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    apply: (_d, raw) => {
      const text = cleanText(raw).toLowerCase();
      const match = TITLE_STATUS_OPTIONS.find(
        (o) => o.value === text.replace(/\s+/g, '_') || o.label.toLowerCase() === text,
      );
      if (!match) return { error: 'Choose the title status — “Not sure” is allowed.' };
      return { patch: { title_status: match.value } };
    },
  },
  {
    id: 'has_lien',
    kind: 'choice',
    tier: 'core',
    when: (d) => !!d.category && !!d.mode && isTitledAsset(d.category as ListingCategory, d.mode as 'rent' | 'sale'),
    prompt: () => 'Is there a lien or outstanding loan on it?',
    tip: () => 'A lien doesn’t stop a sale — it just has to be disclosed up front.',
    options: () => LIEN_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    apply: (_d, raw) => {
      const text = cleanText(raw).toLowerCase();
      const match = LIEN_OPTIONS.find((o) => o.value === text.replace(/\s+/g, '_') || o.label.toLowerCase() === text);
      const yn = match ? null : parseYesNo(raw);
      if (!match && yn === null) return { error: 'Yes, no, or not sure — whichever is accurate.' };
      return { patch: { has_lien: match ? match.value : yn ? 'yes' : 'no' } };
    },
  },
  {
    id: 'known_problems',
    kind: 'text',
    tier: 'core',
    when: (d) => !!d.category,
    prompt: () => 'Anything a buyer should know that isn’t working, or needs repair? Tell me in plain words, or say “none”.',
    tip: () => 'Disclosed problems rarely lose the sale. Undisclosed ones lose it after the deposit.',
    placeholder: 'e.g. Generator needs a new pull cord — or “none”',
    apply: (_d, raw) => {
      const text = cleanText(raw);
      const lower = text.toLowerCase();
      if (!text.length) return { error: 'Describe anything that needs work, or say “none”.' };
      if (/^(none|no|nope|nothing|n\/a|all good|everything works)\b/.test(lower)) {
        return {
          patch: { no_known_problems: true, known_problems: [] },
          say: 'Noted — nothing known to disclose.',
        };
      }
      if (text.length < 3) return { error: 'A few more words, please — or say “none”.' };
      return {
        patch: {
          no_known_problems: false,
          known_problems: [{ category: 'other', note: text.slice(0, 1000), photo_url: null }],
        },
        say: 'Added to your disclosures.',
      };
    },
  },
  {
    id: 'included_items',
    kind: 'text',
    tier: 'core',
    when: (d) => !!d.category,
    prompt: (d) =>
      d.mode === 'rent'
        ? 'What’s included in the rental rate?'
        : 'What’s included in your asking price?',
    tip: () => 'Equipment, tanks, generator, smallwares, permits — whatever actually goes with it.',
    placeholder: 'e.g. All cooking equipment, generator, 2 propane tanks, smallwares',
    apply: (_d, raw) => {
      const text = cleanText(raw).slice(0, 2000);
      if (text.length < 3) return { error: 'A short list is enough — even “everything pictured” works.' };
      return { patch: { included_items: text } };
    },
  },



  {
    id: 'fulfillment',
    kind: 'choice',
    tier: 'core',
    when: (d) => isMobileAsset(d.category),
    prompt: () => 'How does the handoff work?',
    options: () => FULFILLMENT_OPTIONS,
    apply: (_d, raw) => {
      const v = cleanText(raw).toLowerCase();
      const match = FULFILLMENT_OPTIONS.find((o) => v.includes(o.value));
      if (!match) return { error: 'Pickup, delivery, or both.' };
      return {
        patch: { fulfillment_type: match.value },
        say: match.value === 'pickup' ? 'Got it. Pickup only.' : undefined,
      };
    },
  },
  {
    id: 'instant_book',
    kind: 'yesno',
    tier: 'core',
    when: (d) => d.mode === 'rent',
    prompt: () => 'Should renters be able to book instantly, or do you want to approve each request?',
    tip: () => 'Instant Book fills more dates; approval gives you the final say.',
    apply: (_d, raw) => {
      const value = parseYesNo(raw);
      if (value === null) return { error: 'Yes for instant booking, no if you’d rather approve each one.' };
      return {
        patch: { instant_book: value },
        say: value ? 'Instant Book is on.' : 'You’ll approve each request.',
      };
    },
  },
  {
    id: 'photos',
    kind: 'photos',
    tier: 'core',
    prompt: () => 'Now the part buyers care about most — photos.',
    tip: (d) => (isStaticLocation(d.category)
      ? 'A wide shot of the space, the equipment, and the entrance go a long way.'
      : 'Exterior, interior, and a few equipment close-ups do the heavy lifting. Video works too.'),
    apply: () => ({ patch: {} }),
  },
  {
    id: 'photo_exclusions',
    kind: 'text',
    tier: 'core',
    when: (d) => !!d.category,
    prompt: () => 'Is everything shown in your photos included? Say “yes”, or tell me what stays with you.',
    tip: () => 'This one prevents most handoff disputes — buyers assume anything pictured is included.',
    placeholder: 'e.g. Yes — or “the POS tablet and the wrap are not included”',
    apply: (_d, raw) => {
      const text = cleanText(raw);
      const lower = text.toLowerCase();
      if (!text.length) return { error: 'Say “yes” if it’s all included, or name what isn’t.' };
      if (/^(yes|yep|yeah|all included|everything|correct|it all is)\b/.test(lower)) {
        return {
          patch: { photos_exclusions_answered: true, photos_exclusions_note: null },
          say: 'Everything pictured is included — noted on the listing.',
        };
      }
      if (text.length < 3) return { error: 'A few more words, please — or say “yes”.' };
      return {
        patch: { photos_exclusions_answered: true, photos_exclusions_note: text.slice(0, 1000) },
        say: 'Noted — buyers will see what is not included.',
      };
    },
  },
  {
    // Sale trucks and trailers must ship with real measurements: buyers size
    // doors, garages and freight quotes off them, so this is not optional.
    id: 'sale_dimensions',
    kind: 'text',
    tier: 'core',
    when: (d) => !!d.category && !!d.mode
      && requiresSaleDimensions(d.mode as 'rent' | 'sale', d.category as ListingCategory),
    prompt: () => 'What are the outside dimensions? Length x width x height, in feet.',
    tip: () => 'Buyers need these to check clearances, and they power your freight estimate.',
    placeholder: 'e.g. 20 x 8 x 9 ft',
    apply: (_d, raw) => {
      const dims = parseDimensions(raw);
      if (!dims.length_inches || !dims.height_inches) {
        return { error: 'I need at least the length and the height, like “20 x 8 x 9 ft”.' };
      }
      return { patch: dims };
    },
  },

  {
    id: 'title',
    kind: 'text',
    tier: 'core',
    prompt: () => 'Last core piece — the headline buyers see first. Here’s one I put together from your answers, or write your own.',
    placeholder: 'e.g. Turnkey coffee trailer, fully equipped',
    suggest: (d) => {
      if (!d.category) return null;
      const build = d.subcategory ? SUBCATEGORY_LABELS[d.subcategory] : null;
      const asset = build ?? CATEGORY_LABELS[d.category as ListingCategory] ?? null;
      if (!asset) return null;
      const where = d.city && d.state ? ` in ${d.city}, ${d.state}` : '';
      const lead = d.mode === 'rent' ? 'for rent' : 'for sale';
      return `${asset} ${lead}${where}`.slice(0, 120);
    },
    apply: (_d, raw) => {
      const title = cleanText(raw).slice(0, 120);
      if (title.length < 8) return { error: 'A little longer, please — at least 8 characters.' };
      return { patch: { title } };
    },
  },

  // ——— Optional depth, only after the listing can already publish ———

  {
    id: 'rent_extra_rates',
    kind: 'text',
    tier: 'extra',
    optional: true,
    when: (d) => d.mode === 'rent',
    prompt: () => 'Want to offer more than one rate? Tell me any others, like “weekly 900, daily 250”.',
    placeholder: 'e.g. weekly $900, daily $250',
    apply: (_d, raw) => {
      if (isSkip(raw)) return { patch: {} };
      const patch = parseExtraRates(raw);
      if (!Object.keys(patch).length) {
        return { error: 'Try it like “weekly $900, daily $250” — I need the amount and the period together.' };
      }
      return { patch, say: `Added. Your rates: ${rateSummary({ ...(patch as VendiDraft) })}` };
    },
  },
  {
    id: 'deposit',
    kind: 'money',
    tier: 'extra',
    optional: true,
    when: (d) => d.mode === 'rent',
    prompt: () => 'Do you want a refundable security deposit? Tell me the amount, or skip.',
    placeholder: 'e.g. $500',
    apply: (_d, raw) => {
      if (isSkip(raw)) return { patch: { deposit_amount: null } };
      const value = parseMoney(raw);
      if (!value) return { error: 'Give me a deposit amount, or skip it.' };
      return { patch: { deposit_amount: value }, say: `${money(value)} refundable deposit noted.` };
    },
  },
  {
    id: 'availability',
    kind: 'date_range',
    tier: 'extra',
    optional: true,
    when: (d) => d.mode === 'rent',
    prompt: () => 'Is it available for a set window? Give me the dates, or skip to keep it open-ended.',
    placeholder: 'e.g. 2026-09-01 to 2027-03-01',
    apply: (_d, raw) => {
      if (isSkip(raw)) return { patch: { available_from: null, available_to: null } };
      const { from, to } = parseDateRange(raw);
      if (!from) return { error: 'Use dates like 2026-09-01, or skip to stay open-ended.' };
      return { patch: { available_from: from, available_to: to } };
    },
  },
  {
    id: 'required_documents',
    kind: 'list',
    tier: 'extra',
    optional: true,
    when: (d) => d.mode === 'rent',
    prompt: () => 'Anything renters must provide before they book? Pick what applies, or skip.',
    tip: () => 'Most hosts ask for a driver’s license and insurance. Nothing here is required.',
    options: () => RENTAL_DOC_OPTIONS.map((value) => ({ value, label: DOCUMENT_TYPE_LABELS[value] })),
    apply: (_d, raw) => {
      if (isSkip(raw)) return { patch: { required_documents: [] } };
      const wanted = parseList(raw).map((s) => s.toLowerCase());
      const picked = RENTAL_DOC_OPTIONS.filter((doc) =>
        wanted.some((w) => w === doc || DOCUMENT_TYPE_LABELS[doc].toLowerCase().includes(w)));
      if (!picked.length) return { error: 'Pick from the options shown, or skip this one.' };
      return { patch: { required_documents: picked } };
    },
  },
  {
    id: 'delivery_terms',
    kind: 'text',
    tier: 'extra',
    optional: true,
    when: (d) => isMobileAsset(d.category) && ['delivery', 'both'].includes(d.fulfillment_type ?? ''),
    prompt: () => 'How far will you deliver, and what do you charge? Something like “50 miles, $200”.',
    placeholder: 'e.g. 50 miles, $200',
    apply: (_d, raw) => {
      if (isSkip(raw)) return { patch: {} };
      const miles = raw.match(/(\d{1,4})\s*(mi|mile)/i);
      const fee = parseMoney(raw.replace(/(\d{1,4})\s*(mi|mile)\w*/gi, ''));
      if (!miles && !fee) return { error: 'Try “50 miles, $200”, or skip it.' };
      return {
        patch: {
          delivery_radius_miles: miles ? Number(miles[1]) : null,
          delivery_fee: fee ?? null,
        },
      };
    },
  },
  {
    id: 'delivery_instructions',
    kind: 'text',
    tier: 'extra',
    optional: true,
    when: (d) => ['delivery', 'both'].includes(d.fulfillment_type ?? ''),
    prompt: () => 'Anything the renter or buyer should know about delivery day?',
    placeholder: 'e.g. I tow it in and set it up, 48 hours notice',
    apply: (_d, raw) => {
      if (isSkip(raw)) return { patch: {} };
      return { patch: { delivery_instructions: cleanText(raw).slice(0, 1000) } };
    },
  },
  {
    id: 'pickup_instructions',
    kind: 'text',
    tier: 'extra',
    optional: true,
    when: (d) => isMobileAsset(d.category) && ['pickup', 'both'].includes(d.fulfillment_type ?? ''),
    prompt: () => 'Anything they should know about pickup? Hitch type, gate access, best times.',
    placeholder: 'e.g. 2-5/16" ball, weekday pickups only',
    apply: (_d, raw) => {
      if (isSkip(raw)) return { patch: {} };
      return { patch: { pickup_instructions: cleanText(raw).slice(0, 1000) } };
    },
  },
  {
    id: 'hours_of_access',
    kind: 'text',
    tier: 'extra',
    optional: true,
    when: (d) => isStaticLocation(d.category),
    prompt: () => 'When can vendors use the space?',
    placeholder: 'e.g. Mon–Fri 6am–10pm, weekends by arrangement',
    apply: (_d, raw) => {
      if (isSkip(raw)) return { patch: {} };
      return { patch: { hours_of_access: cleanText(raw).slice(0, 500) } };
    },
  },
  {
    id: 'access_instructions',
    kind: 'text',
    tier: 'extra',
    optional: true,
    when: (d) => isStaticLocation(d.category),
    prompt: () => 'How do they get in — keys, codes, check-in with someone?',
    placeholder: 'e.g. Keypad at the side door, code shared after booking',
    apply: (_d, raw) => {
      if (isSkip(raw)) return { patch: {} };
      return { patch: { access_instructions: cleanText(raw).slice(0, 1000) } };
    },
  },
  {
    id: 'location_notes',
    kind: 'text',
    tier: 'extra',
    optional: true,
    when: (d) => isStaticLocation(d.category),
    prompt: () => 'Anything useful about the site itself? Parking, loading, foot traffic, power on site.',
    placeholder: 'e.g. Rear loading dock, 20 dedicated parking spots',
    apply: (_d, raw) => {
      if (isSkip(raw)) return { patch: {} };
      return { patch: { location_notes: cleanText(raw).slice(0, 1000) } };
    },
  },
  {
    id: 'amenities',
    kind: 'list',
    tier: 'extra',
    optional: true,
    prompt: () => 'What equipment and features are included? Tap the common ones or type your own.',
    tip: () => 'Specific equipment is one of the biggest trust signals on a listing.',
    options: (d) => amenitySuggestions(d.category).map((label) => ({ value: label, label })),
    placeholder: 'e.g. Espresso machine, 3-compartment sink, generator',
    apply: (_d, raw) => {
      if (isSkip(raw)) return { patch: { amenities: [] } };
      const amenities = parseList(raw);
      if (!amenities.length) return { error: 'Separate items with commas, or skip.' };
      return { patch: { amenities } };
    },
  },
  {
    id: 'highlights',
    kind: 'list',
    tier: 'extra',
    optional: true,
    prompt: () => 'Any standout points you want at the top of the listing? Three short lines at most.',
    placeholder: 'e.g. New tires, health-inspected 2026, low hours',
    apply: (_d, raw) => {
      if (isSkip(raw)) return { patch: { highlights: [] } };
      const highlights = parseList(raw).slice(0, 3);
      if (!highlights.length) return { error: 'Separate them with commas, or skip.' };
      return { patch: { highlights } };
    },
  },
  {
    id: 'payment_prefs',
    kind: 'choice',
    tier: 'extra',
    optional: true,
    when: (d) => d.mode === 'sale',
    prompt: () => 'How would you like to get paid?',
    tip: () => 'Pay-in-person sales are completely free — no commission, no buyer fee.',
    options: () => PAYMENT_OPTIONS,
    apply: (_d, raw) => {
      if (isSkip(raw)) return { patch: {} };
      const v = cleanText(raw).toLowerCase();
      if (v.includes('paypal') && !v.includes('person')) {
        return { patch: { accept_paypal_checkout: true, accept_cash_payment: false } };
      }
      if (v.includes('person') || v.includes('cash')) {
        return { patch: { accept_paypal_checkout: false, accept_cash_payment: true } };
      }
      if (v.includes('both')) return { patch: { accept_paypal_checkout: true, accept_cash_payment: true } };
      return { error: 'Pick one of the payment options, or skip to keep both open.' };
    },
  },
  {
    id: 'dimensions',
    kind: 'text',
    tier: 'extra',
    optional: true,
    // Sale trucks/trailers answer the required `sale_dimensions` question instead.
    when: (d) => isMobileAsset(d.category)
      && !(d.mode && requiresSaleDimensions(d.mode as 'rent' | 'sale', d.category as ListingCategory)),

    prompt: () => 'Do you know the dimensions? Length x width x height.',
    placeholder: 'e.g. 20 x 8 x 9 ft',
    apply: (_d, raw) => {
      if (isSkip(raw)) return { patch: {} };
      const dims = parseDimensions(raw);
      if (!dims.length_inches) return { error: 'Try a format like “20 x 8 x 9 ft”, or skip.' };
      return { patch: dims };
    },
  },
  {
    id: 'freight',
    kind: 'yesno',
    tier: 'extra',
    optional: true,
    when: (d) => d.mode === 'sale' && isMobileAsset(d.category) && !!d.length_inches,
    prompt: () => 'Since you have the dimensions — want out-of-state buyers to see a Vendibook Freight shipping estimate?',
    apply: (_d, raw) => {
      if (isSkip(raw)) return { patch: {} };
      const value = parseYesNo(raw);
      if (value === null) return { error: 'Yes or no — you can change this later either way.' };
      return { patch: { vendibook_freight_enabled: value } };
    },
  },
];

/** The gate between the required interview and the optional depth questions. */
export const REVIEW_GATE_ID = 'ready_gate';

export const readyGateQuestion = (extras: Question[]): Question => ({
  id: REVIEW_GATE_ID,
  kind: 'choice',
  prompt: () =>
    'Good news — your listing has everything it needs to publish. I can ask a few optional questions that tend to help buyers, or you can review it now.',
  options: () => [
    { value: 'strengthen', label: 'Strengthen my listing', description: 'A few optional details' },
    { value: 'review', label: 'Review listing', description: 'Go straight to publish' },
  ],
  apply: (_d, raw) => {
    const v = cleanText(raw).toLowerCase();
    if (v.startsWith('strengthen') || v.startsWith('yes')) return { patch: {} };
    if (v.startsWith('review') || v.startsWith('no') || v.startsWith('skip')) {
      return { patch: {}, answeredIds: extras.map((q) => q.id) };
    }
    return { error: 'Strengthen the listing, or jump to review — your call.' };
  },
});

/** Yes/no questions generated from ambiguous values found in a pasted listing. */
export function confirmQuestions(draft: VendiDraft): Question[] {
  return (draft.pending_confirm ?? []).map((c) => ({
    id: c.id,
    kind: 'yesno' as const,
    tier: 'core' as const,
    prompt: () => c.question,
    apply: (_d: VendiDraft, raw: string): ApplyResult => {
      const value = parseYesNo(raw);
      if (value === null) return { error: 'Just yes or no works here.' };
      if (!value) return { patch: {}, say: 'No problem — I’ll ask you directly instead.' };
      return { patch: c.patch as Partial<VendiDraft>, answeredIds: c.answers };
    },
  }));
}

export function visibleQuestions(draft: VendiDraft): Question[] {
  const applicable = QUESTIONS.filter((q) => !q.when || q.when(draft));
  const core = applicable.filter((q) => q.tier !== 'extra');
  const extras = applicable.filter((q) => q.tier === 'extra');

  const confirms = confirmQuestions(draft);
  let ordered = core;
  if (confirms.length) {
    const pasteIndex = core.findIndex((q) => q.id === 'import_paste');
    const at = pasteIndex === -1 ? 0 : pasteIndex + 1;
    ordered = [...core.slice(0, at), ...confirms, ...core.slice(at)];
  }
  return [...ordered, readyGateQuestion(extras), ...extras];
}

export function nextQuestion(draft: VendiDraft, answered: string[]): Question | null {
  return visibleQuestions(draft).find((q) => !answered.includes(q.id)) ?? null;
}

/** Percentage of the *required* interview that is done. Optional depth is extra. */
export function progressPercent(draft: VendiDraft, answered: string[]): number {
  const visible = visibleQuestions(draft).filter((q) => q.tier !== 'extra' && q.id !== REVIEW_GATE_ID);
  if (!visible.length) return 0;
  const done = visible.filter((q) => answered.includes(q.id)).length;
  return Math.round((done / visible.length) * 100);
}

/** Blocking problems that must be resolved before publishing. */
export function getPublishBlockers(draft: VendiDraft, imageCount: number): string[] {
  const blockers: string[] = [];
  if (!draft.mode) blockers.push('Choose rent or sale.');
  if (!draft.category) blockers.push('Choose a category.');
  if (!draft.title || draft.title.trim().length < 8) blockers.push('Add a title (at least 8 characters).');
  if (!draft.description || draft.description.trim().length < 20) blockers.push('Add a description (at least 20 characters).');
  if (!draft.city || !draft.state) blockers.push('Add the city and state.');
  if (draft.mode === 'sale' && !draft.price_sale) blockers.push('Add your asking price.');
  if (draft.mode === 'rent' && !(draft.price_monthly || draft.price_weekly || draft.price_daily || draft.price_hourly)) {
    blockers.push('Add a rental rate (monthly, weekly, daily, or hourly).');
  }
  if (imageCount < 1) blockers.push('Add at least one photo.');

  // Disclosure parity: once mode and category are known, Vendi enforces the
  // exact same required disclosures as the manual wizard, so both paths cannot
  // publish listings with different levels of buyer protection.
  if (draft.mode && draft.category) {
    for (const req of getStageRequirements({
      mode: draft.mode as 'rent' | 'sale',
      category: draft.category as ListingCategory,
      condition: draft.condition ?? null,
      operationalStatus: draft.operational_status ?? null,
      titleStatus: draft.title_status ?? null,
      hasLien: draft.has_lien ?? null,
      noKnownProblems: !!draft.no_known_problems,
      knownProblems: draft.known_problems ?? [],
      includedItems: draft.included_items ?? null,
      photosExclusionsAnswered: !!draft.photos_exclusions_answered,
      lengthInches: draft.length_inches ?? null,
      heightInches: draft.height_inches ?? null,
    })) {
      blockers.push(`${req.label}.`);
    }
  }
  return blockers;

}

/** Fields written to the listings row. Never includes retired payment paths. */
export function buildListingPayload(
  draft: VendiDraft,
  imageUrls: string[],
  videoUrls: string[] = [],
): Record<string, unknown> {
  const isSale = draft.mode === 'sale';
  const mobile = isMobileAsset(draft.category);
  const delivers = ['delivery', 'both'].includes(draft.fulfillment_type ?? '');
  return {
    title: draft.title ?? '',
    description: draft.description ?? '',
    category: draft.category,
    mode: isSale ? 'sale' : 'rent',
    subcategory: draft.subcategory ?? null,
    fulfillment_type: draft.fulfillment_type ?? (mobile ? 'pickup' : 'on_site'),
    address: draft.address ?? null,
    pickup_location_text: draft.address ?? null,
    city: draft.city ?? null,
    state: draft.state ?? null,
    postal_code: draft.zip_code ?? null,
    amenities: draft.amenities?.length ? draft.amenities : null,
    highlights: draft.highlights?.length ? draft.highlights : null,
    price_sale: isSale ? draft.price_sale ?? null : null,
    price_monthly: isSale ? null : draft.price_monthly ?? null,
    price_weekly: isSale ? null : draft.price_weekly ?? null,
    price_daily: isSale ? null : draft.price_daily ?? null,
    price_hourly: isSale ? null : draft.price_hourly ?? null,
    deposit_amount: isSale ? null : draft.deposit_amount ?? null,
    available_from: isSale ? null : draft.available_from ?? null,
    available_to: isSale ? null : draft.available_to ?? null,
    instant_book: isSale ? false : !!draft.instant_book,
    delivery_radius_miles: delivers ? draft.delivery_radius_miles ?? null : null,
    delivery_fee: delivers ? draft.delivery_fee ?? null : null,
    pickup_instructions: draft.pickup_instructions ?? null,
    delivery_instructions: delivers ? draft.delivery_instructions ?? null : null,
    access_instructions: draft.access_instructions ?? null,
    hours_of_access: draft.hours_of_access ?? null,
    location_notes: draft.location_notes ?? null,
    length_inches: draft.length_inches ?? null,
    width_inches: draft.width_inches ?? null,
    height_inches: draft.height_inches ?? null,
    vendibook_freight_enabled: isSale ? !!draft.vendibook_freight_enabled : false,
    image_urls: imageUrls.length ? imageUrls : null,
    cover_image_url: imageUrls[0] ?? null,
    video_urls: videoUrls.length ? videoUrls : null,
    accept_paypal_checkout: isSale ? draft.accept_paypal_checkout ?? true : false,
    accept_cash_payment: isSale ? draft.accept_cash_payment ?? true : false,
    // Seller disclosures — same columns the manual wizard writes.
    condition: draft.condition ?? null,
    operational_status: draft.operational_status ?? null,
    title_status: isSale ? draft.title_status ?? null : null,
    has_lien: isSale ? draft.has_lien ?? null : null,
    no_known_problems: !!draft.no_known_problems,
    known_problems: draft.no_known_problems ? [] : draft.known_problems ?? [],
    included_items: draft.included_items ?? null,
    photos_exclusions_answered: !!draft.photos_exclusions_answered,
    photos_exclusions_note: draft.photos_exclusions_note ?? null,

  };
}
