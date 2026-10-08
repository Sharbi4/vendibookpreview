/**
 * Campus Partner credit math. Pure (no Deno or network APIs) so the web app's
 * tests import this same file.
 *
 * The credit is Vendibook-funded: it lowers what the shopper pays and comes
 * out of Vendibook's platform revenue. It never changes the listing price,
 * the host/seller commission basis or the host/seller proceeds, and it is
 * applied AFTER tax so the tax engine's taxable base is untouched.
 */

export type CampusTransactionType = 'rental' | 'sale';

export const CAMPUS_CREDIT_LABEL = 'Campus Partner credit';

/** The friendly message for any code that can't be used right now. */
export const CAMPUS_INACTIVE_MESSAGE =
  "That Campus Partner code isn't active. Check the code with your school or continue without it.";

/** Case- and whitespace-insensitive code identity (mirrors discount_codes.code_normalized). */
export function normalizePartnerCode(raw: unknown): string {
  return String(raw ?? '').replace(/\s+/g, '').toUpperCase();
}

/** Same shape as a public.discount_codes campus row (only the fields used here). */
export interface CampusCodeTerms {
  rental_percent: number | string | null;
  rental_cap_cents: number | null;
  purchase_credit_cents: number | null;
  purchase_min_cents: number | null;
}

export type CampusCreditResult =
  | { eligible: true; creditCents: number; eligibleSubtotalCents: number }
  | { eligible: false; reason: 'not_offered' | 'below_minimum' | 'no_subtotal'; eligibleSubtotalCents: number; minimumCents?: number };

/**
 * The credit for one transaction.
 *  rental: rental_percent of the rental subtotal (no delivery, tax, deposit,
 *          add-ons), rounded to the cent, capped at rental_cap_cents
 *  sale:   purchase_credit_cents when the equipment price is at least
 *          purchase_min_cents
 * Never more than Vendibook's platform fee on the transaction, so the
 * platform fee net of the credit can never go negative.
 */
export function computeCampusCredit(input: {
  type: CampusTransactionType;
  terms: CampusCodeTerms;
  eligibleSubtotalCents: number;
  platformFeeCents: number;
}): CampusCreditResult {
  const base = Math.max(0, Math.round(Number(input.eligibleSubtotalCents) || 0));
  const feeCeiling = Math.max(0, Math.round(Number(input.platformFeeCents) || 0));
  if (base <= 0) return { eligible: false, reason: 'no_subtotal', eligibleSubtotalCents: base };

  let credit = 0;
  if (input.type === 'rental') {
    const pct = Number(input.terms.rental_percent ?? 0);
    const cap = Math.max(0, Math.round(Number(input.terms.rental_cap_cents ?? 0)));
    if (!(pct > 0) || cap <= 0) return { eligible: false, reason: 'not_offered', eligibleSubtotalCents: base };
    // Basis points keep the percentage exact in integer cents.
    const bps = Math.round(pct * 100);
    credit = Math.min(cap, Math.round((base * bps) / 10_000));
  } else {
    const amount = Math.max(0, Math.round(Number(input.terms.purchase_credit_cents ?? 0)));
    const min = Math.max(0, Math.round(Number(input.terms.purchase_min_cents ?? 0)));
    if (amount <= 0) return { eligible: false, reason: 'not_offered', eligibleSubtotalCents: base };
    if (base < min) return { eligible: false, reason: 'below_minimum', eligibleSubtotalCents: base, minimumCents: min };
    credit = amount;
  }

  credit = Math.min(credit, feeCeiling);
  if (credit <= 0) return { eligible: false, reason: 'not_offered', eligibleSubtotalCents: base };
  return { eligible: true, creditCents: credit, eligibleSubtotalCents: base };
}

/** Rental subtotal the credit applies to: rental price only, never delivery. */
export function rentalEligibleSubtotalCents(rentalSubtotalCents: number, deliveryFeeCents: number): number {
  return Math.max(0, Math.round(rentalSubtotalCents) - Math.max(0, Math.round(deliveryFeeCents || 0)));
}

interface CreditableQuote {
  grossCents: number;
  discountCents: number;
  breakdown: Array<{ label: string; amountCents: number; kind?: 'fee' | 'credit' | 'tax' }>;
}

/**
 * Applies the credit to an already-taxed quote: the shopper pays less, the
 * credit shows as its own negative line, and nothing else moves (platform fee,
 * seller proceeds, tax and deposit stay as quoted).
 */
export function applyCampusCredit<Q extends CreditableQuote>(quote: Q, creditCents: number): Q {
  const credit = Math.round(creditCents);
  if (!Number.isSafeInteger(credit) || credit <= 0) return quote;
  if (credit >= quote.grossCents) throw new Error('campus_credit_exceeds_total');
  quote.grossCents -= credit;
  quote.discountCents = (quote.discountCents ?? 0) + credit;
  quote.breakdown.push({ label: CAMPUS_CREDIT_LABEL, amountCents: -credit, kind: 'credit' });
  return quote;
}
