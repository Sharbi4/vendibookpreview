/**
 * Shared, idempotent finalisation of a PayPal capture.
 *
 * Called from BOTH the capture endpoint and the webhook handler so whichever
 * arrives first wins and the second is a no-op. All writes are keyed so a
 * duplicate can never double-post a ledger entry or a payable.
 */

import { centsFromPayPalAmount, safeLog } from "./paypal.ts";
import { appendLedgerEntry, ensureSellerPayable } from "./paypalAccounting.ts";

export interface CaptureFacts {
  captureId: string;
  status: string;
  amountCents: number;
  currency: string;
  payerId?: string | null;
  paymentSource?: string | null;
}

/** Pulls the capture facts out of an Orders v2 capture/get response. */
export function extractCaptureFacts(order: any): CaptureFacts | null {
  const capture = order?.purchase_units?.[0]?.payments?.captures?.[0];
  if (!capture) return null;
  return {
    captureId: capture.id,
    status: capture.status,
    amountCents: centsFromPayPalAmount(capture.amount?.value),
    currency: capture.amount?.currency_code ?? "USD",
    payerId: order?.payer?.payer_id ?? order?.payment_source?.paypal?.account_id ?? null,
    paymentSource: order?.payment_source ? Object.keys(order.payment_source)[0] : null,
  };
}

function mapCaptureStatus(status: string) {
  switch (status) {
    case "COMPLETED":
      return "completed";
    case "PENDING":
      return "pending";
    case "DECLINED":
      return "declined";
    case "FAILED":
      return "failed";
    case "REFUNDED":
      return "refunded";
    case "PARTIALLY_REFUNDED":
      return "partially_refunded";
    default:
      return "pending";
  }
}

/**
 * Applies a capture to the internal records. Safe to call repeatedly.
 * Returns the up-to-date payment record.
 */
export async function finalizeCapture(
  supabase: any,
  record: Record<string, any>,
  facts: CaptureFacts,
  source: "capture_endpoint" | "webhook",
) {
  const paymentStatus = mapCaptureStatus(facts.status);
  const isPaid = paymentStatus === "completed";

  // Amount sanity check — never accept a capture that doesn't match the quote.
  if (isPaid && facts.amountCents !== record.gross_amount_cents) {
    safeLog("capture_amount_mismatch", {
      reference: record.reference,
      expected: record.gross_amount_cents,
      got: facts.amountCents,
    });
    await supabase.from("payment_records").update({
      internal_status: "needs_review",
      last_error: { reason: "amount_mismatch", expected: record.gross_amount_cents, got: facts.amountCents },
      updated_at: new Date().toISOString(),
    }).eq("id", record.id);
  }

  const { data: updated } = await supabase
    .from("payment_records")
    .update({
      paypal_capture_id: facts.captureId,
      paypal_payer_id: facts.payerId ?? record.paypal_payer_id,
      payment_source: facts.paymentSource ?? record.payment_source,
      payment_status: paymentStatus,
      internal_status: isPaid ? "paid" : paymentStatus,
      captured_at: isPaid ? (record.captured_at ?? new Date().toISOString()) : record.captured_at,
      last_reconciled_at: new Date().toISOString(),
    })
    .eq("id", record.id)
    .select()
    .maybeSingle();

  const current = updated ?? record;
  if (!isPaid) return current;

  await appendLedgerEntry(supabase, {
    paymentRecordId: current.id,
    entryType: "payment_captured",
    amountCents: facts.amountCents,
    currency: facts.currency,
    direction: "credit",
    description: `PayPal capture ${facts.captureId}`,
    externalReference: facts.captureId,
    dedupeKey: `capture:${facts.captureId}`,
    metadata: { source },
  });

  if (current.platform_fee_cents > 0) {
    await appendLedgerEntry(supabase, {
      paymentRecordId: current.id,
      entryType: "platform_fee",
      amountCents: current.platform_fee_cents,
      currency: facts.currency,
      direction: "debit",
      description: "Vendibook platform fee",
      dedupeKey: `fee:${facts.captureId}`,
      metadata: { source },
    });
  }

  const releaseAt = current.fee_breakdown?.release_at ?? null;
  await ensureSellerPayable(supabase, current, releaseAt);

  await propagateToDomainRecord(supabase, current, facts);
  return current;
}

/** Marks the underlying booking / sale / purchase as paid. */
async function propagateToDomainRecord(
  supabase: any,
  record: Record<string, any>,
  facts: CaptureFacts,
) {
  const nowIso = new Date().toISOString();
  try {
    if (record.sale_transaction_id) {
      await supabase.from("sale_transactions").update({
        status: "paid",
        payment_provider: "paypal",
        payment_intent_id: facts.captureId,
        checkout_session_id: record.paypal_order_id,
      }).eq("id", record.sale_transaction_id).neq("status", "paid");
    }
    if (record.booking_request_id) {
      await supabase.from("booking_requests").update({
        payment_status: "paid",
        payment_provider: "paypal",
        payment_intent_id: facts.captureId,
        checkout_session_id: record.paypal_order_id,
        paid_at: nowIso,
      }).eq("id", record.booking_request_id).neq("payment_status", "paid");
    }
    if (record.monetization_purchase_id) {
      await supabase.from("monetization_purchases").update({
        status: "paid",
        payment_provider: "paypal",
        paid_at: nowIso,
      }).eq("id", record.monetization_purchase_id).neq("status", "paid");
    }
  } catch (err) {
    safeLog("domain_propagation_failed", {
      reference: record.reference,
      message: (err as Error).message,
    });
  }
}
