import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { assertListingPurchasable } from "../_shared/listingGuard.ts";
import { resolveProStatus } from "../_shared/proEligibility.ts";
import { computeProSellerFee } from "../_shared/proFee.ts";

/**
 * Creates (or reuses) the PENDING sale_transactions row a PayPal order is
 * attached to. Money is never moved here — the row only becomes `paid`
 * after paypal-capture-order or the PayPal webhook verifies the capture.
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
    const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData?.user;
    if (!user) return jsonError(401, "unauthenticated", "Your session expired. Please sign in again.");

    const body = await req.json().catch(() => ({}));
    const listingId = body?.listing_id ? String(body.listing_id) : null;
    if (!listingId) return jsonError(400, "missing_fields", "Missing listing id.");

    const { data: listing } = await admin
      .from("listings")
      .select("id, title, host_id, price_sale, status, mode")
      .eq("id", listingId)
      .maybeSingle();

    if (!listing) return jsonError(404, "not_found", "That listing is no longer available.");
    const blocked = await assertListingPurchasable(admin, listing.id);
    if (blocked) return blocked;
    if (!listing.price_sale || Number(listing.price_sale) <= 0) {
      return jsonError(409, "not_for_sale", "This listing isn't for sale.");
    }
    if (listing.host_id === user.id) {
      return jsonError(403, "self_transaction", "You can't purchase your own listing.");
    }

    // AGREED PRICE: an accepted offer (or accepted counter) is the price both
    // sides agreed to. Resolved server-side — the browser never sets price.
    const { data: acceptedOffer } = await admin
      .from("offers")
      .select("offer_amount, counter_amount, updated_at")
      .eq("listing_id", listingId)
      .eq("buyer_id", user.id)
      .eq("status", "accepted")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const agreedAmount = acceptedOffer
      ? Number(acceptedOffer.counter_amount ?? acceptedOffer.offer_amount)
      : Number(listing.price_sale);
    const amount = Number.isFinite(agreedAmount) && agreedAmount > 0
      ? agreedAmount
      : Number(listing.price_sale);

    const fulfillmentTypeIn = body?.fulfillment_type ?? "pickup";
    const needsAddressIn = fulfillmentTypeIn === "delivery" ||
      fulfillmentTypeIn === "vendibook_freight";
    /** Fulfillment/contact fields are re-synced on reuse; money never is. */
    const mutableFields = {
      fulfillment_type: fulfillmentTypeIn,
      delivery_fee: Number(body?.delivery_fee ?? 0) || 0,
      freight_cost: Number(body?.freight_cost ?? 0) || 0,
      delivery_address: needsAddressIn ? (body?.delivery_address ?? null) : null,
      delivery_instructions: needsAddressIn ? (body?.delivery_instructions ?? null) : null,
      buyer_name: body?.buyer_name ?? null,
      buyer_email: body?.buyer_email ?? user.email ?? null,
      buyer_phone: body?.buyer_phone ?? null,
      referral_code: body?.referral_code ?? null,
      terms_id: body?.terms_id ?? null,
    };

    // Reuse any pending intent for this buyer + listing so a double click or a
    // refresh can never create two transactions. The fulfillment selection can
    // legitimately have changed since that row was created, so re-sync it —
    // otherwise the buyer would pay against a stale delivery amount.
    const { data: existing } = await admin
      .from("sale_transactions")
      .select("id, status, amount")
      .eq("listing_id", listingId)
      .eq("buyer_id", user.id)
      .in("status", ["pending"])
      .gt("created_at", new Date(Date.now() - 60 * 60_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      await admin
        .from("sale_transactions")
        .update(mutableFields)
        .eq("id", existing.id)
        .eq("status", "pending");
      return jsonResponse(200, { transaction_id: existing.id, reused: true, amount: Number(existing.amount) });
    }

    const { data: alreadyPaid } = await admin
      .from("sale_transactions")
      .select("id")
      .eq("listing_id", listingId)
      .eq("buyer_id", user.id)
      .in("status", ["paid", "buyer_confirmed", "seller_confirmed", "completed"])
      .limit(1)
      .maybeSingle();
    if (alreadyPaid) {
      return jsonError(409, "already_paid", "You've already completed a purchase for this listing.");
    }

    // COMMITMENT POINT: snapshot the seller fee that both sides agreed to.
    // Vendibook Pro eligibility is resolved here once; a later cancellation,
    // downgrade or upgrade never reprices this transaction.
    const proStatus = await resolveProStatus(admin, listing.host_id);
    const feeQuote = computeProSellerFee({
      baseCents: Math.round(amount * 100),
      isPro: proStatus.isPro,
    });
    const platformFee = feeQuote.feeCents / 100;

    const { data: created, error: insertErr } = await admin
      .from("sale_transactions")
      .insert({
        listing_id: listingId,
        buyer_id: user.id,
        seller_id: listing.host_id,
        amount,
        platform_fee: platformFee,
        seller_payout: Math.round((amount - platformFee) * 100) / 100,
        fee_rate_pct: feeQuote.effectiveRatePct,
        pro_discount: feeQuote.discountCents / 100,
        pro_fee_applied: feeQuote.proApplied,
        fee_locked_at: new Date().toISOString(),
        status: "pending",
        payment_provider: "paypal",
        ...mutableFields,
      })
      .select("id")
      .single();

    if (insertErr || !created) {
      return jsonError(500, "intent_failed", "We couldn't start this purchase. Please try again.");
    }

    return jsonResponse(200, { transaction_id: created.id, amount });

  } catch (err) {
    return unknownErrorResponse(err);
  }
});
