/**
 * Vendibook Protected Sale fee model.
 *
 * - Protection fee: 4.9% of sale price, floor $499, ceiling $3,000
 * - Deposit: 10% of sale price, min $500 (non-refundable if buyer walks
 *   after agreement is signed), capped at sale price
 * - Balance: sale price - deposit  (protection fee is charged separately)
 */

export const PROTECTION_FEE_BPS = 490; // 4.9%
export const PROTECTION_FEE_MIN_CENTS = 499_00;
export const PROTECTION_FEE_MAX_CENTS = 3_000_00;

export const DEPOSIT_BPS = 1_000; // 10%
export const DEPOSIT_MIN_CENTS = 500_00;

/** Half-away-from-zero rounding to match backend Money helpers. */
export function roundHalfAwayFromZero(n: number): number {
  return n >= 0 ? Math.floor(n + 0.5) : -Math.floor(-n + 0.5);
}

export interface ProtectedSaleAmounts {
  salePriceCents: number;
  protectionFeeCents: number;
  depositCents: number;
  balanceCents: number;
}

export function computeProtectedSaleAmounts(salePriceCents: number): ProtectedSaleAmounts {
  if (!Number.isFinite(salePriceCents) || salePriceCents <= 0) {
    throw new Error('salePriceCents must be a positive integer');
  }
  const price = Math.floor(salePriceCents);

  const rawFee = roundHalfAwayFromZero((price * PROTECTION_FEE_BPS) / 10_000);
  const protectionFeeCents = Math.min(
    PROTECTION_FEE_MAX_CENTS,
    Math.max(PROTECTION_FEE_MIN_CENTS, rawFee),
  );

  const rawDeposit = roundHalfAwayFromZero((price * DEPOSIT_BPS) / 10_000);
  const depositCents = Math.min(price, Math.max(DEPOSIT_MIN_CENTS, rawDeposit));

  const balanceCents = Math.max(0, price - depositCents);

  return { salePriceCents: price, protectionFeeCents, depositCents, balanceCents };
}

/** Protected Sale is only offered above the protection-fee floor. */
export const PROTECTED_SALE_MIN_PRICE_CENTS = PROTECTION_FEE_MIN_CENTS;

export function isProtectedSaleEligible(salePriceCents: number | null | undefined): boolean {
  return typeof salePriceCents === 'number' && salePriceCents >= PROTECTED_SALE_MIN_PRICE_CENTS;
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}
