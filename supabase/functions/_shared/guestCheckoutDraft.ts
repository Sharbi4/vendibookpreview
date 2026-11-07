// Guest checkout recovery rules shared by save-guest-checkout-draft and the
// send-booking-abandonment-emails sweep. Pure helpers so they can be tested.

export type GuestCheckoutFlow = 'sale' | 'rental';

export const GUEST_EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

export function normalizeGuestEmail(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const e = v.trim().toLowerCase();
  return e.length >= 5 && e.length <= 200 && GUEST_EMAIL_RE.test(e) ? e : null;
}

/** Resume links must reopen this site's checkout for the same flow — never an external URL. */
export function safeGuestResumePath(flow: GuestCheckoutFlow, path: unknown): string | null {
  if (typeof path !== 'string' || path.length > 300 || path.startsWith('//')) return null;
  if (flow === 'rental') return path.startsWith('/book/') ? path : null;
  return path.startsWith('/checkout/') || path.startsWith('/purchase-request/') ? path : null;
}

/** A guest draft only applies to a listing in the matching mode that buyers can open. */
export function listingAcceptsGuestDraft(
  flow: GuestCheckoutFlow,
  listing: { status?: string | null; mode?: string | null } | null,
): boolean {
  if (!listing || listing.status !== 'published') return false;
  return flow === 'sale' ? listing.mode === 'sale' : listing.mode === 'rent';
}

/** Dates must be yyyy-MM-dd; anything else is dropped. */
export function safeIsoDate(v: unknown): string | null {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}
