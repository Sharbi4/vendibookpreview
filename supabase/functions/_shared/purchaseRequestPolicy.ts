export const PURCHASE_ACK_VERSION = 'purchase-request-2026-10-11';
export const PURCHASE_ACK_TEXT = 'I understand that I am expressly requesting to initiate a purchase transaction through Vendibook. I understand that seller approval and a separate invoice payment are required before the purchase can proceed.';
export const PURCHASE_DISCLOSURES = [
  'You are voluntarily requesting to purchase the equipment identified in this listing.',
  'The seller must review and approve your request. You may receive revised terms that require your separate acceptance.',
  'After approval, an itemized invoice issued on behalf of the seller will show the agreed equipment price, applicable tax, delivery and other disclosed charges.',
  'Submitting this request does not charge you. You must separately review the invoice and authorize payment.',
  'A request does not reserve the equipment or complete a purchase. Any reservation and payment deadline will be shown on the approved invoice.',
  'The identified equipment seller remains the legal seller. Vendibook facilitates the marketplace transaction.',
] as const;

export function purchaseAcknowledged(value: unknown): boolean {
  const v = value as { version?: unknown; accepted?: unknown } | null;
  return v?.accepted === true && v.version === PURCHASE_ACK_VERSION;
}

export const COMMERCE_STATUSES = {
  requested: ['Request Pending', 'Waiting for seller approval'],
  under_review: ['Under Review', 'The seller is reviewing your request'],
  revision_pending: ['Review Revised Terms', 'Buyer acceptance is required'],
  approved: ['Payment Pending', 'Seller approved; Vendibook is preparing your invoice'],
  issued: ['Payment Pending', 'Review and pay your invoice'],
  payment_processing: ['Payment Processing', 'Awaiting a confirmed payment result'],
  paid: ['Sale Pending', 'Payment captured; awaiting handoff'],
  payment_pending: ['Payment Pending', 'Equipment reserved for an approved purchase'],
  sale_pending: ['Sale Pending', 'Equipment funded and awaiting handoff'],
  handoff_pending: ['Handoff Pending', 'Awaiting successful equipment transfer'],
  completed: ['Completed', 'Handoff confirmed'],
  sold: ['Sold', 'This sale is complete'],
  declined: ['Declined', 'Seller declined the request'],
  cancelled: ['Canceled', 'This transaction was canceled'],
  expired: ['Expired', 'The request or invoice window ended'],
  disputed: ['Disputed', 'An issue is being reviewed'],
  refunded: ['Refunded', 'Payment was refunded'],
  partially_refunded: ['Partially Refunded', 'A partial refund was processed'],
} as const;

export function delayedDisbursementDeadline(capturedAt: string, now = Date.now()) {
  const captured = Date.parse(capturedAt);
  if (!Number.isFinite(captured)) throw new Error('Valid provider capture time required');
  const deadline = captured + 28 * 86400000;
  return { deadline: new Date(deadline).toISOString(), daysRemaining: Math.max(0, Math.ceil((deadline - now) / 86400000)), needsReview: deadline - now <= 3 * 86400000, overdue: now >= deadline };
}
