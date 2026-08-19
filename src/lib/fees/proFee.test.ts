import { describe, expect, it } from 'vitest';
import { computeProSellerFee } from './proFee';
import { computeProSellerFee as serverComputeProSellerFee } from '../../../supabase/functions/_shared/proFee';

const usd = (dollars: number) => Math.round(dollars * 100);

describe('computeProSellerFee', () => {
  it('charges the standard 12.9% for non-Pro sellers', () => {
    const r = computeProSellerFee({ baseCents: usd(5000), isPro: false });
    expect(r.feeCents).toBe(usd(645));
    expect(r.discountCents).toBe(0);
    expect(r.effectiveRatePct).toBe(12.9);
  });

  it('$5,000 sale — Pro saves 2 points ($100), under the cap', () => {
    const r = computeProSellerFee({ baseCents: usd(5000), isPro: true });
    expect(r.standardFeeCents).toBe(usd(645));
    expect(r.discountCents).toBe(usd(100));
    expect(r.feeCents).toBe(usd(545));
    expect(r.effectiveRatePct).toBe(10.9);
    expect(r.savingsCapped).toBe(false);
  });

  it('$25,000 sale — 2 points is exactly $500, at the cap', () => {
    const r = computeProSellerFee({ baseCents: usd(25000), isPro: true });
    expect(r.standardFeeCents).toBe(usd(3225));
    expect(r.discountCents).toBe(usd(500));
    expect(r.feeCents).toBe(usd(2725));
    expect(r.effectiveRatePct).toBe(10.9);
  });

  it('$50,000 sale — savings capped at $500 (effective rate above 10.9%)', () => {
    const r = computeProSellerFee({ baseCents: usd(50000), isPro: true });
    expect(r.standardFeeCents).toBe(usd(6450));
    expect(r.discountCents).toBe(usd(500));
    expect(r.feeCents).toBe(usd(5950));
    expect(r.savingsCapped).toBe(true);
    expect(r.effectiveRatePct).toBe(11.9);
  });

  it('pay-in-person sales stay free for everyone, Pro included', () => {
    for (const isPro of [true, false]) {
      const r = computeProSellerFee({ baseCents: usd(25000), isPro, isCashSale: true });
      expect(r.feeCents).toBe(0);
      expect(r.discountCents).toBe(0);
      expect(r.proApplied).toBe(false);
    }
  });

  it('never produces a negative fee or a discount above the standard fee', () => {
    const r = computeProSellerFee({ baseCents: 1, isPro: true });
    expect(r.feeCents).toBeGreaterThanOrEqual(0);
    expect(r.discountCents).toBeLessThanOrEqual(r.standardFeeCents);
  });

  it('client and edge-function copies stay in lockstep', () => {
    for (const base of [0, 1, 99, usd(500), usd(5000), usd(25000), usd(50000), usd(1_000_000)]) {
      for (const isPro of [true, false]) {
        for (const isCashSale of [true, false]) {
          expect(computeProSellerFee({ baseCents: base, isPro, isCashSale }))
            .toEqual(serverComputeProSellerFee({ baseCents: base, isPro, isCashSale }));
        }
      }
    }
  });
});
