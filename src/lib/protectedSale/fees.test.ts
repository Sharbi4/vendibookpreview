import { describe, it, expect } from 'vitest';
import {
  computeProtectedSaleAmounts,
  isProtectedSaleEligible,
  PROTECTION_FEE_MIN_CENTS,
  PROTECTION_FEE_MAX_CENTS,
  DEPOSIT_MIN_CENTS,
} from './fees';

describe('computeProtectedSaleAmounts', () => {
  it('applies the $499 protection floor for small eligible sales', () => {
    const r = computeProtectedSaleAmounts(1_000_00); // $1k * 4.9% = $49 < floor
    expect(r.protectionFeeCents).toBe(PROTECTION_FEE_MIN_CENTS);
  });

  it('scales linearly in the mid-range', () => {
    const r = computeProtectedSaleAmounts(20_000_00); // $20k * 4.9% = $980
    expect(r.protectionFeeCents).toBe(980_00);
  });

  it('caps the protection fee at $3,000', () => {
    const r = computeProtectedSaleAmounts(200_000_00); // $200k * 4.9% = $9,800
    expect(r.protectionFeeCents).toBe(PROTECTION_FEE_MAX_CENTS);
  });

  it('applies the $500 deposit minimum for small eligible sales', () => {
    const r = computeProtectedSaleAmounts(1_000_00); // 10% = $100 < $500
    expect(r.depositCents).toBe(DEPOSIT_MIN_CENTS);
    expect(r.balanceCents).toBe(1_000_00 - DEPOSIT_MIN_CENTS);
  });

  it('uses 10% deposit above the floor', () => {
    const r = computeProtectedSaleAmounts(25_000_00);
    expect(r.depositCents).toBe(2_500_00);
    expect(r.balanceCents).toBe(22_500_00);
  });

  it('never lets deposit exceed sale price', () => {
    const r = computeProtectedSaleAmounts(400_00); // ineligible size, but math must be safe
    expect(r.depositCents).toBeLessThanOrEqual(400_00);
    expect(r.balanceCents).toBeGreaterThanOrEqual(0);
  });

  it('uses half-away-from-zero rounding on the fee', () => {
    // $101.02 * 4.9% = $4.94998 → 495 cents
    const r = computeProtectedSaleAmounts(101_02);
    // floor still applies (<$499), so just verify the raw math for a higher amount:
    const r2 = computeProtectedSaleAmounts(15_305_00); // *0.049 = 749.945 → 74995 cents
    expect(r2.protectionFeeCents).toBe(749_95);
    expect(r.protectionFeeCents).toBe(PROTECTION_FEE_MIN_CENTS);
  });

  it('throws on invalid input', () => {
    expect(() => computeProtectedSaleAmounts(0)).toThrow();
    expect(() => computeProtectedSaleAmounts(-1)).toThrow();
    expect(() => computeProtectedSaleAmounts(Number.NaN)).toThrow();
  });
});

describe('isProtectedSaleEligible', () => {
  it('rejects sales below the protection-fee floor', () => {
    expect(isProtectedSaleEligible(498_99)).toBe(false);
    expect(isProtectedSaleEligible(PROTECTION_FEE_MIN_CENTS)).toBe(true);
    expect(isProtectedSaleEligible(null)).toBe(false);
    expect(isProtectedSaleEligible(undefined)).toBe(false);
  });
});
