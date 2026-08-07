/**
 * Buyer-safe copy for a Verified Seller attempt that did not complete.
 *
 * The seller may only be told "you were not charged" when the authoritative
 * payment state actually says the money was released. Claiming a released hold
 * while the state is still `authorized`, `captured`, or awaiting refund
 * handling would be untrue, so every other state gets accurate wording.
 */
export type VerifiedSellerPaymentState =
  | 'none'
  | 'created'
  | 'authorized'
  | 'captured'
  | 'refunded'
  | 'voided'
  | 'failed'
  | string
  | null
  | undefined;

export function failedResultCopy(paymentState: VerifiedSellerPaymentState): string {
  switch (paymentState) {
    case 'voided':
    case 'failed':
    case 'created':
    case 'none':
    case null:
    case undefined:
      return 'You were not charged and any hold has been released.';
    case 'authorized':
      return 'Your payment is still on hold while we finish releasing it. You have not been charged — we will confirm by email.';
    case 'refunded':
      return 'Your payment has been refunded in full.';
    case 'captured':
      return 'Your payment was taken before the check finished. We are sorting this out and our team will follow up shortly.';
    default:
      return 'We are confirming the status of your payment and will follow up by email.';
  }
}
