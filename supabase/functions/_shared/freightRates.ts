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

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Full freight quote for a distance. The estimate shown at checkout and the
 * amount charged at purchase both come from here.
 */
export function freightQuote(distanceMiles: number, taxRate: number = FREIGHT_RATES.defaultTaxRate) {
  const baseCost = Math.max(FREIGHT_RATES.minimumCharge, distanceMiles * FREIGHT_RATES.ratePerMile);
  const fuelSurcharge = baseCost * FREIGHT_RATES.fuelSurchargePercent;
  const subtotal = baseCost + fuelSurcharge + FREIGHT_RATES.handlingFee;
  const taxAmount = subtotal * taxRate;
  return {
    base_cost: round2(baseCost),
    fuel_surcharge: round2(fuelSurcharge),
    handling_fee: FREIGHT_RATES.handlingFee,
    subtotal: round2(subtotal),
    tax_rate: taxRate,
    tax_amount: round2(taxAmount),
    total_cost: round2(subtotal + taxAmount),
    rate_per_mile: FREIGHT_RATES.ratePerMile,
  };
}
