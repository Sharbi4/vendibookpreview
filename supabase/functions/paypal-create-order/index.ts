import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { PayPalError, safeLog } from "../_shared/paypal.ts";
import { getPaymentProvider, PaymentProviderError } from "../_shared/payments/index.ts";
import { auditPayment, requestIp } from "../_shared/paymentAudit.ts";
import { assertListingPurchasable } from "../_shared/listingGuard.ts";
import { resolveProStatus } from "../_shared/proEligibility.ts";
import {
  applyTaxToQuote,
  quoteBookingRequest,
  quoteMonetizationProduct,
  quoteSaleTransaction,
  quoteServiceCharge,
  type QuoteResult,
} from "../_shared/paypalAccounting.ts";
import {
  determinePaymentStrategy,
  type PaymentStrategyContext,
  type PaymentStrategyDecision,
} from "../_shared/payments/paymentStrategy.ts";
import {
  parseStateZipFromAddress,
  quoteSalesTax,
  type TaxDestination,
  type TaxKind,
} from "../_shared/tax.ts";

const NOTARY_FEE_CENTS = 4500;

/** Serializable tax snapshot included in every create-order response. */
const taxPayload = (quote: QuoteResult) => ({
  tax_cents: quote.taxCents,
  rate_pct: quote.taxRatePct ?? null,
  state: quote.taxState ?? null,
  source: quote.taxSource ?? null,
});

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
    /** Set for Vendibook service charges so the capture can fulfil them. */
    let fulfillment: Record<string, string> | null = null;
    /** Where the purchase is taxed — resolved per checkout kind below. */
    let taxDestination: TaxDestination = {};
    let taxKind: TaxKind = "service";
    /** Deposits toward a future sale are taxed on the sale itself, not here. */
    let skipTax = false;
    /**
     * Rental/sale context for the deterministic payment policy. Left null for
     * Vendibook-owned products and service charges, which always capture now.
     */
    let strategyContext: Omit<PaymentStrategyContext, "grossCents"> | null = null;

    /** Buyer profile location — used for Vendibook-owned products/services. */
    const buyerTaxLocation = async (): Promise<TaxDestination> => {
      const { data: profile } = await admin
        .from("profiles")
        .select("state, zip_code, city")
        .eq("id", user.id)
        .maybeSingle();
      return {
        state: profile?.state ?? null,
        zip: profile?.zip_code ?? null,
        city: profile?.city ?? null,
      };
    };

    if (kind === "sale") {
      if (!targetId) return jsonError(400, "missing_fields", "Missing transaction id.");
      const { data: tx } = await admin
        .from("sale_transactions")
        .select("*, listing:listings(title, city, state, address)")
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
      strategyContext = {
        mode: "sale",
        // Once the seller has confirmed there is nothing left to gate on, so
        // we charge outright. Otherwise PayPal holds the funds until they do.
        requiresSellerAcceptance: !tx.seller_confirmed_at,
      };
      taxKind = "sale";
      // Destination sourcing: delivery/freight tax where the goods land;
      // pickup/on-site tax where the listing sits.
      const listingLoc = (tx as any).listing ?? {};
      const listingLocParsed = parseStateZipFromAddress(listingLoc.address);
      const delivers = tx.fulfillment_type === "delivery" ||
        tx.fulfillment_type === "vendibook_freight";
      const parsed = delivers ? parseStateZipFromAddress(tx.delivery_address) : { state: null, zip: null };
      taxDestination = {
        state: parsed.state ?? listingLoc.state ?? null,
        zip: parsed.zip ?? listingLocParsed.zip ?? null,
        city: listingLoc.city ?? null,
      };
    } else if (kind === "booking") {
      if (!targetId) return jsonError(400, "missing_fields", "Missing booking id.");
      const { data: booking } = await admin
        .from("booking_requests")
        .select("*, listing:listings(title, city, state, address)")
        .eq("id", targetId)
        .maybeSingle();
      if (!booking) return jsonError(404, "not_found", "We couldn't find that booking.");
      if (booking.shopper_id !== user.id) {
        return jsonError(403, "forbidden", "You aren't the guest on this booking.");
      }
      if (booking.host_id === user.id) {
        return jsonError(403, "self_transaction", "You can't book your own listing.");
      }
      // COMMITMENT POINT for rentals: resolve Vendibook Pro once, lock the
      // host-side fee onto the booking, and never reprice it afterwards.
      const hostPro = booking.host_platform_fee !== null && booking.host_platform_fee !== undefined
        ? { isPro: !!booking.pro_fee_applied }
        : { isPro: (await resolveProStatus(admin, booking.host_id)).isPro };
      quote = quoteBookingRequest(booking, (booking as any).listing?.title ?? "Listing", hostPro);
      bookingRequestId = booking.id;
      strategyContext = {
        mode: "rent",
        instantBook: !!booking.is_instant_book,
        bookingStartAt: booking.start_date
          ? new Date(`${booking.start_date}T${booking.start_time ?? "00:00:00"}`).toISOString()
          : null,
        hostApproved: booking.status === "approved",
        hostDeclined: booking.status === "declined" || booking.status === "cancelled",
        securityDepositCents: Math.round(Number(booking.deposit_amount ?? 0) * 100),
      };
      taxKind = "rental";
      // Rentals are taxed where the rental happens — the listing's location.
      const bookingListingLoc = parseStateZipFromAddress((booking as any).listing?.address);
      taxDestination = {
        state: (booking as any).listing?.state ?? null,
        zip: bookingListingLoc.zip ?? null,
        city: (booking as any).listing?.city ?? null,
      };
      if (booking.host_platform_fee === null || booking.host_platform_fee === undefined) {
        await admin
          .from("booking_requests")
          .update({
            host_platform_fee: quote.platformFeeCents / 100,
            host_fee_rate_pct: quote.feeRatePct ?? null,
            host_pro_discount: (quote.proDiscountCents ?? 0) / 100,
            pro_fee_applied: !!quote.proFeeApplied,
            fee_locked_at: new Date().toISOString(),
          })
          .eq("id", booking.id)
          .is("host_platform_fee", null);
      }
    } else if (kind === "product") {
      const slug = body?.slug ? String(body.slug) : null;
      if (!slug) return jsonError(400, "missing_fields", "Missing product slug.");
      // Add-ons / boosts attached to a listing require a purchasable listing.
      if (body?.listing_id) {
        const blocked = await assertListingPurchasable(admin, String(body.listing_id));
        if (blocked) return blocked;
      }
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
      taxKind = "product";
      // Vendibook-owned products are taxed at the buyer's location.
      taxDestination = await buyerTaxLocation();

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
    } else if (kind === "freight") {
      if (!targetId) return jsonError(400, "missing_fields", "Missing transaction id.");
      const { data: tx } = await admin
        .from("sale_transactions")
        .select("*, listing:listings(title, city, state, address)")
        .eq("id", targetId)
        .maybeSingle();
      if (!tx) return jsonError(404, "not_found", "We couldn't find that transaction.");
      if (tx.buyer_id !== user.id) {
        return jsonError(403, "forbidden", "Only the buyer can pay for freight.");
      }
      if (!tx.seller_confirmed_at) {
        return jsonError(409, "not_ready", "The seller needs to confirm this sale before freight can be paid.");
      }
      if (tx.fulfillment_type !== "vendibook_freight") {
        return jsonError(409, "not_applicable", "This order doesn't use Vendibook freight.");
      }
      if (tx.freight_payment_status === "paid") {
        return jsonError(409, "already_paid", "Freight is already paid on this order.");
      }
      const freightCents = Math.round(Number(tx.freight_cost ?? 0) * 100);
      if (freightCents <= 0) return jsonError(400, "invalid_amount", "There's no freight amount due.");
      taxKind = "service";
      {
        const listingLoc = (tx as any).listing ?? {};
        const listingLocParsed = parseStateZipFromAddress(listingLoc.address);
        const parsed = parseStateZipFromAddress(tx.delivery_address);
        taxDestination = {
          state: parsed.state ?? listingLoc.state ?? null,
          zip: parsed.zip ?? listingLocParsed.zip ?? null,
          city: listingLoc.city ?? null,
        };
      }
      quote = quoteServiceCharge({
        prefix: "VB-FRT",
        transactionType: "freight",
        amountCents: freightCents,
        description: `Vendibook freight — ${(tx as any).listing?.title ?? "your order"}`,
        lineLabel: "Nationwide freight shipping",
        listingId: tx.listing_id ?? null,
        buyerId: user.id,
        sellerId: tx.seller_id ?? null,
      });
      fulfillment = { kind: "freight", sale_transaction_id: tx.id, key: `freight:${tx.id}` };
    } else if (kind === "notary") {
      if (!targetId) return jsonError(400, "missing_fields", "Missing listing id.");
      const { data: listing } = await admin
        .from("listings")
        .select("id, title, host_id, proof_notary_enabled, city, state, address")
        .eq("id", targetId)
        .maybeSingle();
      if (!listing) return jsonError(404, "not_found", "We couldn't find that listing.");
      if (listing.host_id !== user.id) {
        return jsonError(403, "forbidden", "You don't own this listing.");
      }
      // NOTE: we deliberately do NOT require `proof_notary_enabled` here — that
      // column is the *paid entitlement*, granted only by a verified capture.
      // The owner buys the add-on while it is still off; a second purchase of an
      // already-active add-on is the only thing worth refusing.
      if (listing.proof_notary_enabled) {
        return jsonError(409, "already_active", "Proof Notary is already active on this listing.");
      }
      taxKind = "service";
      // The notary service is performed at the listing.
      const notaryLoc = parseStateZipFromAddress(listing.address);
      taxDestination = {
        state: listing.state ?? null,
        zip: notaryLoc.zip ?? null,
        city: listing.city ?? null,
      };
      quote = quoteServiceCharge({
        prefix: "VB-NOT",
        transactionType: "addon",
        amountCents: NOTARY_FEE_CENTS,
        description: `Vendibook Proof Notary — ${listing.title}`,
        lineLabel: "Proof Notary (notarized bill of sale)",
        listingId: listing.id,
        buyerId: user.id,
      });
      fulfillment = { kind: "notary", listing_id: listing.id, key: `notary:${listing.id}` };
    } else if (kind === "concierge") {
      if (!targetId) return jsonError(400, "missing_fields", "Missing concierge order id.");
      const { data: order } = await admin
        .from("listing_concierge_orders")
        .select("*")
        .eq("id", targetId)
        .maybeSingle();
      if (!order) return jsonError(404, "not_found", "We couldn't find that concierge order.");
      if (order.user_id !== user.id) {
        return jsonError(403, "forbidden", "This concierge order belongs to another account.");
      }
      if (order.payment_status === "paid") {
        return jsonError(409, "already_paid", "This concierge order is already paid.");
      }
      if (order.status !== "payment_required") {
        return jsonError(409, "not_ready", "This concierge order isn't awaiting payment.");
      }
      if (!order.price_cents || order.price_cents <= 0) {
        return jsonError(400, "invalid_amount", "This concierge order has no amount due.");
      }
      taxKind = "service";
      // Concierge is a Vendibook service billed to the seller — their location.
      taxDestination = await buyerTaxLocation();
      quote = quoteServiceCharge({
        prefix: "VB-CON",
        transactionType: "addon",
        amountCents: order.price_cents,
        description: "VendiBook Listing Concierge — listing preparation service",
        lineLabel: "VendiBook Listing Concierge",
        listingId: null,
        buyerId: user.id,
      });
      fulfillment = {
        kind: "concierge",
        concierge_order_id: order.id,
        key: `concierge:${order.id}`,
      };
    } else if (kind === "protected_sale_deposit") {

      if (!targetId) return jsonError(400, "missing_fields", "Missing protected sale id.");
      const { data: ps } = await admin
        .from("protected_sales")
        .select("id, buyer_id, deposit_cents, status, sale_transaction_id, listing_id")
        .eq("id", targetId)
        .maybeSingle();
      if (!ps) return jsonError(404, "not_found", "We couldn't find that protected sale.");
      if (ps.buyer_id !== user.id) return jsonError(403, "forbidden", "You aren't the buyer on this sale.");
      if (ps.status !== "agreement_signed" && ps.status !== "id_verified") {
        return jsonError(409, "not_ready", "The deposit isn't collectable at this stage.");
      }
      if (!ps.deposit_cents || ps.deposit_cents <= 0) {
        return jsonError(400, "invalid_amount", "There's no deposit amount due.");
      }
      // A deposit is a partial payment toward the protected sale — the sale
      // itself carries the tax, so collecting tax here would double-charge.
      skipTax = true;
      quote = quoteServiceCharge({
        prefix: "VB-DEP",
        transactionType: "booking_deposit",
        amountCents: ps.deposit_cents,
        description: "Vendibook Protected Sale — deposit",
        lineLabel: "Protected Sale deposit",
        listingId: ps.listing_id ?? null,
        buyerId: user.id,
        depositCents: ps.deposit_cents,
      });
      fulfillment = {
        kind: "protected_sale_deposit",
        protected_sale_id: ps.id,
        sale_transaction_id: ps.sale_transaction_id ?? "",
        key: `protected_sale_deposit:${ps.id}`,
      };
    } else {
      return jsonError(400, "invalid_kind", "Unsupported checkout type.");
    }

    // Canonical availability re-check immediately before any provider call.
    // Never rely on the UI having hidden the button.
    if (quote.listingId) {
      const blocked = await assertListingPurchasable(admin, quote.listingId);
      if (blocked) return blocked;
    }

    // ── Sales tax (marketplace facilitator model) ─────────────────────────
    // Computed authoritatively here via _shared/tax.ts (TaxJar when
    // configured, state table fallback). Tax rides on top of the merchandise /
    // rental / service amount — it is NEVER part of the seller payout or the
    // commission base, and is booked to `tax_collected` at capture.
    if (!skipTax) {
      const tax = await quoteSalesTax({
        amountCents: quote.taxableBaseCents,
        destination: taxDestination,
        kind: taxKind,
      });
      applyTaxToQuote(quote, tax);

      // Persist the tax snapshot on the business record so receipts, order
      // detail pages, and accounting all read the same numbers.
      const taxSnapshot = {
        tax_rate_pct: tax.ratePct,
        tax_source: tax.source,
        tax_jurisdiction: tax.state,
      };
      if (saleTransactionId) {
        await admin.from("sale_transactions")
          .update({ ...taxSnapshot, tax_amount: tax.taxCents / 100 })
          .eq("id", saleTransactionId);
      }
      if (bookingRequestId) {
        await admin.from("booking_requests")
          .update({ ...taxSnapshot, tax_amount: tax.taxCents / 100 })
          .eq("id", bookingRequestId);
      }
      if (monetizationPurchaseId) {
        await admin.from("monetization_purchases")
          .update({ ...taxSnapshot, tax_cents: tax.taxCents })
          .eq("id", monetizationPurchaseId);
      }
    }

    if (quote.grossCents <= 0) {
      return jsonError(400, "invalid_amount", "This transaction has no amount due.");
    }

    // ── Payment policy ───────────────────────────────────────────────────
    // Decided server-side only. The browser never chooses whether money is
    // captured now or merely authorized (a temporary PayPal hold).
    const decision: PaymentStrategyDecision = strategyContext
      ? determinePaymentStrategy({ ...strategyContext, grossCents: quote.grossCents })
      : determinePaymentStrategy({ mode: "sale", grossCents: quote.grossCents, requiresSellerAcceptance: false });

    if (decision.blocked) {
      return jsonError(409, "payment_not_ready", decision.buyerMessage);
    }

    // Reuse an in-flight order for the same target so a double click or a
    // page refresh can never create two PayPal orders.
    const inflightFilter = saleTransactionId
      ? { column: "sale_transaction_id", value: saleTransactionId }
      : bookingRequestId
      ? { column: "booking_request_id", value: bookingRequestId }
      : null;

    if (fulfillment) {
      const { data: paidAlready } = await admin
        .from("payment_records")
        .select("id")
        .eq("fee_breakdown->fulfillment->>key", fulfillment.key)
        .eq("payment_status", "completed")
        .limit(1)
        .maybeSingle();
      if (paidAlready) return jsonError(409, "already_paid", "This payment was already completed.");

      const { data: inflight } = await admin
        .from("payment_records")
        .select("id, reference, paypal_order_id, gross_amount_cents")
        .eq("fee_breakdown->fulfillment->>key", fulfillment.key)
        .in("payment_status", ["created", "approved"])
        .gt("created_at", new Date(Date.now() - 20 * 60_000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (inflight?.paypal_order_id && inflight.gross_amount_cents === quote.grossCents) {
        return jsonResponse(200, {
          order_id: inflight.paypal_order_id,
          reference: inflight.reference,
          amount_cents: inflight.gross_amount_cents,
          currency: quote.currency,
          breakdown: quote.breakdown,
          tax: taxPayload(quote),
          payment_intent: decision.intent,
          payment_strategy: decision.strategy,
          reused: true,
        });
      }
    }

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
          tax: taxPayload(quote),
          payment_intent: decision.intent,
          payment_strategy: decision.strategy,
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
        fee_rate_pct: quote.feeRatePct ?? null,
        pro_discount_cents: quote.proDiscountCents ?? 0,
        pro_fee_applied: !!quote.proFeeApplied,
        tax_cents: quote.taxCents,
        deposit_cents: quote.depositCents,
        discount_cents: quote.discountCents,
        seller_proceeds_cents: quote.sellerProceedsCents,
        payment_status: "created",
        internal_status: "awaiting_buyer_approval",
        payment_strategy: decision.strategy,
        payment_intent: decision.intent,
        balance_due_cents: decision.balanceDueCents || null,
        balance_due_at: decision.balanceDueAt,
        idempotency_key: quote.reference,
        fee_breakdown: {
          lines: quote.breakdown,
          release_at: quote.releaseAt,
          ...(fulfillment ? { fulfillment } : {}),
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
      intent: decision.intent === "AUTHORIZE" ? "AUTHORIZE" : "CAPTURE",
      // Itemized amounts must reconcile exactly with the order total.
      breakdown: quote.taxCents > 0
        ? { itemTotalCents: quote.grossCents - quote.taxCents, taxCents: quote.taxCents }
        : undefined,
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
      tax: taxPayload(quote),
      payment_intent: decision.intent,
      payment_strategy: decision.strategy,
      buyer_message: decision.buyerMessage,
      balance_due_cents: decision.balanceDueCents,
      balance_due_at: decision.balanceDueAt,
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
