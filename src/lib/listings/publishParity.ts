/**
 * Canonical content requirements for publishing a listing.
 *
 * The step-by-step wizard has always gated publish on its Launch Checklist
 * (photos, headline, description, price + accepted payment method, structured
 * address, fulfillment/access). "List with Vendi" calls the same
 * `publishListingIdempotent`, so it must enforce the same bar — otherwise the
 * conversational path would ship thinner listings than the manual one.
 *
 * This module is the single source of truth for those content rules. It is
 * pure (no React, no Supabase) so both surfaces and their tests can share it.
 * Identity verification, payouts and merchant onboarding are never gates here.
 */
import type { ListingCategory } from '@/lib/listings/stages';

/** Minimums mirrored by the wizard UI. */
export const MIN_PHOTOS = 3;
export const MIN_TITLE_LENGTH = 5;
export const MIN_DESCRIPTION_LENGTH = 50;

const STATIC_CATEGORIES: ListingCategory[] = ['ghost_kitchen', 'vendor_lot', 'vendor_space'];

export const isStaticLocationCategory = (category?: string | null): boolean =>
  STATIC_CATEGORIES.includes((category ?? '') as ListingCategory);

export interface PublishContentInput {
  mode?: 'rent' | 'sale' | null;
  category?: string | null;
  title?: string | null;
  description?: string | null;
  photoCount: number;
  /** Sale asking price. */
  priceSale?: number | null;
  /** Rental rates. The wizard requires a daily rate on every rental. */
  priceDaily?: number | null;
  priceWeekly?: number | null;
  priceMonthly?: number | null;
  priceHourly?: number | null;
  /** Sale payment acceptance — at least one must stay on. */
  acceptPayPalCheckout?: boolean | null;
  acceptCashPayment?: boolean | null;
  streetAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  fulfillmentType?: string | null;
  accessInstructions?: string | null;
}

export interface PublishBlocker {
  /** Stable id so a surface can route the seller back to the right question. */
  id: string;
  message: string;
}

/**
 * A street address is required everywhere except a for-sale listing that only
 * ever ships by delivery (no public pickup point exists for it).
 */
export const requiresStreetAddress = (
  mode?: 'rent' | 'sale' | null,
  category?: string | null,
  fulfillmentType?: string | null,
): boolean => mode !== 'sale' || isStaticLocationCategory(category) || fulfillmentType !== 'delivery';

const positive = (v?: number | null): boolean => typeof v === 'number' && Number.isFinite(v) && v > 0;
const filled = (v?: string | null): boolean => !!(v && v.trim().length);

/** Content blockers shared by the manual wizard and the Vendi builder. */
export function getPublishContentBlockers(input: PublishContentInput): PublishBlocker[] {
  const blockers: PublishBlocker[] = [];
  const isSale = input.mode === 'sale';

  if (!input.mode) blockers.push({ id: 'mode', message: 'Choose rent or sale.' });
  if (!input.category) blockers.push({ id: 'category', message: 'Choose a category.' });

  if ((input.title ?? '').trim().length < MIN_TITLE_LENGTH) {
    blockers.push({ id: 'title', message: `Add a title (at least ${MIN_TITLE_LENGTH} characters).` });
  }
  if ((input.description ?? '').trim().length < MIN_DESCRIPTION_LENGTH) {
    blockers.push({
      id: 'description',
      message: `Add a description (at least ${MIN_DESCRIPTION_LENGTH} characters).`,
    });
  }

  if (input.photoCount < MIN_PHOTOS) {
    blockers.push({ id: 'photos', message: `Add at least ${MIN_PHOTOS} photos.` });
  }

  if (isSale) {
    if (!positive(input.priceSale)) {
      blockers.push({ id: 'price', message: 'Add your asking price.' });
    }
    // Undefined means "not answered yet" and both methods default to on, so
    // this only blocks when the seller explicitly turned both off.
    const paypal = input.acceptPayPalCheckout ?? true;
    const cash = input.acceptCashPayment ?? true;
    if (!paypal && !cash) {
      blockers.push({
        id: 'payment_method',
        message: 'Accept at least one payment method — online checkout or pay in person.',
      });
    }
  } else if (input.mode === 'rent') {
    if (!positive(input.priceDaily)) {
      const hasOther = positive(input.priceWeekly) || positive(input.priceMonthly) || positive(input.priceHourly);
      blockers.push({
        id: 'price',
        message: hasOther
          ? 'Add a daily rate — every rental needs one, even with weekly or monthly pricing.'
          : 'Add a rental rate, including a daily rate.',
      });
    }
  }

  if (requiresStreetAddress(input.mode ?? null, input.category, input.fulfillmentType) && !filled(input.streetAddress)) {
    blockers.push({ id: 'street_address', message: 'Add the street address (it stays private until a booking or sale is confirmed).' });
  }
  if (!filled(input.city) || !filled(input.state)) {
    blockers.push({ id: 'location', message: 'Add the city and state.' });
  }
  if (!filled(input.zipCode)) {
    blockers.push({ id: 'zip_code', message: 'Add the ZIP code.' });
  }

  if (isStaticLocationCategory(input.category)) {
    if (!filled(input.accessInstructions)) {
      blockers.push({ id: 'access_instructions', message: 'Explain how guests get in (keys, codes, check-in).' });
    }
  } else if (!filled(input.fulfillmentType)) {
    blockers.push({ id: 'fulfillment', message: 'Choose how the handoff works — pickup, delivery, or both.' });
  }

  return blockers;
}
