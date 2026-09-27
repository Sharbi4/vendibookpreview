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