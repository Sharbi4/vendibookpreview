/**
 * Sale transaction state machine.
 * Kept in sync with the DB trigger `enforce_sale_status_transition`.
 */

export const SALE_STATES = [
  'pending',          // created, awaiting Stripe payment
  'pending_cash',     // cash / pay-in-person, awaiting seller mark-received
  'payment_failed',   // Stripe payment failed — recoverable back to `pending`
  'paid',             // funds captured / cash received
  'confirmed',        // either party confirmed handoff
  'disputed',         // dispute open
  'refunded',         // fully refunded
  'cancelled',        // cancelled before payment
  'completed',        // handoff confirmed by both, payout eligible
  'payout_failed',    // payout attempt failed — recoverable to `completed`
  'paid_out',         // seller payout completed
] as const;

export type SaleStatus = typeof SALE_STATES[number];

/** Allowed forward + recovery transitions. Trigger is the source of truth. */
export const ALLOWED_TRANSITIONS: Record<SaleStatus, SaleStatus[]> = {
  pending:        ['paid', 'payment_failed', 'cancelled'],
  pending_cash:   ['paid', 'cancelled'],
  payment_failed: ['pending', 'cancelled'],                          // recovery: retry
  paid:           ['confirmed', 'disputed', 'refunded', 'completed'], // completed via dual-confirm
  confirmed:      ['completed', 'disputed', 'refunded'],
  disputed:       ['refunded', 'completed'],                         // resolve either way
  completed:      ['paid_out', 'payout_failed', 'disputed'],
  payout_failed:  ['completed', 'paid_out'],                         // recovery: retry
  paid_out:       [],                                                // terminal
  refunded:       [],                                                // terminal
  cancelled:      [],                                                // terminal
};

export const TERMINAL_STATES: readonly SaleStatus[] = ['paid_out', 'refunded', 'cancelled'];

export function canTransition(from: SaleStatus, to: SaleStatus): boolean {
  if (from === to) return true; // idempotent no-op
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isTerminal(s: SaleStatus): boolean {
  return TERMINAL_STATES.includes(s);
}

export function assertTransition(from: SaleStatus, to: SaleStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal sale transition ${from} → ${to}`);
  }
}
