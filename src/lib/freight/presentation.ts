export interface FreightDisplayEstimate {
  estimated_transit_days: { min: number; max: number };
}

export function isSellerCoveredFreight(listing: {
  mode?: string | null;
  vendibook_freight_enabled?: boolean | null;
  freight_payer?: string | null;
}): boolean {
  return listing.mode === 'sale' && listing.vendibook_freight_enabled === true && listing.freight_payer === 'seller';
}

/**
 * A placed sale ships on seller-covered Vendibook Freight. Mirrors the server
 * (paypal-create-order): only `freight_payer === 'seller'` on a freight order.
 */
export function isSellerCoveredFreightOrder(
  fulfillmentType: string | null | undefined,
  listing: { freight_payer?: string | null } | null | undefined,
): boolean {
  return String(fulfillmentType ?? '').includes('freight') && listing?.freight_payer === 'seller';
}

/**
 * Buyer-facing copy only. Owner rule (2026-10-14): buyers see the freight
 * quote, never how it is calculated — no per-mile rate, fuel, handling,
 * mileage math or worked examples. The breakdown stays server-side.
 */
export function freightBuyerDisplay(estimate: FreightDisplayEstimate, sellerPaid: boolean) {
  const transit = `Estimated transit ${estimate.estimated_transit_days.min}–${estimate.estimated_transit_days.max} business days.`;

  if (sellerPaid) {
    return {
      charge: 'Free shipping',
      detail: `Seller covers freight on this listing. ${transit}`,
    };
  }

  return {
    charge: null,
    detail: `Door-to-door freight to your address. ${transit}`,
  };
}
/**
 * Before-ZIP line for buyer-paid freight. Never shows a rate or sample prices:
 * the buyer gets an exact quote for their ZIP. Seller-covered freight shows
 * only "Free shipping".
 */
export function buyerFreightRangeLabel(): string {
  return 'Enter your ZIP for an exact freight quote';
}
