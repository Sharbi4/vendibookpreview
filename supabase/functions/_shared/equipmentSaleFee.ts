import { FEE_CONFIG } from './feeConfig.ts';

export const EQUIPMENT_FEE_VERSION = 'equipment-sale-2026-10-11';

/** New regular equipment sales only. Supply the agreed equipment price, excluding
 * tax, fulfillment and platform-funded credits. Existing snapshots are immutable. */
export function equipmentSaleFee(equipmentCents: number, cash = false) {
  if (!Number.isSafeInteger(equipmentCents) || equipmentCents < 0) {
    throw new Error('Equipment amount must be nonnegative integer cents');
  }
  const rateBps = cash ? 0 : Math.round(FEE_CONFIG.saleSellerFeePct * 100);
  const feeCents = Number((BigInt(equipmentCents) * BigInt(rateBps) + 5000n) / 10000n);
  return {
    version: EQUIPMENT_FEE_VERSION, baseCents: equipmentCents, rateBps,
    feeCents, sellerEquipmentProceedsCents: equipmentCents - feeCents,
    feeRatePct: rateBps / 100, proDiscountCents: 0, proFeeApplied: false,
  };
}
