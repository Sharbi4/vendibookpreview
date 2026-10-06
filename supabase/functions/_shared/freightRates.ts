/**
 * Vendibook Freight pricing (buyer-paid). The single source for the
 * estimate-freight edge function and the buyer-facing range shown on sale
 * listings before a ZIP is entered, so the two can never disagree.
 */
export const FREIGHT_RATES = {
  ratePerMile: 4.5,
  minimumCharge: 150,
  handlingFee: 75,
  fuelSurchargePercent: 0.08,
  defaultTaxRate: 0.0825,
} as const;

/** Freight before tax for a distance: per-mile base (with minimum), fuel and handling. */
export function freightSubtotal(distanceMiles: number): number {
  const base = Math.max(FREIGHT_RATES.minimumCharge, distanceMiles * FREIGHT_RATES.ratePerMile);
  return base + base * FREIGHT_RATES.fuelSurchargePercent + FREIGHT_RATES.handlingFee;
}
