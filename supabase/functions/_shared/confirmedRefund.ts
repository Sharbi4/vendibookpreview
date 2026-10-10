import type { PaymentOpResult } from './paymentOps.ts';

/** A submitted, pending, or manual refund is not a completed refund. */
export function confirmedRefundId(outcome: PaymentOpResult, expectedCents: number): string {
  if (!outcome.success || outcome.manual || outcome.status !== 'COMPLETED' || !outcome.id || outcome.amountCents !== expectedCents) {
    throw new Error(outcome.error || 'The full deposit refund is not confirmed as completed; review or retry is required.');
  }
  return outcome.id;
}
