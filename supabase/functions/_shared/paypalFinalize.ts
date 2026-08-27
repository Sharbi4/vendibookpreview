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
import { fulfillMonetizationPurchase } from "./fulfillMonetizationPurchase.ts";
import { fulfillConciergeOrder } from "./concierge.ts";
import { getListingPurchaseState, LISTING_UNAVAILABLE_MESSAGE } from "./listingGuard.ts";


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
 * Internal states that are final. Once a payment reaches one of these it may
 * never be "re-finalised" back into a paid/completed state by a late or
 * replayed capture event.
 */
export const TERMINAL_PAYMENT_STATES = new Set([
  "refunded",
  "partially_refunded",
  "reversed",
  "cancelled",
  "declined",
  "failed",
  "chargeback",
  "disputed_lost",
]);

/**
 * Only the subset of terminal states that exist in the `paypal_payment_status`
 * enum may be used inside a SQL filter. Passing a label the enum does not know
 * (e.g. "chargeback") makes Postgres reject the whole statement with 22P02,
 * which previously made every capture update fail silently.
 */
const ENUM_PAYMENT_STATES = new Set([
  "created",
  "approved",
  "pending",
  "completed",
  "declined",
  "failed",
  "cancelled",
  "partially_refunded",
  "refunded",
  "reversed",
  "authorized",
  "partially_captured",
  "authorization_voided",
  "authorization_expired",
  "deposit_paid_balance_due",
]);

export const TERMINAL_PAYMENT_STATES_SQL = [...TERMINAL_PAYMENT_STATES].filter((s) =>
  ENUM_PAYMENT_STATES.has(s)
);


export class CaptureRejectedError extends Error {
  constructor(public reason: string, message: string) {
    super(message);
    this.name = "CaptureRejectedError";
  }
}

export function normalizeCurrency(value: unknown): string {
  return String(value ?? "USD").trim().toUpperCase();
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

  // ------------------------------------------------------------ terminal guard
  // A refunded / reversed / cancelled / declined payment is never revived.
  if (TERMINAL_PAYMENT_STATES.has(String(record.payment_status))) {
    safeLog("capture_terminal_state_ignored", {
      reference: record.reference,
      state: record.payment_status,
      source,
    });
    return record;
  }

  // ------------------------------------------------------- capture association
  // If this record already carries a different capture id, the event does not
  // belong to it. Never fulfil on a foreign capture.
  if (
    record.paypal_capture_id &&
    facts.captureId &&
    record.paypal_capture_id !== facts.captureId
  ) {
    safeLog("capture_id_mismatch", {
      reference: record.reference,
      expected: record.paypal_capture_id,
      got: facts.captureId,
    });
    await supabase.from("payment_records").update({
      internal_status: "needs_review",
      last_error: {
        reason: "capture_id_mismatch",
        expected: record.paypal_capture_id,
        got: facts.captureId,
      },
    }).eq("id", record.id);
    throw new CaptureRejectedError(
      "capture_id_mismatch",
      `Capture ${facts.captureId} does not belong to ${record.reference}.`,
    );
  }

  // ------------------------------------------------------ amount + currency
  // A mismatch must abort BEFORE any paid state, ledger entry, payable,
  // membership, boost, notary or other fulfillment is written.
  if (isPaid) {
    const expectedCurrency = normalizeCurrency(record.currency ?? "USD");
    const gotCurrency = normalizeCurrency(facts.currency);

    if (facts.amountCents !== record.gross_amount_cents || expectedCurrency !== gotCurrency) {
      const reason = facts.amountCents !== record.gross_amount_cents
        ? "amount_mismatch"
        : "currency_mismatch";
      safeLog(`capture_${reason}`, {
        reference: record.reference,
        expectedAmount: record.gross_amount_cents,
        gotAmount: facts.amountCents,
        expectedCurrency,
        gotCurrency,
      });
      await supabase.from("payment_records").update({
        internal_status: "needs_review",
        last_error: {
          reason,
          expected_amount_cents: record.gross_amount_cents,
          got_amount_cents: facts.amountCents,
          expected_currency: expectedCurrency,
          got_currency: gotCurrency,
        },
        paypal_capture_id: facts.captureId ?? record.paypal_capture_id,
        updated_at: new Date().toISOString(),
      }).eq("id", record.id);
      throw new CaptureRejectedError(
        reason,
        `Capture for ${record.reference} did not match the quoted amount or currency.`,
      );
    }

    // ------------------------------------------------ listing availability
    // Canonical guard, enforced here so BOTH the capture endpoint and a
    // webhook-first delivery refuse to fulfil a withdrawn/sold listing, and
    // so a seller can never buy from themselves.
    if (record.listing_id) {
      const state = await getListingPurchaseState(supabase, record.listing_id);
      if (!state.purchasable) {
        safeLog("capture_listing_unavailable", {
          reference: record.reference,
          reason: state.reason,
        });
        await supabase.from("payment_records").update({
          payment_status: "completed",
          internal_status: "refund_review_listing_unavailable",
          paypal_capture_id: facts.captureId ?? record.paypal_capture_id,
          last_error: { reason: "listing_unavailable", listing_reason: state.reason },
        }).eq("id", record.id);
        throw new CaptureRejectedError("listing_unavailable", LISTING_UNAVAILABLE_MESSAGE);
      }
      if (state.host_id && record.buyer_id && state.host_id === record.buyer_id) {
        await supabase.from("payment_records").update({
          internal_status: "refund_review_self_purchase",
          paypal_capture_id: facts.captureId ?? record.paypal_capture_id,
          last_error: { reason: "self_purchase" },
        }).eq("id", record.id);
        throw new CaptureRejectedError(
          "self_purchase",
          "You can't purchase your own listing.",
        );
      }
    }
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
    // Race-safe: only transition out of a non-terminal state.
    .not("payment_status", "in", `(${[...TERMINAL_PAYMENT_STATES].join(",")})`)
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

  // Sales tax collected on top of the merchandise total — held by Vendibook
  // for remittance, never paid out to the seller/host.
  if (current.tax_cents > 0) {
    await appendLedgerEntry(supabase, {
      paymentRecordId: current.id,
      entryType: "tax_collected",
      amountCents: current.tax_cents,
      currency: facts.currency,
      direction: "credit",
      description: "Estimated sales tax collected — held for remittance",
      dedupeKey: `tax:${facts.captureId}`,
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
      const { data: flipped } = await supabase.from("sale_transactions").update({
        status: "paid",
        payment_provider: "paypal",
        payment_intent_id: facts.captureId,
        checkout_session_id: record.paypal_order_id,
      }).eq("id", record.sale_transaction_id).neq("status", "paid").select("id").maybeSingle();

      // Seller-facing "payment received, arrange the handoff" email. The buyer
      // receipt is delivered separately, so this send is seller-only.
      if (flipped?.id) {
        try {
          await supabase.functions.invoke("send-sale-notification", {
            body: {
              transaction_id: record.sale_transaction_id,
              notification_type: "payment_received",
              audience: "seller",
            },
          });
        } catch (_err) {
          // Notification failures must never break payment finalization.
        }

        // E-signature bill of sale (idempotent; no-ops when SignNow/template
        // config is absent). Never allowed to break payment finalization.
        try {
          const { ensureBillOfSale } = await import("./signnowDocuments.ts");
          const res = await ensureBillOfSale(record.sale_transaction_id);
          safeLog("signnow_bill_of_sale", { transactionId: record.sale_transaction_id, res });
        } catch (err) {
          safeLog("signnow_bill_of_sale_failed", {
            transactionId: record.sale_transaction_id,
            message: (err as Error).message,
          });
        }
      }

    }
    if (record.booking_request_id) {
      const { data: bookingRow } = await supabase
        .from("booking_requests")
        .select("id, status, is_instant_book, payment_status, host_id")
        .eq("id", record.booking_request_id)
        .maybeSingle();

      const alreadyPaid = bookingRow?.payment_status === "paid";
      const update: Record<string, unknown> = {
        payment_status: "paid",
        payment_provider: "paypal",
        payment_intent_id: facts.captureId,
        checkout_session_id: record.paypal_order_id,
        paid_at: nowIso,
      };

      /**
       * Payment capture alone NEVER confirms dates.
       *
       * Instant Book skips host approval only when the host's identity is
       * verified (server-derived: Plaid success + captured payment + no
       * revocation). Every other booking — including Instant Book on an
       * unverified host — stays `pending` until the host explicitly accepts.
       */
      if (bookingRow?.is_instant_book && bookingRow?.status === "pending") {
        let hostVerified = false;
        try {
          const { data: verified } = await supabase.rpc("is_seller_identity_verified", {
            _user_id: bookingRow.host_id,
          });
          hostVerified = verified === true;
        } catch (err) {
          safeLog("host_verification_check_failed", {
            bookingId: record.booking_request_id,
            message: (err as Error).message,
          });
        }
        if (hostVerified) {
          update.status = "approved";
        } else {
          safeLog("instant_book_awaiting_host_approval", {
            bookingId: record.booking_request_id,
            reason: "host_not_identity_verified",
          });
        }
      }

      await supabase.from("booking_requests")
        .update(update)
        .eq("id", record.booking_request_id)
        .neq("payment_status", "paid");

      // Notify host + guest with full booking details once money has landed.
      if (!alreadyPaid) {
        try {
          await supabase.functions.invoke("send-booking-notification", {
            body: { booking_id: record.booking_request_id, event_type: "paid" },
          });
        } catch (err) {
          safeLog("booking_paid_notification_failed", {
            bookingId: record.booking_request_id,
            message: (err as Error).message,
          });
        }
      }

      // Instant Book auto-approved on payment: ensure the rental agreement is
      // out for signature. Idempotent + config-tolerant; host-approved bookings
      // trigger the same helper from the approval path.
      if (update.status === "approved") {
        try {
          const { ensureRentalAgreement } = await import("./signnowDocuments.ts");
          const res = await ensureRentalAgreement(record.booking_request_id);
          safeLog("signnow_rental_agreement", { bookingId: record.booking_request_id, res });
        } catch (err) {
          safeLog("signnow_rental_agreement_failed", {
            bookingId: record.booking_request_id,
            message: (err as Error).message,
          });
        }
      }

    }
    if (record.monetization_purchase_id) {
      await supabase.from("monetization_purchases").update({
        status: "paid",
        payment_provider: "paypal",
        paid_at: nowIso,
      }).eq("id", record.monetization_purchase_id).neq("status", "paid");
      // Grant the entitlement / promotion the buyer just paid for.
      await fulfillMonetizationPurchase(supabase, record.monetization_purchase_id);
    }

    // Vendibook service charges (freight, notary, protected-sale deposit).
    const fulfillment = record.fee_breakdown?.fulfillment as
      | {
        kind?: string;
        sale_transaction_id?: string;
        protected_sale_id?: string;
        listing_id?: string;
        concierge_order_id?: string;
      }
      | undefined;

    if (fulfillment?.kind === "freight" && fulfillment.sale_transaction_id) {
      await supabase.from("sale_transactions").update({
        freight_payment_status: "paid",
        freight_paid_at: nowIso,
        freight_payment_intent_id: facts.captureId,
      }).eq("id", fulfillment.sale_transaction_id).neq("freight_payment_status", "paid");
    }

    if (fulfillment?.kind === "protected_sale_deposit" && fulfillment.protected_sale_id) {
      await supabase.from("protected_sales").update({
        status: "deposit_paid",
        deposit_paid_at: nowIso,
      }).eq("id", fulfillment.protected_sale_id).neq("status", "deposit_paid");
    }

    // Listing Concierge: mark paid and provision exactly one draft listing.
    if (fulfillment?.kind === "concierge" && fulfillment.concierge_order_id) {
      await fulfillConciergeOrder(supabase, {
        orderId: fulfillment.concierge_order_id,
        paypalOrderId: record.paypal_order_id ?? null,
        captureId: facts.captureId,
        paymentRecordId: record.id,
      });
    }

  } catch (err) {
    safeLog("domain_propagation_failed", {
      reference: record.reference,
      message: (err as Error).message,
    });
  }
}
