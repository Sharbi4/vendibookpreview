/**
 * Server-side money math + payable creation for PayPal payments.
 *
 * NOTHING here trusts the browser. Every amount is derived from rows the
 * server loaded itself. Fee rates mirror src/lib/commissions.ts exactly and
 * are NOT changed by the PayPal migration.
 */

import { newPaymentReference } from "./paypal.ts";
import { computeProSellerFee } from "./proFee.ts";
import { FEE_CONFIG } from "./feeConfig.ts";

export const RENTAL_HOST_FEE_PERCENT = FEE_CONFIG.rentalHostFeePct;
export const RENTAL_RENTER_FEE_PERCENT = FEE_CONFIG.rentalRenterFeePct;
export const SALE_SELLER_FEE_PERCENT = FEE_CONFIG.saleSellerFeePct;

/** Days a payable stays pending before it becomes eligible for review. */
export const RENTAL_RELEASE_HOURS = 24;
export const SALE_RELEASE_DAYS = 25;

export type VendibookTransactionType =
  | "sale"
  | "rental"
  | "booking_deposit"
  | "freight"
  | "monetization"
  | "listing_upgrade"
  | "eventpro"
  | "addon";

export interface QuoteResult {
  reference: string;
  transactionType: VendibookTransactionType;
  currency: string;
  /** Total the payer is charged (includes any applied tax). */
  grossCents: number;
  platformFeeCents: number;
  /** Estimated sales tax collected for remittance — never paid out. */
  taxCents: number;
  depositCents: number;
  discountCents: number;
  /** Amount owed to the seller/host (never includes tax). */
  sellerProceedsCents: number;
  description: string;
  breakdown: Array<{ label: string; amountCents: number; kind?: "fee" | "credit" | "tax" }>;
  sellerId: string | null;
  buyerId: string | null;
  listingId: string | null;
  releaseAt: string | null;
  /** Amount the tax engine treats as taxable (merchandise/rental/service base). */
  taxableBaseCents: number;
  /** Tax quote metadata, set by applyTaxToQuote. */
  taxRatePct?: number;
  taxState?: string | null;
  taxSource?: string;
  /** Agreed seller/host fee snapshot (Vendibook Pro benefit), if any. */
  feeRatePct?: number | null;
  proDiscountCents?: number;
  proFeeApplied?: boolean;
  /** Rentals: the host-side commission alone (platformFeeCents also holds the renter fee). */
  hostFeeCents?: number;
}

/**
 * Rides a sales-tax quote on top of an already-computed quote. Tax is added
 * to gross and to the itemized breakdown, but NEVER to platform fees or
 * seller proceeds — Vendibook collects it for remittance only.
 */
export function applyTaxToQuote(
  quote: QuoteResult,
  tax: { taxCents: number; ratePct: number; state: string | null; source: string; label: string },
): QuoteResult {
  if (!tax.taxCents || tax.taxCents <= 0) {
    quote.taxRatePct = tax.ratePct;
    quote.taxState = tax.state;
    quote.taxSource = tax.source;
    return quote;
  }
  quote.taxCents = tax.taxCents;
  quote.grossCents += tax.taxCents;
  quote.taxRatePct = tax.ratePct;
  quote.taxState = tax.state;
  quote.taxSource = tax.source;
  quote.breakdown.push({ label: tax.label, amountCents: tax.taxCents, kind: "tax" });
  return quote;
}

const cents = (n: unknown) => Math.round(Number(n ?? 0) * 100);

/** Quote for a for-sale transaction, using the trusted sale_transactions row. */
export function quoteSaleTransaction(
  tx: Record<string, any>,
  listingTitle: string,
  /** Who pays Vendibook Freight on this listing — resolved server-side. */
  opts: { freightPayer?: "buyer" | "seller" } = {},
): QuoteResult {
  const salePriceCents = cents(tx.amount);
  const freightCents = cents(tx.freight_cost);
  const deliveryCents = cents(tx.delivery_fee);
  const discountCents = cents(tx.promo_discount);

  // Buyer-paid Vendibook Freight is charged with the purchase, in the same
  // PayPal order, so the buyer pays one total. Seller-paid freight is netted
  // out of the seller's proceeds instead and never billed to the buyer.
  const freightPayer = opts.freightPayer ?? "buyer";
  const usesFreight = tx.fulfillment_type === "vendibook_freight" && freightCents > 0;
  const buyerFreightCents = usesFreight && freightPayer === "buyer" &&
      tx.freight_payment_status !== "paid"
    ? freightCents
    : 0;
  const sellerFreightCents = usesFreight && freightPayer === "seller" ? freightCents : 0;

  const merchandiseCents = Math.max(0, salePriceCents + deliveryCents - discountCents);
  const grossCents = merchandiseCents + buyerFreightCents;
  const platformFeeCents = tx.platform_fee !== null && tx.platform_fee !== undefined
    ? cents(tx.platform_fee)
    : Math.round(salePriceCents * (SALE_SELLER_FEE_PERCENT / 100));
  const sellerProceedsCents = tx.seller_payout !== null && tx.seller_payout !== undefined
    ? cents(tx.seller_payout)
    : Math.max(0, salePriceCents - platformFeeCents - sellerFreightCents);

  const releaseAt = new Date(Date.now() + SALE_RELEASE_DAYS * 86_400_000).toISOString();

  return {
    reference: newPaymentReference("VB-SALE"),
    transactionType: "sale",
    currency: "USD",
    grossCents,
    platformFeeCents,
    taxCents: 0,
    // Freight is a transport service, not merchandise — it stays out of the
    // taxable base the tax engine quotes on.
    taxableBaseCents: merchandiseCents,
    depositCents: 0,
    discountCents,
    sellerProceedsCents,
    description: `Vendibook purchase — ${listingTitle}`,
    breakdown: [
      { label: "Item price", amountCents: salePriceCents },
      ...(deliveryCents ? [{ label: "Delivery", amountCents: deliveryCents }] : []),
      ...(buyerFreightCents
        ? [{ label: "Vendibook Freight", amountCents: buyerFreightCents }]
        : []),
      ...(discountCents
        ? [{ label: "Discount", amountCents: -discountCents, kind: "credit" as const }]
        : []),
    ],
    feeRatePct: tx.fee_rate_pct ?? null,
    proDiscountCents: cents(tx.pro_discount),
    proFeeApplied: !!tx.pro_fee_applied,
    sellerId: tx.seller_id ?? null,
    buyerId: tx.buyer_id ?? null,
    listingId: tx.listing_id ?? null,
    releaseAt,
  };
}

/** Quote for a rental / booking request, using the trusted booking row. */
export function quoteBookingRequest(
  booking: Record<string, any>,
  listingTitle: string,
  /** Resolved once at the commitment point; ignored if the booking already
   * carries a locked host-fee snapshot. */
  proOpts: { isPro?: boolean } = {},
): QuoteResult {
  const buyerTotalCents = cents(booking.total_price);
  const depositCents = cents(booking.deposit_amount);

  // total_price already includes the renter platform fee.
  const subtotalCents = Math.round(
    buyerTotalCents / (1 + RENTAL_RENTER_FEE_PERCENT / 100),
  );
  // Renter fee is NEVER discounted — Vendibook Pro is a seller/host benefit.
  const renterFeeCents = Math.max(0, buyerTotalCents - subtotalCents);

  // Host side: use the locked snapshot when the booking already agreed a fee,
  // otherwise compute it now from live Pro eligibility.
  const locked = booking.host_platform_fee !== null && booking.host_platform_fee !== undefined;
  const hostQuote = computeProSellerFee({
    baseCents: subtotalCents,
    isPro: locked ? !!booking.pro_fee_applied : !!proOpts.isPro,
  });
  const hostFeeCents = locked ? cents(booking.host_platform_fee) : hostQuote.feeCents;
  const hostDiscountCents = locked ? cents(booking.host_pro_discount) : hostQuote.discountCents;
  const hostRatePct = locked
    ? (booking.host_fee_rate_pct ?? RENTAL_HOST_FEE_PERCENT)
    : hostQuote.effectiveRatePct;
  const sellerProceedsCents = Math.max(0, subtotalCents - hostFeeCents);

  const releaseAt = new Date(Date.now() + RENTAL_RELEASE_HOURS * 3_600_000).toISOString();

  return {
    reference: newPaymentReference("VB-RENT"),
    transactionType: depositCents > 0 && buyerTotalCents === depositCents
      ? "booking_deposit"
      : "rental",
    currency: "USD",
    // The refundable security deposit is charged today alongside the rental
    // and held by the platform. It is NOT host revenue — it stays out of
    // sellerProceedsCents and is tracked via depositCents for refund (minus any
    // damages / late fees) after the rental ends.
    grossCents: buyerTotalCents + depositCents,
    platformFeeCents: renterFeeCents + hostFeeCents,
    taxCents: 0,
    taxableBaseCents: subtotalCents,
    depositCents,
    discountCents: 0,
    sellerProceedsCents,
    description: `Vendibook booking — ${listingTitle}`,
    breakdown: [
      { label: "Rental subtotal", amountCents: subtotalCents },
      { label: "Service fee", amountCents: renterFeeCents, kind: "fee" },
      ...(depositCents ? [{ label: "Refundable deposit", amountCents: depositCents }] : []),
    ],
    feeRatePct: hostRatePct,
    hostFeeCents,
    proDiscountCents: hostDiscountCents,
    proFeeApplied: hostDiscountCents > 0,
    sellerId: booking.host_id ?? null,
    buyerId: booking.shopper_id ?? null,
    listingId: booking.listing_id ?? null,
    releaseAt,
  };
}

/** Quote for a Vendibook-owned product (upgrades, add-ons, services). */
export function quoteMonetizationProduct(
  product: Record<string, any>,
  amountCents: number,
  discountCents = 0,
): QuoteResult {
  return {
    reference: newPaymentReference("VB-PROD"),
    transactionType: product.category === "listing_upgrade" ? "listing_upgrade" : "monetization",
    currency: (product.currency ?? "USD").toUpperCase(),
    grossCents: Math.max(0, amountCents),
    platformFeeCents: Math.max(0, amountCents),
    taxCents: 0,
    taxableBaseCents: Math.max(0, amountCents),
    depositCents: 0,
    discountCents,
    sellerProceedsCents: 0, // Vendibook is the merchant for its own products
    description: `Vendibook — ${product.name}`,
    breakdown: [
      { label: product.name, amountCents: amountCents + discountCents },
      ...(discountCents
        ? [{ label: "Discount", amountCents: -discountCents, kind: "credit" as const }]
        : []),
    ],
    sellerId: null,
    buyerId: null,
    listingId: null,
    releaseAt: null,
  };
}

/**
 * Append-only ledger write. `dedupeKey` guarantees a duplicated webhook or a
 * retried capture can never post the same entry twice.
 */
export async function appendLedgerEntry(
  supabase: any,
  entry: {
    paymentRecordId: string;
    entryType: string;
    amountCents: number;
    currency?: string;
    direction?: "credit" | "debit";
    description?: string;
    externalReference?: string;
    dedupeKey: string;
    actorId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await supabase.from("payment_ledger_entries").insert({
    payment_record_id: entry.paymentRecordId,
    entry_type: entry.entryType,
    amount_cents: entry.amountCents,
    currency: entry.currency ?? "USD",
    direction: entry.direction ?? "credit",
    description: entry.description ?? null,
    external_reference: entry.externalReference ?? null,
    dedupe_key: entry.dedupeKey,
    actor_id: entry.actorId ?? null,
    metadata: entry.metadata ?? {},
  });
  // 23505 = duplicate dedupe_key, which is the desired idempotent no-op.
  if (error && error.code !== "23505") throw new Error(`Ledger write failed: ${error.message}`);
  return !error;
}

/**
 * Creates the seller payable for a captured payment. Idempotent: the table has
 * a UNIQUE constraint on payment_record_id.
 */
export async function ensureSellerPayable(
  supabase: any,
  record: Record<string, any>,
  releaseAt: string | null,
) {
  if (!record.seller_id || record.seller_proceeds_cents <= 0) return null;

  // Connected Path: PayPal already settled the seller's share straight into
  // their own account, so this payable is a record of a completed payout —
  // never something the manual payout queue should pay again.
  const routed = (record.metadata as any)?.multiparty?.routed === true;
  // Square rentals settle the host's share in the host's own Square account.
  const routedProvider = (record.metadata as any)?.multiparty?.provider === "square" ? "square" : "paypal";

  const { data, error } = await supabase
    .from("seller_payables")
    .insert({
      payment_record_id: record.id,
      seller_id: record.seller_id,
      buyer_id: record.buyer_id,
      listing_id: record.listing_id,
      transaction_type: record.transaction_type,
      currency: record.currency,
      gross_collected_cents: record.gross_amount_cents,
      platform_fee_cents: record.platform_fee_cents,
      fee_rate_pct: record.fee_rate_pct ?? null,
      pro_discount_cents: record.pro_discount_cents ?? 0,
      pro_fee_applied: !!record.pro_fee_applied,
      refunded_cents: record.refunded_cents ?? 0,
      net_payout_cents: record.seller_proceeds_cents,
      status: routed ? "payout_completed" : "pending_release",
      paid_at: record.captured_at ?? new Date().toISOString(),
      release_due_at: releaseAt,
      payout_eligible_at: releaseAt,
      payout_method: routed ? routedProvider : "dwolla_ach",
      payout_provider: routed ? routedProvider : "dwolla_future",
      ...(routed
        ? {
          payout_completed_at: record.captured_at ?? new Date().toISOString(),
          external_payout_reference: (record.metadata as any)?.multiparty?.merchant_id ?? null,
          admin_notes: routedProvider === "square"
            ? "Paid directly into the host's Square account at payment (app fee retained by Vendibook)."
            : "Paid directly by PayPal at capture (Connected Path).",
        }
        : {}),
    })
    .select()
    .maybeSingle();

  if (error && error.code !== "23505") {
    throw new Error(`Payable creation failed: ${error.message}`);
  }
  return data ?? null;
}

/** Recomputes a payable after a refund and blocks payout when appropriate. */
export function recalculatePayableAfterRefund(
  payable: Record<string, any>,
  totalRefundedCents: number,
): { net_payout_cents: number; status: string; hold_reason: string | null } {
  const gross = payable.gross_collected_cents ?? 0;
  const originalNet = (payable.net_payout_cents ?? 0) + (payable.refunded_cents ?? 0);

  if (totalRefundedCents >= gross) {
    return {
      net_payout_cents: 0,
      status: "fully_refunded",
      hold_reason: "Payment fully refunded to the buyer.",
    };
  }
  const proportion = gross > 0 ? (gross - totalRefundedCents) / gross : 0;
  return {
    net_payout_cents: Math.max(0, Math.round(originalNet * proportion)),
    status: "partially_refunded",
    hold_reason: "Partial refund issued — payout amount recalculated.",
  };
}

/**
 * Quote for a Vendibook-owned service charge that isn't backed by a catalog
 * product — freight, notary, protected-sale deposit. Vendibook is the merchant
 * of record, so the whole amount is platform revenue and no payable is owed to
 * a seller at capture time.
 */
export function quoteServiceCharge(opts: {
  prefix: string;
  transactionType: VendibookTransactionType;
  amountCents: number;
  description: string;
  lineLabel: string;
  listingId?: string | null;
  buyerId?: string | null;
  sellerId?: string | null;
  currency?: string;
  depositCents?: number;
}): QuoteResult {
  const amountCents = Math.max(0, Math.round(opts.amountCents));
  return {
    reference: newPaymentReference(opts.prefix),
    transactionType: opts.transactionType,
    currency: (opts.currency ?? "USD").toUpperCase(),
    grossCents: amountCents,
    platformFeeCents: amountCents,
    taxCents: 0,
    taxableBaseCents: amountCents,
    depositCents: opts.depositCents ?? 0,
    discountCents: 0,
    sellerProceedsCents: 0,
    description: opts.description,
    breakdown: [{ label: opts.lineLabel, amountCents }],
    sellerId: opts.sellerId ?? null,
    buyerId: opts.buyerId ?? null,
    listingId: opts.listingId ?? null,
    releaseAt: null,
  };
}

/**
 * Total refunded on a payment, from the ledger. The ledger is deduplicated by
 * PayPal refund id, so the refund endpoint and the PAYMENT.CAPTURE.REFUNDED
 * webhook can both record the same refund without counting it twice.
 * Pending refunds are stored as `refund_pending` and are not counted.
 */
export async function refundedCentsFromLedger(supabase: any, paymentRecordId: string): Promise<number> {
  const { data, error } = await supabase.from("payment_ledger_entries")
    .select("amount_cents")
    .eq("payment_record_id", paymentRecordId)
    .in("entry_type", ["refund", "reversal"]);
  if (error) throw new Error(`Ledger read failed: ${error.message}`);
  return (data ?? []).reduce((sum: number, row: { amount_cents: number }) => sum + Number(row.amount_cents ?? 0), 0);
}

const SALE_REFUNDABLE_FROM = new Set(["paid", "confirmed", "buyer_confirmed", "seller_confirmed", "disputed"]);
const SALE_CANCELLABLE_FROM = new Set(["pending", "payment_authorized", "payment_failed", "pending_cash"]);

/**
 * Ends a sale whose buyer was refunded in full, so it never keeps looking like
 * an active purchase: the sale becomes `refunded` (or `cancelled` if it never
 * reached paid), unsigned agreements are voided and open handoff sessions are
 * cancelled, deliveries stop sharing location. Failures are recorded on the
 * payment for admin review instead of
 * being swallowed. Idempotent.
 */
export async function closeSaleAfterFullRefund(
  supabase: any,
  record: { id: string; sale_transaction_id?: string | null },
  reason: string,
): Promise<{ ok: boolean; saleStatus?: string; error?: string }> {
  const saleId = record.sale_transaction_id;
  if (!saleId) return { ok: true };

  const fail = async (error: string) => {
    console.error("[closeSaleAfterFullRefund]", saleId, error);
    await supabase.from("payment_records").update({
      internal_status: "needs_review",
      last_error: { reason: "sale_close_after_refund_failed", detail: error, at: new Date().toISOString() },
    }).eq("id", record.id);
    return { ok: false, error };
  };

  const { data: sale, error: readError } = await supabase.from("sale_transactions")
    .select("id, status").eq("id", saleId).maybeSingle();
  if (readError || !sale) return await fail(readError?.message ?? "sale not found");

  let target: string | null = null;
  if (sale.status === "refunded" || sale.status === "cancelled") target = null;
  else if (SALE_REFUNDABLE_FROM.has(sale.status)) target = "refunded";
  else if (SALE_CANCELLABLE_FROM.has(sale.status)) target = "cancelled";
  else if (sale.status === "completed" || sale.status === "payout_failed") {
    // A completed sale can only reach refunded through disputed.
    const { error } = await supabase.from("sale_transactions").update({ status: "disputed" }).eq("id", saleId);
    if (error) return await fail(error.message);
    target = "refunded";
  } else {
    return await fail(`sale status ${sale.status} cannot be closed automatically`);
  }

  if (target) {
    const { error } = await supabase.from("sale_transactions")
      .update({ status: target, message: reason.slice(0, 500) }).eq("id", saleId);
    if (error) return await fail(error.message);
  }

  const { error: docError } = await supabase.from("documents")
    .update({ status: "voided" })
    .eq("transaction_id", saleId)
    .in("status", ["draft", "sent", "partially_signed"]);
  if (docError) console.error("[closeSaleAfterFullRefund] documents not voided", docError.message);

  const { error: handoffError } = await supabase.from("handoff_sessions")
    .update({ status: "cancelled" })
    .eq("sale_transaction_id", saleId)
    .not("status", "in", "(completed,cancelled)");
  if (handoffError) console.error("[closeSaleAfterFullRefund] handoff not cancelled", handoffError.message);

  // Stop any delivery in progress and its live location sharing.
  const { error: deliveryError } = await supabase.from("fulfillment_sessions")
    .update({ status: "cancelled", tracking_active: false, tracking_paused: false })
    .eq("sale_transaction_id", saleId)
    .not("status", "in", "(completed,cancelled)");
  if (deliveryError) console.error("[closeSaleAfterFullRefund] delivery not cancelled", deliveryError.message);

  return { ok: true, saleStatus: target ?? sale.status };
}

/**
 * Ends a dispute on a sale without a full refund: the sale returns to where
 * it was before the dispute (paid, one side confirmed, or completed when both
 * confirmed), so fulfillment and confirmation can continue. Idempotent; a
 * sale that is not disputed is left alone.
 */
export async function restoreSaleAfterDispute(
  supabase: any,
  saleId: string | null | undefined,
  note: string,
): Promise<{ ok: boolean; saleStatus?: string; error?: string }> {
  if (!saleId) return { ok: true };
  const { data: sale, error: readError } = await supabase.from("sale_transactions")
    .select("id, status, buyer_confirmed_at, seller_confirmed_at").eq("id", saleId).maybeSingle();
  if (readError || !sale) return { ok: false, error: readError?.message ?? "sale not found" };
  if (sale.status !== "disputed") return { ok: true, saleStatus: sale.status };
  const target = sale.buyer_confirmed_at && sale.seller_confirmed_at
    ? "completed"
    : sale.buyer_confirmed_at
    ? "buyer_confirmed"
    : sale.seller_confirmed_at
    ? "seller_confirmed"
    : "paid";
  const { error } = await supabase.from("sale_transactions")
    .update({ status: target, message: note.slice(0, 500) }).eq("id", saleId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, saleStatus: target };
}
