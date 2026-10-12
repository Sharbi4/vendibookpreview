/**
 * Offer acknowledgment shown before "Send offer". Must match
 * public.offer_terms_current() exactly — the server rejects any other text/version.
 * DRAFT wording: needs lawyer review before being treated as final.
 */
export const OFFER_TERMS_VERSION = 'offer-ack-2026-10-12-draft';
export const OFFER_TERMS_TEXT =
  'I expressly request to begin the purchase process for this equipment. This offer is subject to seller approval or counteroffer. Submitting an offer does not charge me, reserve the item, or complete a purchase. If the final terms are mutually accepted, I will receive an itemized invoice for the agreed price, applicable taxes and delivery costs, and will separately authorize payment. The identified seller, not Vendibook, is the legal seller.';
export const OFFER_EXPIRY_HOURS = 48;

/** Buyer/seller-facing status labels. "Accepted" never implies paid. */
export function offerStatusLabel(status: string, expiresAt?: string | null): { label: string; tone: 'neutral' | 'warn' | 'ok' | 'bad' } {
  if ((status === 'pending' || status === 'countered') && expiresAt && new Date(expiresAt) < new Date()) return { label: 'Expired', tone: 'bad' };
  switch (status) {
    case 'pending': return { label: 'Request pending', tone: 'warn' };
    case 'countered': return { label: 'Counteroffer pending', tone: 'warn' };
    case 'accepted': return { label: 'Price agreed — invoice pending', tone: 'ok' };
    case 'purchased': return { label: 'Sale pending', tone: 'ok' };
    case 'declined': return { label: 'Declined', tone: 'bad' };
    case 'cancelled': return { label: 'Withdrawn', tone: 'neutral' };
    case 'expired': return { label: 'Expired', tone: 'bad' };
    default: return { label: status, tone: 'neutral' };
  }
}

/** Maps RPC errors to plain messages without exposing internals. */
export function offerErrorMessage(e: unknown): string {
  const m = (e as { message?: string })?.message ?? '';
  const known = ['Sign in', 'acknowledgment', 'valid', 'own listing', 'open offer', 'no longer be changed', 'already accepted', 'not accepting', 'minimum', 'reserved', 'expired', 'already been agreed', 'no longer available', 'phone', 'verif'];
  return known.some((k) => m.includes(k)) ? m : 'Something went wrong. Please try again.';
}
