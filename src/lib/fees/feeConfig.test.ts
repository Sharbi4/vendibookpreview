import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FEE_CONFIG } from '../../../supabase/functions/_shared/feeConfig';
import { calculateRentalFees, RENTAL_HOST_FEE_PERCENT, RENTAL_RENTER_FEE_PERCENT, SALE_SELLER_FEE_PERCENT } from '../commissions';
import { PRO_FEE_PCT, PRO_MAX_SAVINGS_CENTS, STANDARD_FEE_PCT } from './proFee';

describe('central fee config', () => {
  it('drives every client fee constant', () => {
    expect(RENTAL_RENTER_FEE_PERCENT).toBe(FEE_CONFIG.rentalRenterFeePct);
    expect(RENTAL_HOST_FEE_PERCENT).toBe(FEE_CONFIG.rentalHostFeePct);
    expect(SALE_SELLER_FEE_PERCENT).toBe(FEE_CONFIG.saleSellerFeePct);
    expect(STANDARD_FEE_PCT).toBe(FEE_CONFIG.saleSellerFeePct);
    expect(PRO_FEE_PCT).toBe(FEE_CONFIG.proSellerFeePct);
    expect(PRO_MAX_SAVINGS_CENTS).toBe(FEE_CONFIG.proMaxSavingsCents);
  });

  it('keeps the current 12.9% rental renter fee', () => {
    expect(calculateRentalFees(100, 0).customerTotal).toBe(112.9);
  });

  it('matches the rate the database trigger recomputes rental totals with', () => {
    const sql = readFileSync(
      resolve(__dirname, '../../../supabase/migrations/20260919180000_rental_checkout_integrity.sql'),
      'utf8',
    );
    const match = sql.match(/round\(\(base\+delivery\)\*([0-9.]+),2\)/);
    expect(match?.[1]).toBeDefined();
    expect(Number(match![1]) * 100).toBeCloseTo(FEE_CONFIG.rentalRenterFeePct, 10);
  });
});
