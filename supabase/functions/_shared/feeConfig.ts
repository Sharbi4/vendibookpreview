/**
 * Vendibook marketplace fee configuration — the single source of truth.
 *
 * Pure constants with no Deno or browser APIs, so both the edge functions
 * (`./feeConfig.ts`) and the web app (`supabase/functions/_shared/feeConfig`)
 * import this same file. Change a rate here, not at the call sites.
 *
 * SQL mirror: public.guard_rental_checkout_snapshot recomputes the renter
 * total with the same 12.9% (rental_checkout_integrity migration). Change both
 * together; src/lib/fees/feeConfig.test.ts guards the parity.
 */
export const FEE_CONFIG = {
  /** Renter-side service fee added on top of the rental subtotal (incl. delivery). */
  rentalRenterFeePct: 12.9,
  /** Host-side commission deducted from the rental subtotal. */
  rentalHostFeePct: 12.9,
  /** Seller-side commission on equipment sales. */
  saleSellerFeePct: 12.9,
  /** Vendibook Pro seller/host rate. */
  proSellerFeePct: 10.9,
  /** Max Pro saving versus standard, per completed transaction. */
  proMaxSavingsCents: 50_000,
} as const;

export type FeeConfig = typeof FEE_CONFIG;
