/**
 * Pickup address privacy: the seller's exact pickup location is never shown
 * publicly. It is revealed to the buyer only once the order is paid (or a
 * pay-in-person sale is under way) and the next step is the buyer picking up.
 */
const REVEALED_SALE_STATUSES = new Set([
  'pending_cash',
  'paid',
  'buyer_confirmed',
  'seller_confirmed',
  'completed',
  'disputed',
]);

export function isPickupFulfillment(fulfillment?: string | null): boolean {
  return fulfillment === 'pickup' || fulfillment === 'on_site';
}

export function isPickupLocationRevealed(args: {
  fulfillmentType?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
}): boolean {
  if (!isPickupFulfillment(args.fulfillmentType)) return false;
  if (args.paymentStatus && ['paid', 'captured', 'completed'].includes(args.paymentStatus)) return true;
  return REVEALED_SALE_STATUSES.has(String(args.status ?? ''));
}

export const PICKUP_LOCKED_MESSAGE =
  'The exact pickup address unlocks right after payment. You and the seller then confirm the pickup.';
