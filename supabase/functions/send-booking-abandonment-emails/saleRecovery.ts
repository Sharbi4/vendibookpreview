/** Sale transaction statuses that mean the buyer did NOT complete the purchase. */
export const UNFINISHED_SALE_STATUSES = new Set([
  'pending', 'created', 'cancelled', 'canceled', 'failed', 'declined', 'expired', 'payment_failed',
]);

/** True when the buyer already paid, chose a committed payment path, or sent a Request to Buy. */
export function buyerCommitted(
  transactionStatuses: Array<string | null | undefined>,
  purchaseRequestCount: number,
): boolean {
  if (purchaseRequestCount > 0) return true;
  return transactionStatuses.some((s) => !!s && !UNFINISHED_SALE_STATUSES.has(s.toLowerCase()));
}

export function saleResumeUrl(resumePath: string | null | undefined, listingId: string, requestOnly: boolean): string {
  const safe = typeof resumePath === 'string' && !resumePath.startsWith('//') &&
    (resumePath.startsWith('/checkout/') || resumePath.startsWith('/purchase-request/'));
  return `https://vendibook.com${safe ? resumePath : `${requestOnly ? '/purchase-request' : '/checkout'}/${listingId}`}`;
}
