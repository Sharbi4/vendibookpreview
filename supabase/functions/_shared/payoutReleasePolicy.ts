/** Reasons a payout must not be approved right now. */
export const MONEY_ACTIONS: readonly string[] = ["mark_eligible", "approve", "start_payout", "record_manual_payout", "mark_completed", "retry"];

export function payoutBlockers(payable: any, payment: any, saleStatus: string | null = null, booking: any = null, now = Date.now()): string[] {
  const reasons: string[] = [];
  if (payment?.transaction_type === "sale" && !payment.sale_transaction_id) {
    reasons.push("The sale linked to this payment is missing.");
  }
  const partialWithBalance = payment?.payment_status === "partially_refunded" && (payable.net_payout_cents ?? 0) > 0;
  if (!payment || (payment.payment_status !== "completed" && !partialWithBalance)) {
    reasons.push("The buyer payment is not confirmed as completed.");
  }
  // Captures held for refund review (second buyer, duplicate payment, self
  // purchase, sale status mismatch) must never be paid out.
  const internal = String(payment?.internal_status ?? "");
  if (internal.startsWith("refund_review") || internal === "sale_status_review" || internal === "needs_review") {
    reasons.push("This payment is under refund or status review.");
  }
  if (saleStatus && ["disputed", "refunded", "cancelled"].includes(saleStatus)) {
    reasons.push(`The sale is ${saleStatus}.`);
  }
  if (payment?.sale_transaction_id && !saleStatus) {
    reasons.push("The sale status could not be verified.");
  }
  if (payment?.booking_request_id || payment?.transaction_type === "rental") {
    if (!booking || booking.status !== "completed" || booking.payment_status !== "paid") {
      reasons.push("The rental must be completed and paid before the host payout can be released.");
    }
    if (booking?.dispute_status && !["none", "closed", "resolved"].includes(booking.dispute_status)) {
      reasons.push("An active dispute is open on this rental.");
    }
    if (booking?.payout_hold_until && (!Number.isFinite(Date.parse(booking.payout_hold_until)) || Date.parse(booking.payout_hold_until) > now)) {
      reasons.push("A payout hold is in place on this rental.");
    }
  }
  if (payment && payment.dispute_status && !["none", "resolved"].includes(payment.dispute_status)) {
    reasons.push("An active dispute is open on this payment.");
  }
  if (["fully_refunded", "reversed", "cancelled", "disputed"].includes(payable.status)) {
    reasons.push("This payment was refunded, reversed, disputed or cancelled.");
  }
  if (payable.status === "payout_completed") {
    reasons.push("This seller has already been paid for this transaction.");
  }
  if ((payable.net_payout_cents ?? 0) <= 0) {
    reasons.push("The payout amount is zero after refunds and fees.");
  }
  if (payable.hold_reason && payable.status === "payout_on_hold") {
    reasons.push(`A hold is in place: ${payable.hold_reason}`);
  }
  if (payment?.sale_transaction_id) {
    if (!payable.walkthrough_media_id || !payable.walkthrough_recorded_at) {
      reasons.push("A saved walkthrough video is required before this payout can be approved.");
    }
    if (!payable.agreement_completed_at || !payable.signnow_document_id) {
      reasons.push("Both buyer and seller must sign the purchase agreement before this payout can be approved.");
    }
    if (payable.release_state !== "ready_for_review") {
      reasons.push("The sale conditions are not ready for payout review.");
    }
  }
  return reasons;
}
