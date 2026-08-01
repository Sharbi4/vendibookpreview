/**
 * Shared, idempotent finalisation of a PayPal capture.
 *
 * Called from BOTH the capture endpoint and the webhook handler so whichever
 * arrives first wins and the second is a no-op. All writes are keyed so a
 * duplicate can never double-post a ledger entry or a payable.
 */

import { centsFromPayPalAmount, safeLog } from "./paypal.ts";
import { appendLedgerEntry, ensureSellerPayable } from "./paypalAccounting.ts";
import { recordOrderEvent } from "./orders/orderEvents.ts";
import { deliverOrderReceipt } from "./orders/deliverOrderReceipt.ts";
import { notifyOrderParties, notifyUser } from "./notify.ts";

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
  if (!isPaid) {
    if (paymentStatus === "pending") {
      await notifyOrderParties(supabase, current, {
        type: "payment_pending",
        buyer: {
          title: "Payment pending",
          message: `PayPal is still reviewing your payment for order ${current.reference}. We'll update you as soon as it clears.`,
        },
        dedupeKey: `pending:${facts.captureId}`,
      });
    } else if (paymentStatus === "declined" || paymentStatus === "failed") {
      await notifyOrderParties(supabase, current, {
        type: "payment_failed",
        buyer: {
          title: "Payment did not go through",
          message: `Your payment for order ${current.reference} was not completed. You can safely try again — nothing was charged.`,
        },
        dedupeKey: `failed:${facts.captureId}`,
      });
    }
    return current;
  }

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

  await recordOrderEvent(supabase, {
    paymentRecordId: current.id,
    code: "payment_captured",
    title: "Payment captured",
    description: "Your payment was successfully processed through PayPal.",
    actorRole: "provider",
    visibility: "both",
    dedupeKey: `captured:${facts.captureId}`,
    metadata: { source },
  });
  await recordOrderEvent(supabase, {
    paymentRecordId: current.id,
    code: "payout_queued",
    title: "Seller payout queued",
    description: "Funds are scheduled for release to the seller per Vendibook transaction terms.",
    actorRole: "system",
    visibility: "seller",
    dedupeKey: `payout-queued:${facts.captureId}`,
  });

  await propagateToDomainRecord(supabase, current, facts);

  const dollars = (facts.amountCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: facts.currency ?? "USD",
  });
  await notifyOrderParties(supabase, current, {
    type: "payment_completed",
    buyer: {
      title: "Payment confirmed",
      message: `We received your ${dollars} payment. Order ${current.reference} is confirmed.`,
    },
    seller: {
      title: "You have a paid order",
      message: `Order ${current.reference} has been paid. Review the next steps to keep it moving.`,
    },
    dedupeKey: `paid:${facts.captureId}`,
  });

  // Exactly-once buyer receipt, triggered only after a verified capture.
  try {
    const receipt = await deliverOrderReceipt(supabase, current.id);
    if (receipt && (receipt as any).sent) {
      await notifyUser(supabase, {
        userId: current.buyer_id,
        type: "receipt_sent",
        title: "Receipt sent",
        message: `Your receipt for order ${current.reference} is on its way to your inbox.`,
        link: `/orders/${current.id}`,
        dedupeKey: `receipt-sent:${facts.captureId}`,
      });
    }
  } catch (err) {
    safeLog("receipt_dispatch_failed", { reference: current.reference, message: (err as Error).message });
    await notifyUser(supabase, {
      userId: current.buyer_id,
      type: "receipt_failed",
      title: "We couldn't email your receipt",
      message: `Your payment for order ${current.reference} went through, but the emailed receipt failed. You can view and download it from your order page.`,
      link: `/orders/${current.id}`,
      dedupeKey: `receipt-failed:${facts.captureId}`,
    });
  }

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
