import { describe, it, expect } from 'vitest';
import { effectivePriceCents, formatUsd, type MonetizationProduct } from '../products';

// Mirrors the discount computation inside create-monetization-checkout so
// pricing logic is unit-verifiable without booting an edge function.
function applyDiscount(
  priceCents: number,
  code: { percent_off?: number | null; amount_off_cents?: number | null },
): { finalCents: number; discountCents: number } {
  const discount = code.amount_off_cents
    ? Math.min(code.amount_off_cents, priceCents)
    : code.percent_off
      ? Math.floor((priceCents * code.percent_off) / 100)
      : 0;
  return { finalCents: Math.max(0, priceCents - discount), discountCents: discount };
}

const baseProduct = (over: Partial<MonetizationProduct> = {}): MonetizationProduct => ({
  id: 'p1',
  slug: 'featured-listing-30',
  name: 'Featured Listing',
  category: 'listing_upgrade',
  description: null,
  billing_type: 'one_time',
  price_cents: 4900,
  currency: 'usd',
  promo_price_cents: null,
  promo_starts_at: null,
  promo_ends_at: null,
  applicable_listing_types: [],
  features: [],
  refund_policy: null,
  duration_days: 30,
  promo_type: 'featured_30',
  display_order: 100,
  is_active: true,
  stripe_price_id: null,
  ...over,
});

describe('discount math', () => {
  it('applies a percent-off code and floors partial cents', () => {
    const r = applyDiscount(4900, { percent_off: 15 });
    expect(r.discountCents).toBe(735); // 4900 * 0.15 = 735
    expect(r.finalCents).toBe(4165);
  });

  it('caps amount-off at the price so total never goes below zero', () => {
    const r = applyDiscount(4900, { amount_off_cents: 10000 });
    expect(r.discountCents).toBe(4900);
    expect(r.finalCents).toBe(0);
  });

  it('returns zero discount when no code fields are set', () => {
    const r = applyDiscount(4900, {});
    expect(r.discountCents).toBe(0);
    expect(r.finalCents).toBe(4900);
  });
});

describe('effectivePriceCents (promo window)', () => {
  it('uses list price when no promo is configured', () => {
    expect(effectivePriceCents(baseProduct())).toBe(4900);
  });

  it('uses promo price when the current time falls inside the window', () => {
    const now = Date.now();
    const p = baseProduct({
      promo_price_cents: 2900,
      promo_starts_at: new Date(now - 1000).toISOString(),
      promo_ends_at: new Date(now + 60_000).toISOString(),
    });
    expect(effectivePriceCents(p)).toBe(2900);
  });

  it('falls back to list price when the promo window has ended', () => {
    const p = baseProduct({
      promo_price_cents: 2900,
      promo_starts_at: new Date(Date.now() - 60_000).toISOString(),
      promo_ends_at: new Date(Date.now() - 1000).toISOString(),
    });
    expect(effectivePriceCents(p)).toBe(4900);
  });

  it('falls back to list price when the promo window has not started', () => {
    const p = baseProduct({
      promo_price_cents: 2900,
      promo_starts_at: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(effectivePriceCents(p)).toBe(4900);
  });
});

describe('formatUsd', () => {
  it('formats whole-dollar amounts without decimals', () => {
    expect(formatUsd(4900)).toBe('$49');
  });
  it('formats non-round amounts with two decimals', () => {
    expect(formatUsd(4165)).toBe('$41.65');
  });
});
