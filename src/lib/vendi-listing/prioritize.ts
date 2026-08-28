/**
 * Vendi — publish-viability prioritisation and honest progress.
 *
 * The interview must not walk a static script. Questions are ranked by what
 * actually stands between the seller and a publishable listing, then by buyer
 * value. Progress is derived from listing readiness (real required fields), not
 * from "how many script questions have scrolled past".
 */
import type { ListingCategory } from '@/types/listing';
import { getStageRequirements, isTitledAsset, requiresSaleDimensions } from '@/lib/listings/stages';
import {
  MIN_DESCRIPTION_LENGTH, MIN_PHOTOS, MIN_TITLE_LENGTH,
  isStaticLocationCategory, requiresStreetAddress,
} from '@/lib/listings/publishParity';
import {
  getPublishBlockers, REVIEW_GATE_ID, visibleQuestions, type Question, type VendiDraft,
} from './script';

/** Question ids that resolve a hard publish blocker, keyed by the blocker. */
export function blockingQuestionIds(draft: VendiDraft, imageCount: number): string[] {
  const ids: string[] = [];
  if (!draft.category) ids.push('category');
  if (!draft.mode) ids.push('mode');
  if (!draft.city || !draft.state) ids.push('location');
  if (!draft.zip_code) ids.push('zip_code');
  if (
    !draft.street_address
    && requiresStreetAddress(
      (draft.mode as 'rent' | 'sale' | null | undefined) ?? null,
      draft.category,
      draft.fulfillment_type,
    )
  ) {
    ids.push('street_address');
  }
  if (draft.mode === 'sale' && !draft.price_sale) ids.push('sale_price');
  if (draft.mode === 'rent' && !draft.price_daily) {
    ids.push('rent_period', 'rent_price', 'rent_daily_rate');
  }
  if (!draft.description || draft.description.trim().length < MIN_DESCRIPTION_LENGTH) ids.push('description');
  if (imageCount < MIN_PHOTOS) ids.push('photos');
  if (!draft.title || draft.title.trim().length < MIN_TITLE_LENGTH) ids.push('title');
  if (isStaticLocationCategory(draft.category) && !draft.access_instructions) ids.push('access_instructions');
  if (!isStaticLocationCategory(draft.category) && !draft.fulfillment_type) ids.push('fulfillment');

  // Required seller disclosures block publishing exactly as they do in the
  // manual wizard, so they must outrank the "ready to publish" gate.
  if (!draft.condition) ids.push('condition');
  if (!draft.operational_status) ids.push('operational_status');
  if (draft.mode && draft.category && isTitledAsset(draft.category as ListingCategory, draft.mode as 'rent' | 'sale')) {
    if (!draft.title_status) ids.push('title_status');
    if (!draft.has_lien) ids.push('has_lien');
  }
  if (!draft.no_known_problems && !(draft.known_problems?.length)) ids.push('known_problems');
  if ((draft.included_items?.trim().length ?? 0) < 3) ids.push('included_items');
  if (!draft.photos_exclusions_answered) ids.push('photo_exclusions');
  if (
    draft.mode && draft.category
    && requiresSaleDimensions(draft.mode as 'rent' | 'sale', draft.category as ListingCategory)
    && (!draft.length_inches || !draft.height_inches)
  ) {
    ids.push('sale_dimensions');
  }
  return ids;
}

/** How many disclosure requirements apply to this listing at all. */
function disclosureRequirementCount(draft: VendiDraft): number {
  if (!draft.mode || !draft.category) return 0;
  return getStageRequirements({
    mode: draft.mode as 'rent' | 'sale',
    category: draft.category as ListingCategory,
    condition: null,
    operationalStatus: null,
    titleStatus: null,
    hasLien: null,
    noKnownProblems: false,
    knownProblems: [],
    includedItems: null,
    photosExclusionsAnswered: false,
    lengthInches: null,
    heightInches: null,
  }).length;
}


/** Optional fields that measurably help buyers, in descending value order. */
export const HIGH_VALUE_EXTRAS = [
  'amenities', 'highlights', 'subcategory', 'dimensions', 'rent_extra_rates', 'deposit',
];

const rankOf = (q: Question, blocking: string[]): number => {
  if (q.id === 'import_choice' || q.id === 'import_paste' || q.id.startsWith('confirm:')) return 0;
  if (blocking.includes(q.id)) return 1;
  if (q.id === REVIEW_GATE_ID) return 2;
  if (q.tier !== 'extra') return 3;
  return HIGH_VALUE_EXTRAS.includes(q.id) ? 4 : 5;
};

/**
 * The single highest-value question still worth asking.
 *
 * Blockers always come first. Once the listing can publish, the ready gate
 * outranks every remaining question so a viable seller is offered publish
 * instead of being interrogated further.
 */
export function rankedNextQuestion(
  draft: VendiDraft,
  answered: string[],
  imageCount: number,
): Question | null {
  const remaining = visibleQuestions(draft).filter((q) => !answered.includes(q.id));
  if (!remaining.length) return null;
  const blocking = blockingQuestionIds(draft, imageCount);
  return remaining
    .map((q, index) => ({ q, index, rank: rankOf(q, blocking) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)[0].q;
}

/** Every question id still open — used when a seller chooses "publish now". */
export function remainingQuestionIds(draft: VendiDraft, answered: string[]): string[] {
  return visibleQuestions(draft).filter((q) => !answered.includes(q.id)).map((q) => q.id);
}

export interface VendiReadiness {
  /** 0-100, derived from required publish fields only. */
  percent: number;
  ready: boolean;
  blockers: string[];
  /** Optional, buyer-valuable fields that are still empty. */
  improvements: string[];
  label: 'Draft' | 'Ready to publish';
}

/** Honest progress: the share of real publish requirements that are satisfied. */
export function readinessProgress(draft: VendiDraft, imageCount: number): VendiReadiness {
  // mode, category, title, description, location, price, one photo + the
  // disclosure requirements this category/mode actually carries.
  const TOTAL_REQUIREMENTS = 7 + disclosureRequirementCount(draft);
  const blockers = getPublishBlockers(draft, imageCount);
  const met = Math.max(0, TOTAL_REQUIREMENTS - blockers.length);

  const improvements: string[] = [];
  if (!draft.amenities?.length) improvements.push('Equipment and features');
  if (!draft.highlights?.length) improvements.push('Standout highlights');
  if (!draft.subcategory) improvements.push('Build type (specialty pages)');
  if (imageCount < 4) improvements.push('More photos');
  if (draft.mode === 'rent' && !draft.deposit_amount) improvements.push('Security deposit');
  return {
    percent: Math.round((met / TOTAL_REQUIREMENTS) * 100),
    ready: blockers.length === 0,
    blockers,
    improvements,
    label: blockers.length === 0 ? 'Ready to publish' : 'Draft',
  };
}

/** The line Vendi says the moment a listing first becomes publishable. */
export const READY_MESSAGE =
  'Your listing is ready to publish. I can help improve it further, or you can publish now — nothing goes live until you say so.';
