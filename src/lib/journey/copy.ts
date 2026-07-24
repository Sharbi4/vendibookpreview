/**
 * Friendly-copy helpers — translate technical system language into
 * user-facing microcopy. Keep additions small and reviewed.
 */

const STATUS_MAP: Record<string, string> = {
  // Verification / KYC
  verification_pending: "We're reviewing your documents",
  identity_pending: 'Verifying your identity',
  identity_verified: 'Identity confirmed',
  identity_failed: "We couldn't verify your ID — try again",

  // Payments
  payment_intent_incomplete: 'Finish your payment to continue',
  payment_intent_requires_action: 'One more step to confirm your payment',
  payment_pending: 'Processing your payment',
  payment_succeeded: 'Payment completed',
  payment_failed: "Your payment didn't go through",
  payment_refunded: 'Refund issued',

  // Listings
  listing_draft: 'Draft saved',
  listing_pending_review: "We're reviewing your listing",
  listing_published: 'Listing is live',
  listing_archived: 'Listing archived',

  // Bookings
  booking_requested: 'Waiting for host to respond',
  booking_confirmed: 'Booking confirmed',
  booking_cancelled: 'Booking cancelled',
  booking_completed: 'Booking completed',

  // Docs
  document_pending: 'Waiting on document upload',
  document_review: "We're reviewing your document",
  document_approved: 'Document approved',
  document_rejected: 'Document needs attention',
};

export function friendlyStatus(key: string, fallback?: string): string {
  return STATUS_MAP[key] ?? fallback ?? key.replace(/_/g, ' ');
}

/** Turn milliseconds since save into a soft "Saved 2 hours ago" style string. */
export function friendlySavedAt(iso: string | Date | number | null | undefined): string | undefined {
  if (!iso) return undefined;
  const t = typeof iso === 'string' || typeof iso === 'number' ? new Date(iso).getTime() : iso.getTime();
  if (!Number.isFinite(t)) return undefined;
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'Saved just now';
  if (min < 60) return `Saved ${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `Saved ${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Saved yesterday';
  if (days < 7) return `Saved ${days}d ago`;
  return 'Saved last week';
}
