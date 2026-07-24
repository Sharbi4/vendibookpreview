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

  // Permit path
  permit_not_started: "You haven't started this step yet",
  permit_in_progress: 'In progress',
  permit_awaiting_agency: 'Waiting on the agency',
  permit_ready_for_review: 'Ready for your review',
  permit_completed: 'Step completed',

  // Services
  service_request_submitted: 'Your request is in — Vendibook will follow up',
  service_request_in_review: "We're reviewing your request",
  service_request_matched: "We've matched you with a specialist",
  service_request_completed: 'Service completed',
  service_request_cancelled: 'Request cancelled',

  // Subscriptions
  subscription_active: 'Your plan is active',
  subscription_past_due: 'Your payment method needs an update',
  subscription_cancelled: "Your plan is cancelled — it stays active until the period ends",
  subscription_paused: 'Your plan is paused',

  // Offers
  offer_pending: 'Waiting for the other side to respond',
  offer_countered: 'A counter offer needs your review',
  offer_accepted: 'Offer accepted — start the transaction',
  offer_declined: 'Offer declined',
  offer_expired: 'This offer expired',

  // Fulfillment
  fulfillment_scheduled: 'Pickup or delivery is scheduled',
  fulfillment_in_transit: 'On the way',
  fulfillment_delivered: 'Delivered',
  fulfillment_confirmed: 'Handoff confirmed',
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
