/**
 * Rental host fee benefit and historical transaction compatibility.
 * New equipment sales use equipmentSaleFee.ts (8.7% Standard and Pro).
 * The rental-only 10.9% benefit and $500 cap remain unchanged.
 */

import { FEE_CONFIG } from '../../../supabase/functions/_shared/feeConfig';

export const STANDARD_FEE_PCT = FEE_CONFIG.rentalHostFeePct;
export const PRO_FEE_PCT = FEE_CONFIG.proSellerFeePct;
/** Max saving versus standard, per completed transaction. */
export const PRO_MAX_SAVINGS_CENTS = FEE_CONFIG.proMaxSavingsCents;

export interface ProFeeInput {
  /** Base the commission is charged on, in cents (sale price / rental subtotal). */
  baseCents: number;
  /** Whether Vendibook Pro was active at the commitment point. */
  isPro: boolean;
  /** Pay-in-person / cash sales are 100% free and get no extra discount. */
  isCashSale?: boolean;
}

export interface ProFeeResult {
  baseCents: number;
  standardFeeCents: number;
  discountCents: number;
  feeCents: number;
  /** Effective seller/host rate actually charged, e.g. 10.9 or 11.9. */
  effectiveRatePct: number;
  proApplied: boolean;
  savingsCapped: boolean;
}

const round = (n: number) => Math.round(n);

/** Seller/host-side commission with the Vendibook Pro benefit applied. */
export function computeProSellerFee(input: ProFeeInput): ProFeeResult {
  const baseCents = Math.max(0, round(input.baseCents));

  if (input.isCashSale) {
    return {
      baseCents,
      standardFeeCents: 0,
      discountCents: 0,
      feeCents: 0,
      effectiveRatePct: 0,
      proApplied: false,
      savingsCapped: false,
    };
  }

  const standardFeeCents = round(baseCents * (STANDARD_FEE_PCT / 100));

  if (!input.isPro) {
    return {
      baseCents,
      standardFeeCents,
      discountCents: 0,
      feeCents: standardFeeCents,
      effectiveRatePct: STANDARD_FEE_PCT,
      proApplied: false,
      savingsCapped: false,
    };
  }

  const uncappedDiscount = round(baseCents * ((STANDARD_FEE_PCT - PRO_FEE_PCT) / 100));
  const discountCents = Math.min(uncappedDiscount, PRO_MAX_SAVINGS_CENTS, standardFeeCents);
  const feeCents = Math.max(0, standardFeeCents - discountCents);

  return {
    baseCents,
    standardFeeCents,
    discountCents,
    feeCents,
    effectiveRatePct: baseCents > 0
      ? Math.round((feeCents / baseCents) * 100 * 1000) / 1000
      : 0,
    proApplied: discountCents > 0,
    savingsCapped: uncappedDiscount > PRO_MAX_SAVINGS_CENTS,
  };
}
