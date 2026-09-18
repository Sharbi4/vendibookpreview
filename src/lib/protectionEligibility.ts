/**
 * PayPal Purchase Protection posture, derived per transaction — never hand-set.
 *
 * PayPal's Purchase Protection program excludes, among other things:
 *  - vehicles of any kind (a food truck is a vehicle; a trailer is a towed vehicle)
 *  - businesses (anything sold as a going concern / turnkey operation)
 *  - items that are wholly or partly custom-made (kills SNAD on custom build-outs)
 *  - items bought for resale
 *  - Item Not Received claims where the buyer collected the item in person
 *  - industrial machinery used in manufacturing
 *
 * We never tell a buyer a purchase is protected when this mapping says it is not.
 */

export type ProtectionPosture = 'excluded' | 'not_item_based' | 'possibly_eligible';

export interface ProtectionInput {
  /** listing_category enum value */
  category?: string | null;
  /** 'sale' | 'rent' */
  mode?: string | null;
  /** Listing is marketed as a turnkey/going-concern business. */
  soldAsBusiness?: boolean | null;
  /** Selected fulfillment: pickup removes Item Not Received eligibility outright. */
  fulfillment?: string | null;
}

export interface ProtectionAssessment {
  posture: ProtectionPosture;
  /** Reason codes, in the order they were derived. */
  reasons: string[];
  /** Short plain-English headline for the buyer. */
  headline: string;
  /** One paragraph of honest detail. */
  body: string;
  /** True when Local Pickup removes Item Not Received eligibility. */
  pickupRemovesInr: boolean;
}

const VEHICLE_CATEGORIES = new Set(['food_truck', 'food_trailer']);
const RENTAL_CATEGORIES = new Set(['ghost_kitchen', 'vendor_lot', 'vendor_space']);
const PICKUP_FULFILLMENTS = new Set(['pickup', 'local_pickup', 'on_site', 'buyer_pickup']);

export function assessProtection(input: ProtectionInput): ProtectionAssessment {
  const category = (input.category ?? '').toLowerCase();
  const mode = (input.mode ?? '').toLowerCase();
  const fulfillment = (input.fulfillment ?? '').toLowerCase();
  const reasons: string[] = [];

  const pickupRemovesInr = PICKUP_FULFILLMENTS.has(fulfillment);
  if (pickupRemovesInr) reasons.push('collected_in_person');

  let posture: ProtectionPosture;

  if (mode === 'rent' || RENTAL_CATEGORIES.has(category)) {
    posture = 'not_item_based';
    reasons.push('not_an_item_purchase');
  } else if (VEHICLE_CATEGORIES.has(category)) {
    posture = 'excluded';
    reasons.push(category === 'food_trailer' ? 'towed_vehicle' : 'vehicle');
  } else if (input.soldAsBusiness) {
    posture = 'excluded';
    reasons.push('business_sold_as_going_concern');
  } else {
    posture = 'possibly_eligible';
    reasons.push('small_equipment_or_parts');
  }

  if (posture !== 'excluded' && input.soldAsBusiness) {
    posture = 'excluded';
    reasons.push('business_sold_as_going_concern');
  }

  const headline =
    posture === 'excluded'
      ? "PayPal's Purchase Protection generally does not cover this purchase"
      : posture === 'not_item_based'
        ? 'This booking is not covered by an item-based protection program'
        : "PayPal's Purchase Protection may apply, on PayPal's terms";

  const body =
    posture === 'excluded'
      ? 'PayPal excludes vehicles, trailers, and businesses sold as a going concern from Purchase Protection, and custom build-outs are excluded as custom-made items. That is exactly why Vendibook requires a walkthrough, a signed agreement, and payment conditions before a seller is paid.'
      : posture === 'not_item_based'
        ? 'Purchase Protection applies to item purchases, not to space or kitchen bookings. Your protection here comes from the Vendibook booking record, the signed agreement, and the Vendibook case process.'
        : 'Coverage is decided by PayPal under its own terms, and Vendibook cannot promise it. The Vendibook walkthrough, signed agreement, and payment conditions apply either way.';

  return { posture, reasons, headline, body, pickupRemovesInr };
}

/** Card-issuer tradeoff. Facts only — never advice on which route to choose. */
export const CARD_ISSUER_TRADEOFF =
  'If you pay by card, your card issuer may give you broader chargeback rights than a PayPal claim. You cannot pursue both a PayPal claim and a card chargeback for the same transaction — choosing one forecloses the other. Contact Vendibook support if you want help understanding the record we hold.';
