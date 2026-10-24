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

  it('does not discount new rental quotes for Pro at any transaction size', () => {
    for (const amount of [5000, 25000, 50000]) {
      const pro = computeProSellerFee({ baseCents: usd(amount), isPro: true });
      expect(pro).toEqual(computeProSellerFee({ baseCents: usd(amount), isPro: false }));
      expect(pro.discountCents).toBe(0);
      expect(pro.proApplied).toBe(false);
    }
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
