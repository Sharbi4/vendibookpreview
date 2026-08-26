/**
 * Vendi — mode / category change reconciliation.
 *
 * Switching sale↔rent or moving between a mobile asset and a static location
 * makes some already-collected values meaningless. Leaving them behind is how a
 * "rental" ends up carrying an active sale price. We clear exactly the
 * incompatible fields, reopen the questions they answered, and warn only when
 * real saved data is being dropped. Compatible facts are always preserved.
 */
import { isMobileAsset, isStaticLocation, type VendiDraft } from './script';

export interface Reconciliation {
  /** Fields to null out alongside the seller's change. */
  patch: Partial<VendiDraft>;
  /** Interview ids that must be asked again. */
  dropAnswered: string[];
  /** Human-readable warning — empty when nothing saved is lost. */
  warnings: string[];
}

const SALE_ONLY: Array<keyof VendiDraft> = [
  'price_sale', 'accept_paypal_checkout', 'accept_cash_payment', 'vendibook_freight_enabled',
];
const RENT_ONLY: Array<keyof VendiDraft> = [
  'price_monthly', 'price_weekly', 'price_daily', 'price_hourly', 'rent_period',
  'deposit_amount', 'available_from', 'available_to', 'instant_book', 'required_documents',
];
const MOBILE_ONLY: Array<keyof VendiDraft> = [
  'length_inches', 'width_inches', 'height_inches', 'delivery_fee', 'delivery_radius_miles',
  'pickup_instructions', 'delivery_instructions', 'vendibook_freight_enabled',
];
const STATIC_ONLY: Array<keyof VendiDraft> = [
  'access_instructions', 'hours_of_access', 'location_notes',
];

const held = (d: VendiDraft, keys: Array<keyof VendiDraft>): Array<keyof VendiDraft> =>
  keys.filter((k) => {
    const v = d[k];
    return !(v === null || v === undefined || v === '' || v === false || (Array.isArray(v) && !v.length));
  });

const clear = (keys: Array<keyof VendiDraft>): Partial<VendiDraft> =>
  Object.fromEntries(keys.map((k) => [k, null])) as Partial<VendiDraft>;

/**
 * Work out what a mode/category change must invalidate. `next` is the change
 * the seller just asked for; `draft` is the state before it is applied.
 */
export function reconcileChange(draft: VendiDraft, next: Partial<VendiDraft>): Reconciliation {
  const patch: Partial<VendiDraft> = {};
  const dropAnswered: string[] = [];
  const warnings: string[] = [];

  if (next.mode && draft.mode && next.mode !== draft.mode) {
    if (next.mode === 'rent') {
      const lost = held(draft, SALE_ONLY);
      Object.assign(patch, clear(SALE_ONLY));
      dropAnswered.push('sale_price', 'payment_prefs', 'freight');
      if (lost.includes('price_sale')) warnings.push('I removed the sale price — a rental needs a rate instead.');
    } else {
      const lost = held(draft, RENT_ONLY);
      Object.assign(patch, clear(RENT_ONLY));
      dropAnswered.push('rent_period', 'rent_price', 'rent_extra_rates', 'deposit', 'availability', 'instant_book', 'required_documents');
      if (lost.some((k) => String(k).startsWith('price_'))) {
        warnings.push('I removed the rental rates — a sale needs one asking price instead.');
      }
    }
  }

  if (next.category && draft.category && next.category !== draft.category) {
    const wasMobile = isMobileAsset(draft.category);
    const nowMobile = isMobileAsset(next.category);
    if (wasMobile && isStaticLocation(next.category)) {
      const lost = held(draft, MOBILE_ONLY);
      Object.assign(patch, clear(MOBILE_ONLY));
      dropAnswered.push('fulfillment', 'dimensions', 'delivery_terms', 'delivery_instructions', 'pickup_instructions', 'freight');
      if (lost.length) warnings.push('Delivery, pickup and dimension details don’t apply to a fixed space, so I cleared them.');
    } else if (!wasMobile && nowMobile) {
      const lost = held(draft, STATIC_ONLY);
      Object.assign(patch, clear(STATIC_ONLY));
      dropAnswered.push('hours_of_access', 'access_instructions', 'location_notes');
      if (lost.length) warnings.push('Site access details don’t apply to a mobile asset, so I cleared them.');
    }
    dropAnswered.push('subcategory');
  }

  return { patch, dropAnswered, warnings };
}
