/**
 * Seller-facing alert for a payment outcome on their listing.
 *
 * Writes an in-app notification AND sends the seller an email whenever a
 * payment on their listing is approved (held), pending, or declined.
 * Never throws: an alert must never roll back or block a financial write.
 */

import { notifyUser } from "./notify.ts";
import { queueTransactionalEmail } from "./invokeTransactionalEmail.ts";
import { safeLog } from "./paypal.ts";

export type SellerPaymentOutcome = "approved" | "pending" | "declined";

const COPY: Record<SellerPaymentOutcome, { type: string; title: string; body: (ref: string) => string }> = {
  approved: {
    type: "payment_pending",
    title: "Payment approved on your listing",
    body: (ref) =>
      `PayPal approved the payment for order ${ref} and is holding the funds. Nothing is charged until the transaction is confirmed.`,
  },
  pending: {
    type: "payment_pending",
    title: "Payment pending on your listing",
    body: (ref) =>
      `PayPal is still reviewing the payment for order ${ref}. Please wait for confirmation before releasing the item or booking.`,
  },
  declined: {
    type: "payment_failed",
    title: "Payment declined on your listing",
    body: (ref) =>
      `The payment for order ${ref} was declined, so nothing was charged. The buyer can try again with another payment method.`,
  },
};

const usd = (cents: number | null | undefined, currency = "USD") =>
  cents == null
    ? null
    : new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);

export async function notifySellerPaymentOutcome(
  supabase: any,
  record: Record<string, any>,
  outcome: SellerPaymentOutcome,
  dedupeKey: string,
) {
  try {
    if (!record?.seller_id) return;
    const copy = COPY[outcome];
    const reference = record.reference ?? record.id;

    await notifyUser(supabase, {
      userId: record.seller_id,
      type: copy.type,
      title: copy.title,
      message: copy.body(reference),
      link: `/orders/${record.id}`,
      dedupeKey: `${dedupeKey}:seller-status`,
    });

    const { data: seller } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", record.seller_id)
      .maybeSingle();
    if (!seller?.email) return;

    let listingTitle: string | null = null;
    if (record.listing_id) {
      const { data: listing } = await supabase
        .from("listings")
        .select("title")
        .eq("id", record.listing_id)
        .maybeSingle();
      listingTitle = listing?.title ?? null;
    }

    queueTransactionalEmail({
      templateName: "seller-payment-status",
      recipientEmail: seller.email,
      idempotencyKey: `seller-payment-${outcome}:${dedupeKey}`,
      templateData: {
        sellerName: seller.full_name ?? undefined,
        listingTitle: listingTitle ?? undefined,
        orderNumber: record.reference ?? undefined,
        orderId: record.id,
        amount: usd(record.gross_amount_cents, record.currency ?? "USD") ?? undefined,
        outcome,
      },
      metadata: { payment_record_id: record.id, outcome },
    });
  } catch (err) {
    safeLog("seller_payment_alert_failed", { message: (err as Error).message });
  }
}
