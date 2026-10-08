import { captureFromOrder } from "./paypalCaptureOutcome.ts";
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
import { notifySellerPaymentOutcome } from "./notifySellerPayment.ts";
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
  /** Buyer's PayPal/wallet email — shown on the confirmation page. */
  payerEmail?: string | null;
  /** Address PayPal shipped to, when the order used shipping. */
  shippingAddress?: Record<string, unknown> | null;
  /** Billing address PayPal returned, when the payment source carried one. */
  billingAddress?: Record<string, unknown> | null;
  /** Which processor captured the money. Defaults to PayPal. */
  provider?: "paypal" | "square";
  /** Square order id, when the payment created one. */
  orderId?: string | null;
  /** Square-hosted receipt link, when available. */
  receiptUrl?: string | null;
}

/** Pulls the capture facts out of an Orders v2 capture/get response. */
export function extractCaptureFacts(order: any): CaptureFacts | null {
  const capture = captureFromOrder(order);
  if (!capture) return null;
  const unit = order?.purchase_units?.[0];
  const source = order?.payment_source ?? {};
  const sourceKey = Object.keys(source)[0] ?? null;
  const sourceDetail = sourceKey ? source[sourceKey] : null;
  const shipping = unit?.shipping ?? null;
  // PayPal returns the billing address on card/wallet sources; PayPal-account
  // payments usually do not carry one, so null is a legitimate answer.
  const billing = sourceDetail?.billing_address ??
    sourceDetail?.card?.billing_address ??
    order?.payer?.address ?? null;

  return {
    captureId: capture.id,
    status: capture.status,
    amountCents: centsFromPayPalAmount(capture.amount?.value),
    currency: capture.amount?.currency_code ?? "USD",
    payerId: order?.payer?.payer_id ?? order?.payment_source?.paypal?.account_id ?? null,
    paymentSource: sourceKey,
    payerEmail: sourceDetail?.email_address ?? order?.payer?.email_address ?? null,
    shippingAddress: shipping
      ? {
        name: shipping?.name?.full_name ?? null,
        ...(shipping?.address ?? {}),
      }
      : null,
    billingAddress: billing ?? null,
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
    case "CANCELED":
      return "cancelled";
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
  // Rentals settle through Square; everything else through PayPal. The
  // capture id lives in the provider's own column on payment_records.
  const provider = facts.provider ?? "paypal";
  const captureCol = provider === "square" ? "square_payment_id" : "paypal_capture_id";
  const providerLabel = provider === "square" ? "Square" : "PayPal";

  // Completed captures cannot be downgraded by a delayed pending webhook.
  if (record.payment_status === "completed") {
    if (record.booking_request_id && record.internal_status === "paid" && isPaid && record[captureCol] === facts.captureId) {
      await propagateToDomainRecord(supabase, record, facts);
    }
    // A sale whose payment completed but whose "paid" update was lost (an
    // error after the payment row was written) is retried here, so a later
    // webhook or return-page visit repairs it instead of leaving the sale
    // pending with the money taken. Refund-review captures are never promoted.
    if (
      record.sale_transaction_id && isPaid && record[captureCol] === facts.captureId &&
      !String(record.internal_status ?? "").startsWith("refund_review")
    ) {
      const { data: sale } = await supabase.from("sale_transactions")
        .select("status").eq("id", record.sale_transaction_id).maybeSingle();
      if (sale && ["pending", "payment_failed", "payment_authorized"].includes(sale.status)) {
        safeLog("sale_paid_repair", { reference: record.reference });
        await propagateToDomainRecord(supabase, record, facts);
      }
    }
    return record;
  }

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
    record[captureCol] &&
    facts.captureId &&
    record[captureCol] !== facts.captureId
  ) {
    safeLog("capture_id_mismatch", {
      reference: record.reference,
      expected: record[captureCol],
      got: facts.captureId,
    });
    await supabase.from("payment_records").update({
      internal_status: "needs_review",
      last_error: {
        reason: "capture_id_mismatch",
        expected: record[captureCol],
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
        [captureCol]: facts.captureId ?? record[captureCol],
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
          [captureCol]: facts.captureId ?? record[captureCol],
          last_error: { reason: "listing_unavailable", listing_reason: state.reason },
        }).eq("id", record.id);
        await alertRefundReview(supabase, record, "the listing was no longer available");
        throw new CaptureRejectedError("listing_unavailable", LISTING_UNAVAILABLE_MESSAGE);
      }
      if (state.host_id && record.buyer_id && state.host_id === record.buyer_id) {
        await supabase.from("payment_records").update({
          internal_status: "refund_review_self_purchase",
          [captureCol]: facts.captureId ?? record[captureCol],
          last_error: { reason: "self_purchase" },
        }).eq("id", record.id);
        await alertRefundReview(supabase, record, "the buyer is the listing's own seller");
        throw new CaptureRejectedError(
          "self_purchase",
          "You can't purchase your own listing.",
        );
      }
      // A sale listing is one unit. If another buyer's purchase is already
      // committed, this capture must not become a second sale: hold it for
      // refund review (the DB trigger would refuse to mark it paid anyway).
      if (record.sale_transaction_id) {
        const { data: otherSale } = await supabase.rpc("listing_committed_sale", {
          _listing_id: record.listing_id,
          _exclude_sale: record.sale_transaction_id,
        });
        if (otherSale) {
          safeLog("capture_listing_already_sold", { reference: record.reference });
          await supabase.from("payment_records").update({
            payment_status: "completed",
            internal_status: "refund_review_listing_sold",
            [captureCol]: facts.captureId ?? record[captureCol],
            last_error: { reason: "listing_already_sold", other_sale_id: otherSale },
          }).eq("id", record.id);
          await alertRefundReview(supabase, record, "another buyer had already purchased this listing");
          throw new CaptureRejectedError("listing_unavailable", LISTING_UNAVAILABLE_MESSAGE);
        }
        // Same buyer, same sale, second PayPal order (another tab, or card
        // fields after buttons): only one payment may count toward the sale.
        const { data: paidAttempt } = await supabase.from("payment_records")
          .select("id").eq("sale_transaction_id", record.sale_transaction_id)
          .eq("payment_status", "completed").neq("id", record.id).limit(1).maybeSingle();
        if (paidAttempt) {
          safeLog("capture_duplicate_sale_payment", { reference: record.reference });
          await supabase.from("payment_records").update({
            payment_status: "completed",
            internal_status: "refund_review_duplicate_payment",
            [captureCol]: facts.captureId ?? record[captureCol],
            last_error: { reason: "duplicate_sale_payment", other_payment_id: paidAttempt.id },
          }).eq("id", record.id);
          await alertRefundReview(supabase, record, "the buyer had already paid for this sale with another PayPal order");
          throw new CaptureRejectedError("duplicate_payment", "This purchase was already paid. The extra payment will be refunded.");
        }
      }
    }
  }


  if (record.booking_request_id && (isPaid || paymentStatus === "pending")) {
    const { error: lockError } = await supabase.rpc("claim_rental_capture", { p_record: record.id });
    if (lockError) {
      await supabase.from("payment_records").update({ internal_status: "rental_capture_review", last_error: { reason: lockError.message } }).eq("id", record.id);
      throw new CaptureRejectedError("rental_capture_review", lockError.message);
    }
  }

  const { data: updated, error: updateErr } = await supabase
    .from("payment_records")
    .update({
      [captureCol]: facts.captureId,
      ...(provider === "square"
        ? {
          square_order_id: facts.orderId ?? record.square_order_id ?? null,
          square_receipt_url: facts.receiptUrl ?? record.square_receipt_url ?? null,
        }
        : { paypal_payer_id: facts.payerId ?? record.paypal_payer_id }),
      payment_source: facts.paymentSource ?? record.payment_source,
      // Confirmation-page facts, taken from the capture response — never assumed.
      payer_email: facts.payerEmail ?? record.payer_email,
      shipping_address: facts.shippingAddress ?? record.shipping_address,
      billing_address: facts.billingAddress ?? record.billing_address,
      payment_status: paymentStatus,
      internal_status: isPaid ? "paid" : paymentStatus,
      captured_at: isPaid ? (record.captured_at ?? new Date().toISOString()) : record.captured_at,
      last_reconciled_at: new Date().toISOString(),
    })
    .eq("id", record.id)
    // Race-safe: only transition out of a non-terminal state.
    .neq("payment_status", "completed")
    .not("payment_status", "in", `(${TERMINAL_PAYMENT_STATES_SQL.join(",")})`)
    .select()
    .maybeSingle();

  // A failed or no-op write must never be treated as a successful capture:
  // money has moved at PayPal, so surface it for review instead of pretending
  // the record was finalised.
  if (!updateErr && !updated) {
    const { data: winner } = await supabase.from("payment_records").select("*").eq("id", record.id).maybeSingle();
    if (winner?.payment_status === "completed") {
      if (winner.booking_request_id && winner.internal_status === "paid") await propagateToDomainRecord(supabase, winner, facts);
      return winner;
    }
  }
  if (updateErr || !updated) {
    safeLog("capture_record_update_failed", {
      reference: record.reference,
      source,
      code: (updateErr as { code?: string } | null)?.code ?? "no_row",
    });
    await supabase.from("payment_records").update({
      internal_status: "needs_review",
      last_error: {
        reason: "capture_record_update_failed",
        code: (updateErr as { code?: string } | null)?.code ?? "no_row",
        capture_id: facts.captureId,
      },
    }).eq("id", record.id);
    throw new CaptureRejectedError(
      "capture_record_update_failed",
      `We received your payment but couldn't finalise order ${record.reference}. Our team has been alerted — please contact support with this reference.`,
    );
  }

  const current = updated;
  if (!isPaid) {
    if (record.booking_request_id) {
      await supabase.from("booking_requests").update(paymentStatus === "pending"
        ? { payment_status: "pending" } : { payment_status: "unpaid", payment_lock_record_id: null })
        .eq("id", record.booking_request_id).eq("payment_lock_record_id", record.id).neq("payment_status", "paid");
    }

    // Keep the sale in step with the payment. A declined/failed capture must
    // not leave the order sitting at `pending` — it moves to `payment_failed`,
    // which is a recoverable state the buyer can retry from. A `pending`
    // capture stays `pending`: PayPal is still reviewing it.
    if (record.sale_transaction_id && (paymentStatus === "declined" || paymentStatus === "failed")) {
      const { error: saleErr } = await supabase
        .from("sale_transactions")
        .update({ status: "payment_failed" })
        .eq("id", record.sale_transaction_id)
        .in("status", ["pending", "payment_authorized"]);
      if (saleErr) {
        safeLog("sale_status_sync_failed", {
          reference: record.reference,
          reason: saleErr.message,
        });
      }
    }


    if (paymentStatus === "pending") {
      await notifyOrderParties(supabase, current, {
        type: "payment_pending",
        buyer: {
          title: "Payment pending",
          message: `${providerLabel} is still reviewing your payment for order ${current.reference}. We'll update you as soon as it clears.`,
        },
        dedupeKey: `pending:${facts.captureId}`,
      });
      await notifySellerPaymentOutcome(supabase, current, "pending", `pending:${facts.captureId}`);
    } else if (paymentStatus === "declined" || paymentStatus === "failed") {
      await notifyOrderParties(supabase, current, {
        type: "payment_failed",
        buyer: {
          title: "Payment did not go through",
          message: `Your payment for order ${current.reference} was not completed. You can safely try again — nothing was charged.`,
        },
        dedupeKey: `failed:${facts.captureId}`,
      });
      await notifySellerPaymentOutcome(supabase, current, "declined", `failed:${facts.captureId}`);
    }
    return current;
  }

  await appendLedgerEntry(supabase, {
    paymentRecordId: current.id,
    entryType: "payment_captured",
    amountCents: facts.amountCents,
    currency: facts.currency,
    direction: "credit",
    description: `${providerLabel} capture ${facts.captureId}`,
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

  // Campus Partner credit: the buyer paid this much less and Vendibook funds
  // it out of the platform fee above. Seller/host proceeds are unchanged.
  const campusCreditCents = Number((current.fee_breakdown as any)?.campus_partner?.credit_cents ?? 0);
  if (campusCreditCents > 0) {
    await appendLedgerEntry(supabase, {
      paymentRecordId: current.id,
      entryType: "promo_credit",
      amountCents: campusCreditCents,
      currency: facts.currency,
      direction: "debit",
      description: "Campus Partner credit (Vendibook-funded)",
      dedupeKey: `promo:${facts.captureId}`,
      metadata: {
        source,
        funded_by: "vendibook",
        redemption_id: (current.fee_breakdown as any)?.campus_partner?.redemption_id ?? null,
        partner_id: (current.fee_breakdown as any)?.campus_partner?.partner_id ?? null,
      },
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
    description: `Your payment was successfully processed through ${providerLabel}.`,
    actorRole: "provider",
    visibility: "both",
    dedupeKey: `captured:${facts.captureId}`,
    metadata: { source },
  });
  // A routed (Connected Path) payment already went to the seller's own
  // PayPal or Square account, so there is nothing for Vendibook to release.
  const routedToSeller = !!(current.metadata as any)?.multiparty?.merchant_id;
  await recordOrderEvent(supabase, {
    paymentRecordId: current.id,
    code: routedToSeller ? "payout_recorded" : "payout_queued",
    title: routedToSeller ? "Paid to your account" : "Seller payout queued",
    description: routedToSeller
      ? `The buyer's payment went directly to your connected ${providerLabel} account, minus Vendibook's fee.`
      : "Your proceeds are recorded. Vendibook reviews and releases seller payouts per the transaction terms.",
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

/**
 * Money was captured but the order can't be fulfilled. Admins must refund it,
 * so they get an alert rather than a status only visible in the database.
 */
async function alertRefundReview(supabase: any, record: Record<string, any>, why: string) {
  try {
    await supabase.functions.invoke("send-admin-notification", {
      body: {
        type: "payments_alert",
        data: {
          title: `Refund review: ${record.reference}`,
          message: `A payment was captured for ${record.reference} but ${why}. Nothing will be fulfilled; refund the buyer from the admin orders page.`,
        },
      },
    });
  } catch {
    safeLog("refund_review_alert_failed", { reference: record.reference });
  }
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
      const { data: flipped, error: flipError } = await supabase.from("sale_transactions").update({
        status: "paid",
        payment_provider: "paypal",
        payment_intent_id: facts.captureId,
        checkout_session_id: record.paypal_order_id,
      }).eq("id", record.sale_transaction_id).neq("status", "paid").select("id").maybeSingle();

      // The sale refused to become paid (e.g. two buyers captured at the same
      // moment and the one-sale-per-listing guard stopped the second). The
      // money moved, so it must be refunded by an admin, never left silent.
      if (flipError) {
        safeLog("sale_paid_flip_failed", { reference: record.reference, reason: flipError.message });
        await supabase.from("payment_records").update({
          internal_status: /reason=sold/.test(flipError.message ?? "")
            ? "refund_review_listing_sold"
            : "sale_status_review",
          last_error: { reason: "sale_status_update_failed", detail: String(flipError.message ?? "").slice(0, 300) },
        }).eq("id", record.id);
        await alertRefundReview(supabase, record, `the sale could not be marked paid (${String(flipError.message ?? "").slice(0, 120)})`);
      }

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


      const update: Record<string, unknown> = {
        payment_status: "paid",
        payment_provider: facts.provider ?? "paypal",
        payment_intent_id: facts.captureId,
        checkout_session_id: facts.provider === "square"
          ? (facts.orderId ?? record.square_order_id ?? null)
          : record.paypal_order_id,
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

      const { data: paidBooking, error: paidError } = await supabase.from("booking_requests")
        .update(update)
        .eq("id", record.booking_request_id)
        .neq("payment_status", "paid").select("id").maybeSingle();
      if (paidError) throw paidError;

      // Notify host + guest with full booking details once money has landed.
      if (paidBooking || bookingRow?.payment_status === "paid") {
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
      if (update.status === "approved" || bookingRow?.status === "approved") {
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
