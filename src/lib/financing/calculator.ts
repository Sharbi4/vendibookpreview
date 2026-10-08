import { parseUtm } from '@/lib/buyerSeoTracking';

export interface FinancingInputs {
  price: number;
  downPayment: number;
  annualRate: number;
  months: number;
  orderValue: number;
  operatingDays: number;
}

/** Fixed-rate, monthly amortization; excludes fees, taxes and insurance. */
export function calculateFinancing(input: FinancingInputs) {
  const { price, downPayment, annualRate, months, orderValue, operatingDays } = input;
  if (Object.values(input).some(value => !Number.isFinite(value)) ||
    price <= 0 || price > 25_000_000 || downPayment < 0 || downPayment > price ||
    annualRate < 0 || annualRate > 100 || !Number.isInteger(months) || months < 1 || months > 360 ||
    orderValue <= 0 || operatingDays < 1 || operatingDays > 31 || !Number.isInteger(operatingDays)) return null;

  const principal = price - downPayment;
  const rate = annualRate / 1200;
  // log1p/expm1 remain stable for very small nonzero illustrative rates.
  const monthlyPayment = rate === 0 ? principal / months : principal * rate / -Math.expm1(-months * Math.log1p(rate));
  const totalPayments = monthlyPayment * months;
  return {
    principal, monthlyPayment, totalPayments,
    financingCost: Math.max(0, totalPayments - principal),
    totalWithDownPayment: totalPayments + downPayment,
    ordersPerMonth: Math.ceil(monthlyPayment / orderValue),
    ordersPerDay: monthlyPayment / orderValue / operatingDays,
  };
}

/** Carry only campaign attribution, never unrelated listing or personal query data. */
export function financingInventoryUrl(price?: number, category?: 'food_truck' | 'food_trailer', search = '') {
  const params = new URLSearchParams({ mode: 'sale' });
  if (category) params.set('category', category);
  if (price !== undefined && Number.isFinite(price) && price > 0) params.set('max_price', String(price));
  for (const [key, value] of Object.entries(parseUtm(search))) if (value) params.set(key, value);
  return `/search?${params.toString()}`;
}

/**
 * Illustrative assumptions behind every "Est. $X/mo" shown next to a sale
 * price. Not an offer, quote or average rate: Equinox Funding sets actual
 * terms after underwriting. 10% down sits inside Equinox's published 0–10%
 * typical range (startups usually 10–15%).
 */
export const ILLUSTRATIVE_FINANCING = { downPct: 10, annualRate: 10, months: 60 } as const;

/** Monthly payment for a sale price under the illustrative assumptions. */
export function illustrativeMonthlyPayment(rawPrice: number | string | null | undefined): number | null {
  // Postgres numeric columns can arrive as strings.
  const price = Number(rawPrice);
  if (!rawPrice || !Number.isFinite(price) || price <= 0) return null;
  const result = calculateFinancing({
    price,
    downPayment: Math.round(price * ILLUSTRATIVE_FINANCING.downPct) / 100,
    annualRate: ILLUSTRATIVE_FINANCING.annualRate,
    months: ILLUSTRATIVE_FINANCING.months,
    orderValue: 1,
    operatingDays: 1,
  });
  return result ? result.monthlyPayment : null;
}

export const illustrativeFinancingNote =
  `*Estimated payment based on ${ILLUSTRATIVE_FINANCING.downPct}% down, ${ILLUSTRATIVE_FINANCING.months} months and ` +
  `${ILLUSTRATIVE_FINANCING.annualRate}% APR. Not an offer of credit. Actual rate, term and payment are set by ` +
  `Equinox Funding after approval.`;

/** Calculator link pre-filled with a listing price. */
export function financingCalculatorUrl(price: number, listingId?: string) {
  const params = new URLSearchParams({ price: String(Math.round(price)) });
  if (listingId) params.set('listing_id', listingId);
  return `/financing?${params.toString()}#calculator`;
}
