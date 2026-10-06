import { FREIGHT_RATES, freightSubtotal } from '../../../supabase/functions/_shared/freightRates';

export interface FreightDisplayEstimate {
  distance_miles: number;
  rate_per_mile: number;
  estimated_transit_days: { min: number; max: number };
}

export function isSellerCoveredFreight(listing: {
  mode?: string | null;
  vendibook_freight_enabled?: boolean | null;
  freight_payer?: string | null;
}): boolean {
  return listing.mode === 'sale' && listing.vendibook_freight_enabled === true && listing.freight_payer === 'seller';
}

/** Buyer-facing copy only. The full estimate remains available for internal accounting. */
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
    detail: `${estimate.distance_miles.toLocaleString()} mi at $${estimate.rate_per_mile.toFixed(2)}/mile, including fuel and handling. ${transit}`,
  };
}
const usd0 = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

/**
 * Before-ZIP estimate for buyer-paid freight, so a buyer sees the likely cost
 * up front. Never use this for seller-covered freight: that shows only
 * "Free shipping" and never exposes the rate.
 */
export function buyerFreightRangeLabel(): string {
  return `$${FREIGHT_RATES.ratePerMile.toFixed(2)}/mile plus fuel and handling · about ${usd0(freightSubtotal(250))} for 250 mi, ${usd0(freightSubtotal(1000))} for 1,000 mi, before tax`;
}
