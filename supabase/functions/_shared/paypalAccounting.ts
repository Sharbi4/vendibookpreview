/**
 * Server-side money math + payable creation for PayPal payments.
 *
 * NOTHING here trusts the browser. Every amount is derived from rows the
 * server loaded itself. Fee rates mirror src/lib/commissions.ts exactly and
 * are NOT changed by the PayPal migration.
 */

import { newPaymentReference } from "./paypal.ts";

export const RENTAL_HOST_FEE_PERCENT = 12.9;
export const RENTAL_RENTER_FEE_PERCENT = 12.9;
export const SALE_SELLER_FEE_PERCENT = 12.9;

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
  grossCents: number;
  platformFeeCents: number;
  taxCents: number;
  depositCents: number;
  discountCents: number;
  sellerProceedsCents: number;
  description: string;
  breakdown: Array<{ label: string; amountCents: number; kind?: "fee" | "credit" }>;
  sellerId: string | null;
  buyerId: string | null;
  listingId: string | null;
  releaseAt: string | null;
}

const cents = (n: unknown) => Math.round(Number(n ?? 0) * 100);

/** Quote for a for-sale transaction, using the trusted sale_transactions row. */
export function quoteSaleTransaction(tx: Record<string, any>, listingTitle: string): QuoteResult {
  const salePriceCents = cents(tx.amount);
  const freightCents = cents(tx.freight_cost);
  const deliveryCents = cents(tx.delivery_fee);
  const discountCents = cents(tx.promo_discount);

  const grossCents = Math.max(0, salePriceCents + deliveryCents - discountCents);
  const platformFeeCents = tx.platform_fee !== null && tx.platform_fee !== undefined
    ? cents(tx.platform_fee)
    : Math.round(salePriceCents * (SALE_SELLER_FEE_PERCENT / 100));
  const sellerProceedsCents = tx.seller_payout !== null && tx.seller_payout !== undefined
    ? cents(tx.seller_payout)
    : Math.max(0, salePriceCents - platformFeeCents - freightCents);

  const releaseAt = new Date(Date.now() + SALE_RELEASE_DAYS * 86_400_000).toISOString();

  return {
    reference: newPaymentReference("VB-SALE"),
    transactionType: "sale",
    currency: "USD",
    grossCents,
    platformFeeCents,
    taxCents: 0,
    depositCents: 0,
    discountCents,
    sellerProceedsCents,
    description: `Vendibook purchase — ${listingTitle}`,
    breakdown: [
      { label: "Item price", amountCents: salePriceCents },
      ...(deliveryCents ? [{ label: "Delivery", amountCents: deliveryCents }] : []),
      ...(discountCents
        ? [{ label: "Discount", amountCents: -discountCents, kind: "credit" as const }]
        : []),
    ],
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
): QuoteResult {
  const buyerTotalCents = cents(booking.total_price);
  const depositCents = cents(booking.deposit_amount);

  // total_price already includes the renter platform fee.
  const subtotalCents = Math.round(
    buyerTotalCents / (1 + RENTAL_RENTER_FEE_PERCENT / 100),
  );
  const renterFeeCents = Math.max(0, buyerTotalCents - subtotalCents);
  const hostFeeCents = Math.round(subtotalCents * (RENTAL_HOST_FEE_PERCENT / 100));
  const sellerProceedsCents = Math.max(0, subtotalCents - hostFeeCents);

  const releaseAt = new Date(Date.now() + RENTAL_RELEASE_HOURS * 3_600_000).toISOString();

  return {
    reference: newPaymentReference("VB-RENT"),
    transactionType: depositCents > 0 && buyerTotalCents === depositCents
      ? "booking_deposit"
      : "rental",
    currency: "USD",
    grossCents: buyerTotalCents,
    platformFeeCents: renterFeeCents + hostFeeCents,
    taxCents: 0,
    depositCents,
    discountCents: 0,
    sellerProceedsCents,
    description: `Vendibook booking — ${listingTitle}`,
    breakdown: [
      { label: "Rental subtotal", amountCents: subtotalCents },
      { label: "Service fee", amountCents: renterFeeCents, kind: "fee" },
      ...(depositCents ? [{ label: "Refundable deposit", amountCents: depositCents }] : []),
    ],
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
      refunded_cents: record.refunded_cents ?? 0,
      net_payout_cents: record.seller_proceeds_cents,
      status: "pending_release",
      paid_at: record.captured_at ?? new Date().toISOString(),
      release_due_at: releaseAt,
      payout_eligible_at: releaseAt,
      payout_method: "dwolla_ach",
      payout_provider: "dwolla_future",
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
