/**
 * "Finish & publish" — the one-screen path for drafts saved before the
 * disclosure step existed (see src/pages/ListingFinish.tsx).
 *
 * Pure helpers only. Content rules come from publishParity (the same bar the
 * wizard and Vendi enforce) and disclosure rules from getStageRequirements, so
 * this surface can never publish a thinner listing than the full wizard.
 */
import {
  getPublishContentBlockers,
  type PublishBlocker,
} from './publishParity';
import {
  getStageRequirements,
  parseKnownProblems,
  type KnownProblem,
  type ListingCategory,
  type StageRequirement,
} from './stages';
import { feetToInches, inchesToFeet } from './dimensions';

/** The listings columns this surface reads. */
export interface FinishListingRow {
  id: string;
  host_id: string | null;
  status: string;
  mode: 'rent' | 'sale';
  category: ListingCategory;
  title: string | null;
  description: string | null;
  image_urls: string[] | null;
  cover_image_url?: string | null;
  price_sale: number | null;
  price_daily: number | null;
  price_weekly: number | null;
  price_monthly: number | null;
  price_hourly: number | null;
  accept_paypal_checkout: boolean | null;
  accept_cash_payment: boolean | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  fulfillment_type: string | null;
  access_instructions: string | null;
  condition: string | null;
  operational_status: string | null;
  title_status: string | null;
  has_lien: string | null;
  no_known_problems: boolean | null;
  known_problems: unknown;
  included_items: string | null;
  photos_exclusions_answered: boolean | null;
  photos_exclusions_note: string | null;
  price_negotiable: boolean | null;
  accepts_offers: boolean | null;
  min_offer_amount: number | null;
  length_inches: number | null;
  height_inches: number | null;
}

/** Everything the seller can answer on the finish screen. */
export interface FinishAnswers {
  condition: string;
  operationalStatus: string;
  titleStatus: string;
  hasLien: string;
  noKnownProblems: boolean;
  knownProblems: KnownProblem[];
  includedItems: string;
  photosExclusionsAnswered: boolean;
  photosExclusionsNote: string;
  priceNegotiable: boolean;
  acceptsOffers: boolean;
  minOfferAmount: string;
  /** Collected in feet, stored in inches. */
  lengthFt: string;
  heightFt: string;
}

export const FINISH_LISTING_COLUMNS =
  'id, host_id, status, mode, category, title, description, image_urls, cover_image_url, ' +
  'price_sale, price_daily, price_weekly, price_monthly, price_hourly, ' +
  'accept_paypal_checkout, accept_cash_payment, address, city, state, postal_code, ' +
  'fulfillment_type, access_instructions, condition, operational_status, title_status, has_lien, ' +
  'no_known_problems, known_problems, included_items, photos_exclusions_answered, ' +
  'photos_exclusions_note, price_negotiable, accepts_offers, min_offer_amount, ' +
  'length_inches, height_inches';

export function answersFromRow(row: FinishListingRow): FinishAnswers {
  return {
    condition: row.condition ?? '',
    operationalStatus: row.operational_status ?? '',
    titleStatus: row.title_status ?? '',
    hasLien: row.has_lien ?? '',
    noKnownProblems: row.no_known_problems ?? false,
    knownProblems: parseKnownProblems(row.known_problems),
    includedItems: row.included_items ?? '',
    photosExclusionsAnswered: row.photos_exclusions_answered ?? false,
    photosExclusionsNote: row.photos_exclusions_note ?? '',
    priceNegotiable: row.price_negotiable ?? false,
    acceptsOffers: row.accepts_offers ?? false,
    minOfferAmount: row.min_offer_amount != null ? String(row.min_offer_amount) : '',
    lengthFt: inchesToFeet(row.length_inches),
    heightFt: inchesToFeet(row.height_inches),
  };
}

/** Content gaps the finish screen does NOT edit — they send the seller to the full editor. */
export function getFinishContentBlockers(row: FinishListingRow): PublishBlocker[] {
  return getPublishContentBlockers({
    mode: row.mode,
    category: row.category,
    title: row.title,
    description: row.description,
    photoCount: row.image_urls?.length ?? 0,
    priceSale: row.price_sale,
    priceDaily: row.price_daily,
    priceWeekly: row.price_weekly,
    priceMonthly: row.price_monthly,
    priceHourly: row.price_hourly,
    acceptPayPalCheckout: row.accept_paypal_checkout,
    acceptCashPayment: row.accept_cash_payment,
    streetAddress: row.address,
    city: row.city,
    state: row.state,
    zipCode: row.postal_code,
    fulfillmentType: row.fulfillment_type,
    accessInstructions: row.access_instructions,
  });
}

/** Disclosure answers still missing — these ARE answered on the finish screen. */
export function getFinishQuestions(row: FinishListingRow, answers: FinishAnswers): StageRequirement[] {
  return getStageRequirements({
    mode: row.mode,
    category: row.category,
    condition: answers.condition || null,
    operationalStatus: answers.operationalStatus || null,
    titleStatus: answers.titleStatus || null,
    hasLien: answers.hasLien || null,
    noKnownProblems: answers.noKnownProblems,
    knownProblems: answers.knownProblems,
    includedItems: answers.includedItems || null,
    photosExclusionsAnswered: answers.photosExclusionsAnswered,
    lengthInches: feetToInches(answers.lengthFt),
    heightInches: feetToInches(answers.heightFt),
  });
}

/** Column patch for the answers. known_problems is NOT NULL — always an array. */
export function buildFinishPatch(answers: FinishAnswers): Record<string, unknown> {
  const minOffer = parseFloat(answers.minOfferAmount);
  return {
    condition: answers.condition || null,
    operational_status: answers.operationalStatus || null,
    title_status: answers.titleStatus || null,
    has_lien: answers.hasLien || null,
    no_known_problems: answers.noKnownProblems,
    known_problems: answers.noKnownProblems ? [] : answers.knownProblems ?? [],
    included_items: answers.includedItems.trim() || null,
    photos_exclusions_answered: answers.photosExclusionsAnswered,
    photos_exclusions_note: answers.photosExclusionsNote.trim() || null,
    price_negotiable: answers.priceNegotiable,
    accepts_offers: answers.acceptsOffers,
    min_offer_amount: answers.acceptsOffers && Number.isFinite(minOffer) && minOffer > 0 ? minOffer : null,
    length_inches: feetToInches(answers.lengthFt),
    height_inches: feetToInches(answers.heightFt),
  };
}

const PUBLISH_INCOMPLETE_MESSAGES: Record<string, string> = {
  category_mode: 'Choose a category and whether you are selling or renting.',
  title: 'Add a title of at least 5 characters.',
  description: 'Add a description of at least 50 characters.',
  photos: 'Add at least 3 photos.',
  location: 'Add the city and state.',
  fulfillment: 'Choose how the handoff works: pickup, delivery, or both.',
  fulfillment_on_site: 'Kitchens and vendor spaces must be set to on-site.',
  address: 'Add the street address.',
  price_sale: 'Add your asking price.',
  price_rent: 'Add a rental rate.',
  payment_option: 'Turn on at least one way to get paid: online checkout or pay in person.',
  title_status: 'Select the title status.',
};

/**
 * Turns a publish failure into seller-facing copy. Returns `needsEditor` when
 * the fix lives in the full wizard rather than on the finish screen.
 */
export function describeFinishPublishError(raw: string): { message: string; needsEditor: boolean } {
  const code = raw.match(/publish_incomplete:([a-z_]+)/i)?.[1]?.toLowerCase();
  if (code) {
    return {
      message: PUBLISH_INCOMPLETE_MESSAGES[code] ?? 'A required field is missing.',
      needsEditor: code !== 'title_status',
    };
  }
  if (/listing_publish_limit_reached/i.test(raw)) {
    return { message: 'You have reached your listing limit. Open your dashboard to manage your plan.', needsEditor: false };
  }
  if (/row-level security|permission denied|not authorized|jwt/i.test(raw)) {
    return { message: 'Your session expired. Sign in again, then press Publish. Your answers are saved.', needsEditor: false };
  }
  if (/network|failed to fetch|fetch failed/i.test(raw)) {
    return { message: "Couldn't reach the server. Check your connection and try again. Your answers are saved.", needsEditor: false };
  }
  return { message: raw || 'Something went wrong. Please try again.', needsEditor: false };
}
