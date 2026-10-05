/**
 * Pure helpers for rental payments through Square (marketplace pattern).
 * No Deno or network APIs, so the web app's tests can import this file.
 */

/** Square refuses app_fee_money above 90% of the payment amount. */
export const SQUARE_MAX_APP_FEE_RATIO = 0.9;

export interface RentalSplitInput {
  /** Everything the renter is charged: rental + renter fee + delivery + tax + deposit. */
  grossCents: number;
  /** What the host keeps: rental subtotal minus the host commission. */
  sellerProceedsCents: number;
}

export interface RentalSplit {
  grossCents: number;
  /** Sent to Vendibook as app_fee_money: platform fees, tax held for remittance, refundable deposit. */
  appFeeCents: number;
  /** Settles directly in the host's Square account (before Square's processing fee). */
  sellerCents: number;
}

/**
 * Splits a rental charge between the host's Square account and Vendibook.
 * Keeps the money model the PayPal flow used: the host receives exactly
 * sellerProceedsCents; Vendibook holds fees, tax and the refundable deposit.
 */
export function splitRentalCharge(input: RentalSplitInput): RentalSplit {
  const grossCents = Math.round(input.grossCents);
  const sellerCents = Math.round(input.sellerProceedsCents);
  if (!Number.isSafeInteger(grossCents) || grossCents <= 0) throw new Error('invalid_amount');
  if (!Number.isSafeInteger(sellerCents) || sellerCents <= 0 || sellerCents > grossCents) {
    throw new Error('invalid_split');
  }
  const appFeeCents = grossCents - sellerCents;
  if (appFeeCents > Math.floor(grossCents * SQUARE_MAX_APP_FEE_RATIO)) throw new Error('app_fee_too_large');
  return { grossCents, appFeeCents, sellerCents };
}

/**
 * How much of a refund comes out of Vendibook's app fee. Deposit refunds are
 * funded entirely by Vendibook (the deposit was part of the app fee); any
 * other refund is shared in proportion to the original split, never more than
 * the app fee still unrefunded.
 */
export function refundAppFeeShare(opts: {
  refundCents: number;
  grossCents: number;
  appFeeCents: number;
  appFeeAlreadyRefundedCents?: number;
  depositOnly?: boolean;
}): number {
  const remaining = Math.max(0, opts.appFeeCents - (opts.appFeeAlreadyRefundedCents ?? 0));
  if (opts.refundCents <= 0 || opts.grossCents <= 0) return 0;
  const share = opts.depositOnly
    ? opts.refundCents
    : Math.round(opts.refundCents * (opts.appFeeCents / opts.grossCents));
  return Math.min(remaining, share, opts.refundCents);
}

/** Square payment status → the shared payment_records status. */
export function mapSquarePaymentStatus(status: string | undefined | null) {
  switch (String(status ?? '').toUpperCase()) {
    case 'COMPLETED':
      return 'completed';
    case 'APPROVED':
      return 'authorized';
    case 'PENDING':
      return 'pending';
    case 'CANCELED':
      return 'cancelled';
    case 'FAILED':
      return 'failed';
    default:
      return 'pending';
  }
}

const DECLINE_COPY: Record<string, string> = {
  CARD_DECLINED: 'Your card was declined. Try another card or contact your bank.',
  GENERIC_DECLINE: 'Your card was declined. Try another card or contact your bank.',
  INSUFFICIENT_FUNDS: 'Your card was declined for insufficient funds. Try another card.',
  CVV_FAILURE: "The security code didn't match. Check the CVV and try again.",
  VERIFY_CVV_FAILURE: "The security code didn't match. Check the CVV and try again.",
  ADDRESS_VERIFICATION_FAILURE: "The ZIP code didn't match your card. Check it and try again.",
  VERIFY_AVS_FAILURE: "The ZIP code didn't match your card. Check it and try again.",
  INVALID_EXPIRATION: 'The expiration date is invalid. Check it and try again.',
  CARD_EXPIRED: 'This card has expired. Use another card.',
  INVALID_CARD: "This card number isn't valid. Check it and try again.",
  CARD_NOT_SUPPORTED: "This card type isn't supported. Use another card.",
  TRANSACTION_LIMIT: 'This charge is over your card limit. Try another card or contact your bank.',
  INVALID_PIN: 'Your card was declined. Try another card.',
  CARD_DECLINED_VERIFICATION_REQUIRED: 'Your bank needs to verify this payment. Try again and complete the verification.',
  CARD_DECLINED_CALL_ISSUER: 'Your bank declined this payment. Call the number on your card, or use another card.',
  TEMPORARY_ERROR: "We couldn't reach the card network. Nothing was charged. Please try again.",
  RATE_LIMITED: 'Too many attempts. Wait a minute and try again.',
};

/** Renter-facing copy for a Square error code. Never includes provider payloads. */
export function friendlySquareError(code: string | undefined | null): string {
  return (code && DECLINE_COPY[code]) ||
    "Your payment didn't go through and nothing was charged. Check your card details or try another card.";
}

/** Square idempotency keys are capped at 45 characters. */
export function squareIdempotencyKey(...parts: string[]): string {
  const raw = parts.join(':');
  if (raw.length <= 45) return raw;
  // Deterministic, collision-resistant shortening (FNV-1a over the full key).
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x811c9dc5) >>> 0;
  }
  return `${raw.slice(0, 28)}:${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

/** Square payment object → the provider-neutral facts finalizeCapture checks. */
export function squarePaymentFacts(payment: any) {
  const brand = payment?.card_details?.card?.card_brand;
  return {
    provider: 'square' as const,
    captureId: String(payment?.id ?? ''),
    status: String(payment?.status ?? ''),
    amountCents: Number(payment?.amount_money?.amount ?? 0),
    currency: String(payment?.amount_money?.currency ?? 'USD'),
    paymentSource: brand
      ? `card:${String(brand).toLowerCase()}`
      : (payment?.source_type ? String(payment.source_type).toLowerCase() : null),
    payerEmail: payment?.buyer_email_address ?? null,
    orderId: payment?.order_id ?? null,
    receiptUrl: payment?.receipt_url ?? null,
  };
}
