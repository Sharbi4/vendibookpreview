import { describe, expect, it } from 'vitest';
import {
  PRICE_TBD,
  formatListingPriceLabel,
  hasAnyRentalRate,
  listRentalRates,
  resolveRentalRate,
  validateRentalRates,
} from './rentalPricing';

describe('resolveRentalRate', () => {
  it('maps a monthly-only rental instead of falling back to Price TBD', () => {
    const listing = { mode: 'rent', price_monthly: 1000 };
    expect(resolveRentalRate(listing)).toMatchObject({ unit: 'monthly', amount: 1000, suffix: '/mo' });
    expect(formatListingPriceLabel(listing)).toBe('$1,000/mo');
    expect(hasAnyRentalRate(listing)).toBe(true);
  });

  it('maps weekly-only and hourly-only rentals', () => {
    expect(formatListingPriceLabel({ mode: 'rent', price_weekly: 2500 })).toBe('$2,500/week');
    expect(formatListingPriceLabel({ mode: 'rent', price_hourly: 75 })).toBe('$75/hr');
  });

  it('prefers daily, then hourly, then weekly, then monthly', () => {
    const all = { mode: 'rent', price_hourly: 50, price_daily: 400, price_weekly: 2000, price_monthly: 6000 };
    expect(resolveRentalRate(all)?.unit).toBe('daily');
    expect(listRentalRates(all).map((r) => r.unit)).toEqual(['daily', 'hourly', 'weekly', 'monthly']);
    expect(resolveRentalRate({ price_weekly: 2000, price_monthly: 6000 })?.unit).toBe('weekly');
    expect(resolveRentalRate({ price_monthly: 6000 })?.unit).toBe('monthly');
  });

  it('ignores zero, negative and non-numeric rates', () => {
    expect(resolveRentalRate({ price_daily: 0, price_monthly: -5 })).toBeNull();
    expect(formatListingPriceLabel({ mode: 'rent', price_daily: 0 })).toBe(PRICE_TBD);
  });

  it('coerces numeric strings coming back from the database', () => {
    expect(formatListingPriceLabel({ mode: 'rent', price_monthly: '1000.00' })).toBe('$1,000/mo');
  });
});

describe('formatListingPriceLabel (sale)', () => {
  it('formats a sale price', () => {
    expect(formatListingPriceLabel({ mode: 'sale', price_sale: 48500 })).toBe('$48,500');
  });

  it('falls back to a rental rate when a sale row carries one', () => {
    expect(formatListingPriceLabel({ mode: 'sale', price_sale: null, price_monthly: 1000 })).toBe('$1,000/mo');
  });

  it('returns Price TBD only when nothing is priced', () => {
    expect(formatListingPriceLabel({ mode: 'sale' })).toBe(PRICE_TBD);
    expect(formatListingPriceLabel(null)).toBe(PRICE_TBD);
  });
});

describe('validateRentalRates', () => {
  it('accepts a monthly-only rental', () => {
    const result = validateRentalRates({ price_monthly: '1000' });
    expect(result.valid).toBe(true);
    expect(result.values).toEqual({ hourly: null, daily: null, weekly: null, monthly: 1000 });
  });

  it('requires at least one rate', () => {
    const result = validateRentalRates({ price_daily: '', price_monthly: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.root).toBeDefined();
  });

  it('rejects invalid amounts', () => {
    expect(validateRentalRates({ price_daily: '0' }).errors.daily).toBeDefined();
    expect(validateRentalRates({ price_daily: 'abc' }).errors.daily).toBeDefined();
  });

  it('rejects longer periods priced below shorter periods', () => {
    expect(validateRentalRates({ price_daily: 400, price_weekly: 300 }).errors.weekly).toBeDefined();
    expect(validateRentalRates({ price_weekly: 2000, price_monthly: 1500 }).errors.monthly).toBeDefined();
    expect(validateRentalRates({ price_daily: 400, price_monthly: 350 }).errors.monthly).toBeDefined();
    expect(validateRentalRates({ price_daily: 400, price_weekly: 2000, price_monthly: 6000 }).valid).toBe(true);
  });
});

describe('quoteRentalPeriod', () => {
  it('bills plain days when only a daily rate exists', () => {
    const q = quoteRentalPeriod(3, { price_daily: 300 });
    expect(q?.subtotal).toBe(900);
    expect(q?.breakdown).toBe('3 days @ $300');
    expect(q?.roundedUp).toBe(false);
  });

  it('bundles weeks and remaining days when weekly is cheaper', () => {
    const q = quoteRentalPeriod(9, { price_daily: 300, price_weekly: 1500 });
    // 1 week ($1500) + 2 days ($600) beats 9 daily ($2700)
    expect(q?.subtotal).toBe(2100);
    expect(q?.lines.map((l) => l.unit)).toEqual(['weekly', 'daily']);
  });

  it('uses a full week when the remainder is more expensive than one week', () => {
    const q = quoteRentalPeriod(6, { price_daily: 300, price_weekly: 1500 });
    expect(q?.subtotal).toBe(1500);
    expect(q?.roundedUp).toBe(true);
    expect(q?.billedDays).toBe(7);
  });

  it('bundles months for long stays', () => {
    const q = quoteRentalPeriod(65, { price_daily: 300, price_weekly: 1500, price_monthly: 4000 });
    // 2 months ($8000) + 5 days ($1500) = 9500
    expect(q?.subtotal).toBe(9500);
  });

  it('quotes a monthly-only listing instead of returning nothing', () => {
    const q = quoteRentalPeriod(3, { price_monthly: 1000 });
    expect(q?.subtotal).toBe(1000);
    expect(q?.breakdown).toBe('1 month @ $1,000');
    expect(q?.roundedUp).toBe(true);
  });

  it('returns null when no period rate is configured', () => {
    expect(quoteRentalPeriod(3, { price_hourly: 50 })).toBeNull();
    expect(quoteRentalPeriod(0, { price_daily: 300 })).toBeNull();
  });
});
