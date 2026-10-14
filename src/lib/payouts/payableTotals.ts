/**
 * Totals over the seller's recorded `seller_payables` rows, shared by the
 * Money center (SellerPayoutBalance) and the dashboard Home so both always
 * show the same numbers. Read-only arithmetic: nothing here changes a payable.
 */
export interface PayableLike {
  status: string;
  net_payout_cents: number | null;
  payout_eligible_at?: string | null;
  release_due_at?: string | null;
  payout_completed_at?: string | null;
  created_at: string;
}

/** Statuses a seller can ask Vendibook to review and send. */
export const PAYABLE_REQUESTABLE = new Set(['pending_release', 'eligible_for_review']);
/** Statuses already approved or being processed by Vendibook's payout review. */
export const PAYABLE_IN_REVIEW = new Set(['payout_approved', 'payout_processing']);
/** Statuses that no longer represent money owed to the seller. */
export const PAYABLE_VOID = new Set(['reversed', 'fully_refunded', 'cancelled']);

export interface PayableTotals {
  /** eligible_for_review: ready for the seller to request. */
  available: number;
  /** payout_approved / payout_processing. */
  inReview: number;
  /** pending_release / awaiting_payment_confirmation. */
  upcoming: number;
  /** payout_completed. */
  paid: number;
  /** Earliest expected date among upcoming payables, if any. */
  nextExpectedAt: string | null;
  /** Most recent payout_completed_at, if any. */
  lastPaidAt: string | null;
}

export function summarizePayables(payables: PayableLike[]): PayableTotals {
  let available = 0;
  let inReview = 0;
  let upcoming = 0;
  let paid = 0;
  let nextExpected: number | null = null;
  let lastPaid: number | null = null;
  for (const p of payables) {
    const net = p.net_payout_cents ?? 0;
    if (p.status === 'payout_completed') {
      paid += net;
      const at = Date.parse(p.payout_completed_at ?? '');
      if (Number.isFinite(at) && (lastPaid === null || at > lastPaid)) lastPaid = at;
    } else if (PAYABLE_IN_REVIEW.has(p.status)) inReview += net;
    else if (p.status === 'eligible_for_review') available += net;
    else if (p.status === 'pending_release' || p.status === 'awaiting_payment_confirmation') {
      upcoming += net;
      const at = Date.parse(p.payout_eligible_at || p.release_due_at || '');
      if (Number.isFinite(at) && (nextExpected === null || at < nextExpected)) nextExpected = at;
    }
  }
  return {
    available,
    inReview,
    upcoming,
    paid,
    nextExpectedAt: nextExpected === null ? null : new Date(nextExpected).toISOString(),
    lastPaidAt: lastPaid === null ? null : new Date(lastPaid).toISOString(),
  };
}

/**
 * Seller proceeds recorded since `since` (default: the first of the current
 * month, local time): the net of every payable created in that window that
 * still represents money owed or paid to the seller.
 */
export function proceedsSince(payables: PayableLike[], since: Date = startOfMonth()) {
  const from = since.getTime();
  let cents = 0;
  let count = 0;
  for (const p of payables) {
    if (PAYABLE_VOID.has(p.status)) continue;
    const at = Date.parse(p.created_at);
    if (!Number.isFinite(at) || at < from) continue;
    cents += p.net_payout_cents ?? 0;
    count += 1;
  }
  return { cents, count, since };
}

export function startOfMonth(now: Date = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
