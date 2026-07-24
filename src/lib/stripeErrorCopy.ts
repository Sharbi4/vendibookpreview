/**
 * Maps Stripe confirm() error codes / decline_codes to calm, specific
 * three-line copy: what happened, why, and what to try next.
 *
 * Always returns a value — unmapped codes fall back to a generic
 * reassurance panel that keeps the modal open so the buyer can retry
 * without losing entered card details.
 */

export interface StripeErrorCopy {
  title: string;
  why: string;
  fix: string;
}

const CATALOG: Record<string, StripeErrorCopy> = {
  card_declined: {
    title: 'Your bank declined this card.',
    why: 'Your bank blocked the charge — this can happen for security reasons or account limits.',
    fix: 'Try another card, use Apple Pay / Google Pay, or contact your bank.',
  },
  generic_decline: {
    title: 'Your bank declined this card.',
    why: 'The issuing bank did not share a specific reason.',
    fix: 'Try another card or contact your bank.',
  },
  insufficient_funds: {
    title: 'This card does not have enough available balance.',
    why: 'Your bank reported insufficient funds for this purchase.',
    fix: 'Use another card, or add funds and try again.',
  },
  expired_card: {
    title: 'This card has expired.',
    why: 'The expiration date is in the past.',
    fix: 'Use a different card, or update the expiration date if you mistyped it.',
  },
  incorrect_cvc: {
    title: 'The security code is incorrect.',
    why: 'The 3 or 4 digit CVC on the back of the card does not match.',
    fix: 'Re-enter the CVC and try again.',
  },
  incorrect_number: {
    title: 'The card number is incorrect.',
    why: 'Stripe could not validate that card number.',
    fix: 'Double-check each digit and try again.',
  },
  invalid_number: {
    title: 'The card number is invalid.',
    why: 'That does not look like a valid card number.',
    fix: 'Retype the number or try a different card.',
  },
  invalid_expiry_month: {
    title: 'The expiration month is invalid.',
    why: 'The month value is out of range.',
    fix: 'Enter the two-digit month printed on your card.',
  },
  invalid_expiry_year: {
    title: 'The expiration year is invalid.',
    why: 'The year value is out of range.',
    fix: 'Enter the year exactly as printed on your card.',
  },
  processing_error: {
    title: 'We could not process this card right now.',
    why: 'Stripe hit a temporary processing issue with the card network.',
    fix: 'Wait a moment and try again, or use a different card.',
  },
  authentication_required: {
    title: 'Your bank needs to verify this payment.',
    why: 'Your card issuer requires 3-D Secure authentication for this charge.',
    fix: 'Complete the verification prompt from your bank and confirm again.',
  },
  card_velocity_exceeded: {
    title: 'Your bank paused this card.',
    why: 'This card has exceeded the allowed number of recent transactions.',
    fix: 'Try another card or contact your bank to raise the limit.',
  },
  fraudulent: {
    title: 'Your bank flagged this payment.',
    why: 'The issuing bank suspected fraud and blocked the charge.',
    fix: 'Contact your bank to authorize Vendibook, or use a different card.',
  },
  do_not_honor: {
    title: 'Your bank declined this card.',
    why: 'The issuer returned "do not honor" without a specific reason.',
    fix: 'Try another card or contact your bank.',
  },
  stolen_card: {
    title: 'This card cannot be used.',
    why: 'The card has been reported to the issuer.',
    fix: 'Use a different card.',
  },
  lost_card: {
    title: 'This card cannot be used.',
    why: 'The card has been reported lost.',
    fix: 'Use a different card.',
  },
  pickup_card: {
    title: 'This card cannot be used.',
    why: 'The issuing bank has restricted it.',
    fix: 'Use a different card, or contact your bank.',
  },
};

const FALLBACK: StripeErrorCopy = {
  title: 'Payment could not be completed.',
  why: 'The card network returned an error we could not translate.',
  fix: 'Try again, use a different card, or reach us at support@vendibook.com.',
};

interface RawError {
  code?: string;
  decline_code?: string;
  declineCode?: string;
  message?: string;
  type?: string;
}

export function resolveStripeErrorCopy(err: RawError | null | undefined): StripeErrorCopy {
  if (!err) return FALLBACK;
  const declineCode = err.decline_code ?? err.declineCode;
  if (declineCode && CATALOG[declineCode]) return CATALOG[declineCode];
  if (err.code && CATALOG[err.code]) return CATALOG[err.code];
  if (err.message) {
    return {
      title: 'Payment could not be completed.',
      why: err.message,
      fix: 'Try again, use a different card, or reach us at support@vendibook.com.',
    };
  }
  return FALLBACK;
}
