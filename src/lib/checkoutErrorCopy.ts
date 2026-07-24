// Maps stable edge-function error codes to buyer-facing checkout copy.
// Keep messages short, actionable, and never blame the buyer.

import type { ParsedEdgeError } from "./edgeErrors";

export type CheckoutErrorCopy = {
  title: string;
  description: string;
  /** Optional secondary action label the caller can render (e.g. Message seller). */
  actionLabel?: string;
  actionKind?: "message_seller" | "retry" | "back";
};

const MAP: Record<string, CheckoutErrorCopy> = {
  host_not_onboarded: {
    title: "Seller can't accept online payments yet",
    description:
      "This seller isn't set up to accept online payments yet. Message them to arrange payment another way, or check back soon.",
    actionLabel: "Message seller",
    actionKind: "message_seller",
  },
  owner_cannot_buy_own_listing: {
    title: "You own this listing",
    description: "You can't purchase your own listing.",
    actionLabel: "Back",
    actionKind: "back",
  },
  listing_not_found: {
    title: "Listing unavailable",
    description: "We couldn't find this listing. It may have been removed or unpublished.",
    actionLabel: "Back to browse",
    actionKind: "back",
  },
  availability_conflict: {
    title: "Dates just booked",
    description: "Someone else booked these dates a moment ago. Pick a new range to continue.",
    actionLabel: "Choose new dates",
    actionKind: "retry",
  },
  missing_fields: {
    title: "Missing information",
    description: "Some required checkout details are missing. Please review and try again.",
    actionLabel: "Retry",
    actionKind: "retry",
  },
  unauthenticated: {
    title: "Please sign in",
    description: "You need to be signed in to complete this purchase.",
  },
  no_stripe_customer: {
    title: "No billing account found",
    description: "We couldn't find a Stripe billing account for you yet.",
  },
  payment_not_completed: {
    title: "Payment not completed",
    description: "We couldn't confirm your payment. If you were charged, contact support.",
  },
};

const FALLBACK: CheckoutErrorCopy = {
  title: "Checkout Error",
  description: "Something went wrong starting checkout. Please try again.",
  actionLabel: "Retry",
  actionKind: "retry",
};

export function checkoutErrorCopy(parsed: ParsedEdgeError): CheckoutErrorCopy {
  if (parsed.code && MAP[parsed.code]) return MAP[parsed.code];
  if (parsed.message) return { ...FALLBACK, description: parsed.message };
  return FALLBACK;
}
