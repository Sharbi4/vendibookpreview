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
