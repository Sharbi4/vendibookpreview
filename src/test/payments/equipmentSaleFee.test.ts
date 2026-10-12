import { describe, expect, it, vi } from 'vitest';
vi.mock('../../../supabase/functions/_shared/paypal', () => ({ newPaymentReference: () => 'TEST-SALE' }));
import { equipmentSaleFee } from '../../../supabase/functions/_shared/equipmentSaleFee';
import { computeProSellerFee } from '../../../supabase/functions/_shared/proFee';
import { quoteSaleTransaction } from '../../../supabase/functions/_shared/paypalAccounting';

describe('new equipment commission', () => {
  it('charges 8.7% in integer cents without a Pro discount', () => {
    expect(equipmentSaleFee(5_000_000)).toMatchObject({ feeCents: 435_000, rateBps: 870, proFeeApplied: false, sellerEquipmentProceedsCents: 4_565_000 });
    expect(equipmentSaleFee(100_005).feeCents).toBe(8700);
    expect(equipmentSaleFee(0).feeCents).toBe(0);
  });
  it('keeps cash free and rejects malformed amounts', () => {
    expect(equipmentSaleFee(500_000, true).feeCents).toBe(0);
    for (const amount of [-1, NaN, Infinity, 1.5]) expect(() => equipmentSaleFee(amount)).toThrow();
  });
  it('preserves rental Pro fees', () => {
    expect(computeProSellerFee({ baseCents: 100_000, isPro: true }).feeCents).toBe(10900);
    expect(computeProSellerFee({ baseCents: 100_000, isPro: false }).feeCents).toBe(12900);
  });
  it('honors locked old sales and historical unsnapshotted rates', () => {
    const tx = { amount: 5000, platform_fee: 545, fee_rate_pct: 10.9, seller_payout: 4455 };
    expect(quoteSaleTransaction(tx, 'Truck').platformFeeCents).toBe(54500);
    expect(quoteSaleTransaction({ amount: 5000 }, 'Old truck').platformFeeCents).toBe(64500);
  });
  it('excludes tax, transport and platform credits from the equipment commission', () => {
    const fee = equipmentSaleFee(500_000);
    const q = quoteSaleTransaction({ amount: 5000, platform_fee: fee.feeCents / 100, delivery_fee: 300, freight_cost: 1000, fulfillment_type: 'vendibook_freight', promo_discount: 250 }, 'Truck');
    expect(q.platformFeeCents).toBe(43500);
  });
});
