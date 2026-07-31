import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { PayPalError, safeLog } from "../_shared/paypal.ts";
import { getPaymentProvider, PaymentProviderError } from "../_shared/payments/index.ts";
import { auditPayment, requestIp } from "../_shared/paymentAudit.ts";
import {
  quoteBookingRequest,
  quoteMonetizationProduct,
  quoteSaleTransaction,
  type QuoteResult,
} from "../_shared/paypalAccounting.ts";

/**
 * Creates a PayPal Orders v2 order for a Vendibook transaction.
 *
 * The browser sends ONLY an identifier. Every amount, fee, seller id and
 * listing id is re-derived server-side from the database.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError(401, "unauthenticated", "Please sign in to continue.");
    const { data: userData, error: userErr } = await admin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    const user = userData?.user;
    if (userErr || !user) {
      return jsonError(401, "unauthenticated", "Your session expired. Please sign in again.");
    }

    const body = await req.json().catch(() => ({}));
    const kind = String(body?.kind ?? "");
    const targetId = body?.id ? String(body.id) : null;

    let quote: QuoteResult;
    let saleTransactionId: string | null = null;
    let bookingRequestId: string | null = null;
    let monetizationPurchaseId: string | null = null;

    if (kind === "sale") {
      if (!targetId) return jsonError(400, "missing_fields", "Missing transaction id.");
      const { data: tx } = await admin
        .from("sale_transactions")
        .select("*, listing:listings(title)")
        .eq("id", targetId)
        .maybeSingle();
      if (!tx) return jsonError(404, "not_found", "We couldn't find that transaction.");
      if (tx.buyer_id !== user.id) {
        return jsonError(403, "forbidden", "You aren't the buyer on this transaction.");
      }
      if (tx.seller_id === user.id) {
        return jsonError(403, "self_transaction", "You can't purchase your own listing.");
      }
      quote = quoteSaleTransaction(tx, (tx as any).listing?.title ?? "Listing");
      saleTransactionId = tx.id;
    } else if (kind === "booking") {
      if (!targetId) return jsonError(400, "missing_fields", "Missing booking id.");
      const { data: booking } = await admin
        .from("booking_requests")
        .select("*, listing:listings(title)")
        .eq("id", targetId)
        .maybeSingle();
      if (!booking) return jsonError(404, "not_found", "We couldn't find that booking.");
      if (booking.shopper_id !== user.id) {
        return jsonError(403, "forbidden", "You aren't the guest on this booking.");
      }
      if (booking.host_id === user.id) {
        return jsonError(403, "self_transaction", "You can't book your own listing.");
      }
      quote = quoteBookingRequest(booking, (booking as any).listing?.title ?? "Listing");
      bookingRequestId = booking.id;
    } else if (kind === "product") {
      const slug = body?.slug ? String(body.slug) : null;
      if (!slug) return jsonError(400, "missing_fields", "Missing product slug.");
      const { data: product } = await admin
        .from("monetization_products")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (!product) return jsonError(404, "not_found", "That product is no longer available.");

      const now = Date.now();
      const promoActive = product.promo_price_cents &&
        (!product.promo_starts_at || new Date(product.promo_starts_at).getTime() <= now) &&
        (!product.promo_ends_at || new Date(product.promo_ends_at).getTime() >= now);
      const amountCents = promoActive ? product.promo_price_cents : product.price_cents;
      const discount = promoActive ? (product.price_cents - product.promo_price_cents) : 0;
      quote = quoteMonetizationProduct(product, amountCents, discount);
      quote.buyerId = user.id;

      const { data: purchase } = await admin
        .from("monetization_purchases")
        .insert({
          user_id: user.id,
          product_id: product.id,
          listing_id: body?.listing_id ?? null,
          amount_cents: amountCents,
          currency: product.currency ?? "USD",
          discount_applied_cents: discount,
          status: "pending",
          payment_provider: "paypal",
          idempotency_key: quote.reference,
        })
        .select("id")
        .maybeSingle();
      monetizationPurchaseId = purchase?.id ?? null;
    } else {
      return jsonError(400, "invalid_kind", "Unsupported checkout type.");
    }

    if (quote.grossCents <= 0) {
      return jsonError(400, "invalid_amount", "This transaction has no amount due.");
    }

    // Reuse an in-flight order for the same target so a double click or a
    // page refresh can never create two PayPal orders.
    const inflightFilter = saleTransactionId
      ? { column: "sale_transaction_id", value: saleTransactionId }
      : bookingRequestId
      ? { column: "booking_request_id", value: bookingRequestId }
      : null;

    if (inflightFilter) {
      const { data: existing } = await admin
        .from("payment_records")
        .select("id, reference, paypal_order_id, payment_status, gross_amount_cents")
        .eq(inflightFilter.column, inflightFilter.value)
        .in("payment_status", ["created", "approved"])
        .gt("created_at", new Date(Date.now() - 20 * 60_000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing?.paypal_order_id && existing.gross_amount_cents === quote.grossCents) {
        safeLog("reusing_inflight_order", { reference: existing.reference });
        return jsonResponse(200, {
          order_id: existing.paypal_order_id,
          reference: existing.reference,
          amount_cents: existing.gross_amount_cents,
          currency: quote.currency,
          breakdown: quote.breakdown,
          reused: true,
        });
      }

      const { data: alreadyPaid } = await admin
        .from("payment_records")
        .select("id")
        .eq(inflightFilter.column, inflightFilter.value)
        .eq("payment_status", "completed")
        .limit(1)
        .maybeSingle();
      if (alreadyPaid) {
        return jsonError(409, "already_paid", "This payment was already completed.");
      }
    }

    const { data: record, error: recordErr } = await admin
      .from("payment_records")
      .insert({
        reference: quote.reference,
        provider: "paypal",
        transaction_type: quote.transactionType,
        sale_transaction_id: saleTransactionId,
        booking_request_id: bookingRequestId,
        monetization_purchase_id: monetizationPurchaseId,
        listing_id: quote.listingId,
        buyer_id: quote.buyerId ?? user.id,
        seller_id: quote.sellerId,
        buyer_email: user.email ?? null,
        currency: quote.currency,
        gross_amount_cents: quote.grossCents,
        platform_fee_cents: quote.platformFeeCents,
        tax_cents: quote.taxCents,
        deposit_cents: quote.depositCents,
        discount_cents: quote.discountCents,
        seller_proceeds_cents: quote.sellerProceedsCents,
        payment_status: "created",
        internal_status: "awaiting_buyer_approval",
        idempotency_key: quote.reference,
        fee_breakdown: {
          lines: quote.breakdown,
          release_at: quote.releaseAt,
        },
      })
      .select()
      .single();

    if (recordErr || !record) {
      safeLog("record_insert_failed", { message: recordErr?.message });
      return jsonError(500, "record_failed", "We couldn't start this payment. Please try again.");
    }

    // Routed through the provider abstraction — no direct SDK calls here.
    const provider = getPaymentProvider();
    const order = await provider.createOrder({
      amount: { amountCents: quote.grossCents, currency: quote.currency },
      reference: quote.reference,
      description: quote.description,
      idempotencyKey: quote.reference,
      softDescriptor: "VENDIBOOK",
    });

    await admin
      .from("payment_records")
      .update({
        paypal_order_id: order.providerOrderId,
        metadata: { paypal_status: order.status },
      })
      .eq("id", record.id);

    await auditPayment(admin, {
      actorId: record.buyer_id,
      actorRole: "user",
      actorIp: requestIp(req),
      provider: provider.name,
      action: "order.created",
      entityType: "payment_record",
      entityId: record.id,
      reference: quote.reference,
      newValue: {
        provider_order_id: order.providerOrderId,
        amount_cents: quote.grossCents,
        currency: quote.currency,
      },
    });

    safeLog("order_created", { reference: quote.reference, orderId: order.providerOrderId });


    return jsonResponse(200, {
      order_id: order.providerOrderId,
      reference: quote.reference,
      amount_cents: quote.grossCents,
      currency: quote.currency,
      breakdown: quote.breakdown,
    });
  } catch (err) {
    if (err instanceof PaymentProviderError || err instanceof PayPalError) {
      const status = (err as { status?: number }).status ?? 502;
      return jsonError(
        status === 503 ? 503 : 502,
        status === 503 ? "provider_not_configured" : "provider_error",
        status === 503
          ? "Checkout isn't available right now."
          : "We couldn't reach the payment provider. Please try again in a moment.",
      );
    }
    return unknownErrorResponse(err);
  }
});
