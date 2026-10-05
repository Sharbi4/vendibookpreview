export interface PriceCheck {
  /** How far below the typical asking price, in dollars (rounded to $500). */
  belowBy: number;
  median: number;
  comps: number;
}

export const MIN_COMPS = 5;
const BELOW_THRESHOLD = 0.9;

export function medianOf(values: number[]): number | null {
  const v = values.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/**
 * Price transparency for sale listings: compares the asking price with the
 * median asking price of other live listings in the same category. Only
 * returns a result when the listing is clearly (10%+) below typical and there
 * are enough comps; it never labels a price as high, so sellers aren't shamed
 * publicly. These are asking prices on Vendibook, not appraisals.
 */
export function priceCheck(price: number | null | undefined, compPrices: number[]): PriceCheck | null {
  if (!price || price <= 0) return null;
  const comps = compPrices.filter((n) => Number.isFinite(n) && n > 0);
  if (comps.length < MIN_COMPS) return null;
  const median = medianOf(comps);
  if (!median || price > median * BELOW_THRESHOLD) return null;
  const belowBy = Math.round((median - price) / 500) * 500;
  if (belowBy < 500) return null;
  return { belowBy, median, comps: comps.length };
}
