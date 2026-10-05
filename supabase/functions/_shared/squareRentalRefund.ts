/**
 * Refunds for rental payments made on a host's Square account.
 *
 * The refund is issued with the host's token. Vendibook's app fee is refunded
 * in proportion (deposit-only refunds come entirely out of the app fee, since
 * Vendibook held the deposit). Ledger, payment record, payable and booking are
 * updated idempotently here or by square-rental-webhook, whichever sees the
 * COMPLETED refund first.
 */
import { appendLedgerEntry, recalculatePayableAfterRefund } from "./paypalAccounting.ts";
import { activeSellerAccount, sellerAccessToken, squareApi, SquareApiError } from "./squareMarketplace.ts";
import { refundAppFeeShare, squareIdempotencyKey } from "./squareRentalMath.ts";

export async function latestSquareRentalRecord(admin: any, bookingId: string) {
  const { data } = await admin.from("payment_records").select("*")
    .eq("booking_request_id", bookingId).eq("provider", "square")
    .in("payment_status", ["completed", "partially_refunded"])
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data;
}

/** Applies a COMPLETED Square refund everywhere. Safe to call repeatedly. */
export async function applySquareRefund(admin: any, record: any, refund: any) {
  if (refund.status !== "COMPLETED") return `refund_${String(refund.status ?? "unknown").toLowerCase()}`;
  const amount = Number(refund.amount_money?.amount ?? 0);
  const inserted = await appendLedgerEntry(admin, {
    paymentRecordId: record.id,
    entryType: "refund",
    amountCents: amount,
    currency: refund.amount_money?.currency ?? "USD",
    direction: "debit",
    description: `Square refund ${refund.id}`,
    externalReference: refund.id,
    dedupeKey: `square-refund:${refund.id}`,
    metadata: { app_fee_refunded_cents: Number(refund.app_fee_money?.amount ?? 0) },
  });
  if (!inserted) return "refund_duplicate";

  const { data: current } = await admin.from("payment_records").select("refunded_cents, gross_amount_cents, metadata")
    .eq("id", record.id).maybeSingle();
  const refundedTotal = Math.min(current.gross_amount_cents, Number(current.refunded_cents ?? 0) + amount);
  const full = refundedTotal >= current.gross_amount_cents;
  const appFeeRefunded = Number(current.metadata?.app_fee_refunded_cents ?? 0) + Number(refund.app_fee_money?.amount ?? 0);
  await admin.from("payment_records").update({
    refunded_cents: refundedTotal,
    payment_status: full ? "refunded" : "partially_refunded",
    refunded_at: new Date().toISOString(),
    metadata: { ...(current.metadata ?? {}), app_fee_refunded_cents: appFeeRefunded },
  }).eq("id", record.id);

  const { data: payable } = await admin.from("seller_payables").select("*").eq("payment_record_id", record.id).maybeSingle();
  if (payable) {
    const next = recalculatePayableAfterRefund(payable, refundedTotal);
    await admin.from("seller_payables").update({
      net_payout_cents: next.net_payout_cents, status: next.status, hold_reason: next.hold_reason, refunded_cents: refundedTotal,
    }).eq("id", payable.id);
  }
  if (full && record.booking_request_id) {
    await admin.from("booking_requests").update({ payment_status: "refunded" })
      .eq("id", record.booking_request_id).eq("payment_status", "paid");
  }
  return full ? "refund_full" : "refund_partial";
}

/**
 * Refunds a Square rental payment. amountCents undefined = everything not yet
 * refunded (rental, fees, tax and deposit).
 */
export async function refundSquareRental(admin: any, opts: {
  bookingId: string;
  amountCents?: number;
  reason: string;
  idempotencyKey: string;
  depositOnly?: boolean;
}): Promise<{ success: boolean; id?: string; status?: string; amountCents?: number; error?: string }> {
  const record = await latestSquareRentalRecord(admin, opts.bookingId);
  if (!record?.square_payment_id) return { success: false, error: "No Square payment found for this booking." };
  const remaining = record.gross_amount_cents - Number(record.refunded_cents ?? 0);
  const amountCents = Math.min(remaining, Math.round(opts.amountCents ?? remaining));
  if (amountCents <= 0) return { success: false, error: "Nothing left to refund." };

  const account = await activeSellerAccount(admin, record.seller_id);
  if (!account) return { success: false, error: "The host's Square account is disconnected. An admin must refund this in Square." };
  const appFeeCents = refundAppFeeShare({
    refundCents: amountCents,
    grossCents: record.gross_amount_cents,
    appFeeCents: Number(record.app_fee_cents ?? 0),
    appFeeAlreadyRefundedCents: Number(record.metadata?.app_fee_refunded_cents ?? 0),
    depositOnly: opts.depositOnly,
  });
  try {
    const { refund } = await squareApi("/v2/refunds", {
      token: await sellerAccessToken(admin, account),
      body: {
        idempotency_key: squareIdempotencyKey("rf", opts.idempotencyKey),
        payment_id: record.square_payment_id,
        amount_money: { amount: amountCents, currency: record.currency ?? "USD" },
        ...(appFeeCents > 0 ? { app_fee_money: { amount: appFeeCents, currency: record.currency ?? "USD" } } : {}),
        reason: opts.reason.slice(0, 192),
      },
    });
    if (refund?.status === "COMPLETED") await applySquareRefund(admin, record, refund);
    return { success: refund?.status !== "REJECTED" && refund?.status !== "FAILED", id: refund?.id, status: refund?.status, amountCents };
  } catch (err) {
    return { success: false, error: err instanceof SquareApiError ? `Square refused the refund (${err.code}).` : "Refund failed." };
  }
}
