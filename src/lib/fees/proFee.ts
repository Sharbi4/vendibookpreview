/**
 * Vendibook Pro seller/host fee benefit — pure money math.
 *
 * Standard seller/host commission is 12.9%. An active Vendibook Pro member
 * pays 10.9% on the seller/host side only, and the saving is capped at $500
 * per completed transaction (i.e. the discount is 2 points of the base, up to
 * $500). Buyer/renter fees are never touched, and pay-in-person sales stay
 * free with no extra discount.
 *
 * PayPal processing costs are NOT part of this calculation.
 *
 * MIRROR: supabase/functions/_shared/proFee.ts — keep both in lockstep (parity unit test in
 * src/lib/fees/proFee.test.ts).
 */

export const STANDARD_FEE_PCT = 12.9;
export const PRO_FEE_PCT = 10.9;
/** Max saving versus standard, per completed transaction. */
export const PRO_MAX_SAVINGS_CENTS = 50_000;

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
