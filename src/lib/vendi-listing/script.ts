/**
 * "List with Vendi" — deterministic conversational listing builder engine.
 *
 * This is a free, self-serve product. It is NOT a lead form and NOT a human
 * concierge handoff: every answer maps directly onto the existing listing
 * schema and is written through the normal draft/publish path.
 *
 * Rules:
 *  - Only explicitly-stated facts are captured. Nothing is inferred.
 *  - Rental listings may be priced monthly, weekly, daily, or hourly.
 *  - The user always sees a final review and must explicitly confirm publish.
 */

import { SUBCATEGORIES_BY_CATEGORY, ListingCategory } from '@/types/listing';
import type { ListingPreview } from '@/components/ai-listing/LivePreviewPanel';
import {
  cleanText, isSkip, parseDimensions, parseList, parseLocation, parseMoney, parseYesNo,
} from './extract';
import { parseExistingListing, type PendingConfirm } from './importText';

export type VendiDraft = ListingPreview & {
  zip_code?: string | null;
  /** Which rental rate the seller chose to price on. */
  rent_period?: string | null;
  /** Ambiguous values pulled from a pasted listing, awaiting confirmation. */
  pending_confirm?: PendingConfirm[];
};

export type QuestionKind = 'choice' | 'text' | 'money' | 'location' | 'yesno' | 'list' | 'photos' | 'paste';

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
  prompt: (d: VendiDraft) => string;
  placeholder?: string;
  optional?: boolean;
  options?: (d: VendiDraft) => QuestionOption[];
  when?: (d: VendiDraft) => boolean;
  apply: (d: VendiDraft, raw: string) => ApplyResult;
}


const MOBILE_CATEGORIES = ['food_truck', 'food_trailer'];

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

export const QUESTIONS: Question[] = [
  {
    id: 'mode',
    kind: 'choice',
    prompt: () => "Let's build your listing together. Are you renting this out, or selling it?",
    options: () => [
      { value: 'rent', label: 'Rent it out', description: 'Recurring income from bookings' },
      { value: 'sale', label: 'Sell it', description: 'One-time sale to a buyer' },
    ],
    apply: (_d, raw) => {
      const v = cleanText(raw).toLowerCase();
      if (v.startsWith('rent') || v.startsWith('lease')) return { patch: { mode: 'rent' } };
      if (v.startsWith('sale') || v.startsWith('sell')) return { patch: { mode: 'sale' } };
      return { error: 'Choose “Rent it out” or “Sell it” so I set the listing up correctly.' };
    },
  },
  {
    id: 'category',
    kind: 'choice',
    prompt: (d) => (d.mode === 'sale' ? 'What are you selling?' : 'What are you renting out?'),
    options: () => CATEGORY_OPTIONS,
    apply: (_d, raw) => {
      const v = cleanText(raw).toLowerCase().replace(/\s+/g, '_');
      const match = CATEGORY_OPTIONS.find((o) => o.value === v);
      if (!match) return { error: 'Pick one of the categories so buyers can find it.' };
      return { patch: { category: match.value } };
    },
  },
  {
    id: 'subcategory',
    kind: 'choice',
    optional: true,
    when: (d) => !!d.category && (SUBCATEGORIES_BY_CATEGORY[d.category as ListingCategory]?.length ?? 0) > 0,
    prompt: () => 'Which build is it closest to? This decides which specialty pages it shows up on.',
    options: (d) => SUBCATEGORIES_BY_CATEGORY[d.category as ListingCategory] ?? [],
    apply: (d, raw) => {
      if (isSkip(raw)) return { patch: { subcategory: null } };
      const v = cleanText(raw).toLowerCase().replace(/\s+/g, '_');
      const list = SUBCATEGORIES_BY_CATEGORY[d.category as ListingCategory] ?? [];
      const match = list.find((o) => o.value === v);
      if (!match) return { error: 'Pick one of the build types, or skip it.' };
      return { patch: { subcategory: match.value } };
    },
  },
  {
    id: 'title',
    kind: 'text',
    prompt: () => 'Give it a title — what would you call it in one line?',
    placeholder: 'e.g. Turnkey coffee trailer, fully equipped',
    apply: (_d, raw) => {
      const title = cleanText(raw).slice(0, 120);
      if (title.length < 8) return { error: 'A little longer, please — at least 8 characters.' };
      return { patch: { title } };
    },
  },
  {
    id: 'description',
    kind: 'text',
    prompt: () => 'Describe it in your own words. Equipment, condition, what’s included — only what you know for sure.',
    placeholder: 'Tell me about the build, equipment, and condition…',
    apply: (_d, raw) => {
      const description = cleanText(raw).slice(0, 4000);
      if (description.length < 20) return { error: 'Add a bit more detail — at least 20 characters.' };
      return { patch: { description } };
    },
  },
  {
    id: 'location',
    kind: 'location',
    prompt: () => 'Where is it located? City and state is enough.',
    placeholder: 'e.g. Mesa, AZ',
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
      };
    },
  },
  {
    id: 'sale_price',
    kind: 'money',
    when: (d) => d.mode === 'sale',
    prompt: () => 'What’s your asking price?',
    placeholder: 'e.g. $45,000',
    apply: (_d, raw) => {
      const value = parseMoney(raw);
      if (!value) return { error: 'Give me a number, like $45,000.' };
      return { patch: { price_sale: value } };
    },
  },
  {
    id: 'rent_period',
    kind: 'choice',
    when: (d) => d.mode === 'rent',
    prompt: () => 'How do you want to price the rental?',
    options: () => RENT_PERIOD_OPTIONS,
    apply: (_d, raw) => {
      const v = cleanText(raw).toLowerCase();
      const match = RENT_PERIOD_OPTIONS.find((o) => v.includes(o.value) || v.includes(o.label.toLowerCase()));
      if (!match) return { error: 'Pick monthly, weekly, daily, or hourly.' };
      return { patch: { rent_period: match.value } as Partial<VendiDraft> };
    },
  },
  {
    id: 'rent_price',
    kind: 'money',
    when: (d) => d.mode === 'rent' && !!(d as any).rent_period,
    prompt: (d) => {
      const period = (d as any).rent_period as string;
      const label = RENT_PERIOD_OPTIONS.find((o) => o.value === period)?.label.toLowerCase() ?? 'per month';
      return `What’s the rate ${label}?`;
    },
    placeholder: 'e.g. $1,000',
    apply: (d, raw) => {
      const value = parseMoney(raw);
      if (!value) return { error: 'Give me a number, like $1,000.' };
      const period = (d as any).rent_period as string;
      const key = ({
        monthly: 'price_monthly', weekly: 'price_weekly', daily: 'price_daily', hourly: 'price_hourly',
      } as Record<string, keyof VendiDraft>)[period];
      if (!key) return { error: 'Let me know the rental period first.' };
      return { patch: { [key]: value } as Partial<VendiDraft> };
    },
  },
  {
    id: 'deposit',
    kind: 'money',
    optional: true,
    when: (d) => d.mode === 'rent',
    prompt: () => 'Do you want a refundable security deposit? Tell me the amount, or skip.',
    placeholder: 'e.g. $500',
    apply: (_d, raw) => {
      if (isSkip(raw)) return { patch: { deposit_amount: null } };
      const value = parseMoney(raw);
      if (!value) return { error: 'Give me a deposit amount, or skip it.' };
      return { patch: { deposit_amount: value } };
    },
  },
  {
    id: 'instant_book',
    kind: 'yesno',
    when: (d) => d.mode === 'rent',
    prompt: () => 'Should renters be able to book instantly, without waiting for your approval?',
    apply: (_d, raw) => {
      const value = parseYesNo(raw);
      if (value === null) return { error: 'Just yes or no works here.' };
      return { patch: { instant_book: value } };
    },
  },
  {
    id: 'fulfillment',
    kind: 'choice',
    when: (d) => MOBILE_CATEGORIES.includes(d.category ?? ''),
    prompt: () => 'How does the handoff work?',
    options: () => FULFILLMENT_OPTIONS,
    apply: (_d, raw) => {
      const v = cleanText(raw).toLowerCase();
      const match = FULFILLMENT_OPTIONS.find((o) => v.includes(o.value));
      if (!match) return { error: 'Pick pickup, delivery, or both.' };
      return { patch: { fulfillment_type: match.value } };
    },
  },
  {
    id: 'amenities',
    kind: 'list',
    optional: true,
    prompt: () => 'List the equipment and features included — comma separated. Only what’s actually there.',
    placeholder: 'e.g. Espresso machine, 3-compartment sink, generator',
    apply: (_d, raw) => {
      if (isSkip(raw)) return { patch: { amenities: [] } };
      const amenities = parseList(raw);
      if (!amenities.length) return { error: 'Separate items with commas, or skip.' };
      return { patch: { amenities } };
    },
  },
  {
    id: 'dimensions',
    kind: 'text',
    optional: true,
    when: (d) => MOBILE_CATEGORIES.includes(d.category ?? ''),
    prompt: () => 'What are the dimensions? Length x width x height. Skip if you’re not sure.',
    placeholder: 'e.g. 20 x 8 x 9 ft',
    apply: (_d, raw) => {
      if (isSkip(raw)) return { patch: {} };
      const dims = parseDimensions(raw);
      if (!dims.length_inches) return { error: 'Try a format like “20 x 8 x 9 ft”, or skip.' };
      return { patch: dims };
    },
  },
  {
    id: 'photos',
    kind: 'photos',
    optional: true,
    prompt: () => 'Add photos — listings with photos get far more interest. Upload a few, then continue.',
    apply: () => ({ patch: {} }),
  },
];

export function visibleQuestions(draft: VendiDraft): Question[] {
  return QUESTIONS.filter((q) => !q.when || q.when(draft));
}

export function nextQuestion(draft: VendiDraft, answered: string[]): Question | null {
  return visibleQuestions(draft).find((q) => !answered.includes(q.id)) ?? null;
}

export function progressPercent(draft: VendiDraft, answered: string[]): number {
  const visible = visibleQuestions(draft);
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
  return blockers;
}

/** Fields written to the listings row. Never includes retired payment paths. */
export function buildListingPayload(draft: VendiDraft, imageUrls: string[]): Record<string, unknown> {
  const isSale = draft.mode === 'sale';
  return {
    title: draft.title ?? '',
    description: draft.description ?? '',
    category: draft.category,
    mode: isSale ? 'sale' : 'rent',
    subcategory: draft.subcategory ?? null,
    fulfillment_type: draft.fulfillment_type
      ?? (MOBILE_CATEGORIES.includes(draft.category ?? '') ? 'pickup' : 'on_site'),
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
    instant_book: isSale ? false : !!draft.instant_book,
    length_inches: draft.length_inches ?? null,
    width_inches: draft.width_inches ?? null,
    height_inches: draft.height_inches ?? null,
    image_urls: imageUrls.length ? imageUrls : null,
    cover_image_url: imageUrls[0] ?? null,
    accept_paypal_checkout: isSale,
    accept_cash_payment: isSale ? true : false,
  };
}
