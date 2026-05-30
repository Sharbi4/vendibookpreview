/**
 * Single source of truth for transaction phase labels and "next action" copy.
 * Used across customer (shopper/buyer) and host/seller surfaces so both sides
 * see the same vocabulary at every stage of a rental or sale.
 *
 * Phase taxonomy intentionally matches BookingPhaseIndicator.getBookingPhase()
 * plus the extra states used by SaleTransactionCard (paid → shipping → confirm).
 */

export type TransactionPhase =
  | 'pending'
  | 'awaiting_payment'
  | 'upcoming'
  | 'happening_now'
  | 'ended_awaiting_confirmation'
  | 'disputed'
  | 'completed'
  | 'cancelled';

export type Role = 'customer' | 'host';

interface PhaseCopy {
  customer: { label: string; next?: string };
  host: { label: string; next?: string };
}

export const PHASE_COPY: Record<TransactionPhase, PhaseCopy> = {
  pending: {
    customer: {
      label: 'Request Sent',
      next: 'The host typically responds within 24h. We will email you the moment they do.',
    },
    host: {
      label: 'New Request',
      next: 'Action needed: approve or decline this request.',
    },
  },
  awaiting_payment: {
    customer: {
      label: 'Awaiting Payment',
      next: 'Complete checkout to confirm your booking. Your card is not charged until you finish.',
    },
    host: {
      label: 'Awaiting Buyer Payment',
      next: 'Waiting on the buyer to complete payment. We will notify you once funds are secured.',
    },
  },
  upcoming: {
    customer: {
      label: 'Payment Secured · Booking Confirmed',
      next: 'You are all set. Your payment is securely held until the booking is complete.',
    },
    host: {
      label: 'Payment Secured — Booking Confirmed',
      next: 'Payment is secured. Get ready for the booking.',
    },
  },
  happening_now: {
    customer: {
      label: 'Happening Now',
      next: 'Enjoy your booking. Funds release after both sides confirm completion.',
    },
    host: {
      label: 'Happening Now',
      next: 'Booking is live. You will be prompted to confirm completion afterwards.',
    },
  },
  ended_awaiting_confirmation: {
    customer: {
      label: 'Awaiting Completion',
      next: 'Confirm everything went well to release the payment and any deposit.',
    },
    host: {
      label: 'Confirm to Release Funds',
      next: 'Confirm completion to release your payout. Auto-releases in 24h if no action.',
    },
  },
  disputed: {
    customer: {
      label: 'Dispute Open',
      next: 'Payment is on hold while Vendibook mediates. We will be in touch.',
    },
    host: {
      label: 'Dispute Open',
      next: 'Payment is on hold pending resolution. Our team is reviewing.',
    },
  },
  completed: {
    customer: {
      label: 'Completed',
      next: 'All done. Funds were released and your booking is wrapped up.',
    },
    host: {
      label: 'Funds Released',
      next: 'Payout has been released to your connected account.',
    },
  },
  cancelled: {
    customer: { label: 'Cancelled' },
    host: { label: 'Cancelled' },
  },
};

export const getPhaseLabel = (phase: TransactionPhase, role: Role) =>
  PHASE_COPY[phase][role].label;

export const getNextAction = (phase: TransactionPhase, role: Role) =>
  PHASE_COPY[phase][role].next;

/** Short, reusable trust copy used near any payment surface. */
export const TRUST_COPY = {
  short: 'Your payment is securely held until the booking is complete.',
  release: 'Funds release after both sides confirm.',
  protection: 'Vendibook protects both sides of the transaction.',
} as const;
