/**
 * Redeem a Vendibook Pro monthly Featured Boost credit on one of the member's
 * own listings. No payment is taken: the credit is consumed and the standard
 * fulfilment path grants the same 30-day Featured Boost a paid purchase would.
 *
 * Idempotent-ish by construction: the credit can only be consumed once
 * (conditional update), so a double-click grants exactly one boost.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import {
  consumeBoostCredit,
  getAvailableBoostCredit,
} from "../_shared/proBoostCredit.ts";
import { fulfillMonetizationPurchase } from "../_shared/fulfillMonetizationPurchase.ts";

const BOOST_SLUG = "boost-featured-30";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return jsonError(401, "unauthorized", "Please sign in to use your boost credit.");

    const body = await req.json().catch(() => ({}));
    const listingId = body?.listing_id ? String(body.listing_id) : "";
    if (!listingId) return jsonError(400, "missing_fields", "Choose a listing to boost.");

    const { data: listing } = await admin
      .from("listings")
      .select("id, host_id, status, title")
      .eq("id", listingId)
      .maybeSingle();
    if (!listing) return jsonError(404, "not_found", "That listing no longer exists.");
    if (listing.host_id !== user.id) {
      return jsonError(403, "forbidden", "You can only boost your own listings.");
    }
    if (listing.status !== "published") {
      return jsonError(400, "not_published", "Publish the listing before boosting it.");
    }

    const credit = await getAvailableBoostCredit(admin, user.id);
    if (!credit) {
      return jsonError(
        409,
        "no_credit",
        "You've already used this month's Featured Boost credit. It renews with your next Vendibook Pro billing period.",
      );
    }

    const { data: product } = await admin
      .from("monetization_products")
      .select("id, slug, price_cents")
      .eq("slug", BOOST_SLUG)
      .maybeSingle();
    if (!product) return jsonError(500, "product_missing", "Featured Boost is unavailable right now.");

    // Claim the credit BEFORE granting, so a lost race can never double-grant.
    const claimed = await consumeBoostCredit(admin, credit.id, { listingId });
    if (!claimed) {
      return jsonError(409, "no_credit", "That boost credit was just used.");
    }

    const { data: purchase, error: purchaseError } = await admin
      .from("monetization_purchases")
      .insert({
        user_id: user.id,
        product_id: product.id,
        listing_id: listingId,
        amount_cents: 0,
        currency: "USD",
        status: "paid",
        payment_provider: "manual",
        metadata: {
          source: "vendibook_pro_boost_credit",
          credit_id: credit.id,
          period_end: credit.period_end,
        },
      })
      .select("id")
      .single();

    if (purchaseError || !purchase) {
      // Hand the credit back — the member wasn't charged and got nothing.
      await admin
        .from("pro_boost_credits")
        .update({ status: "available", used_at: null, listing_id: null })
        .eq("id", credit.id);
      return jsonError(500, "grant_failed", "We couldn't apply your boost. Please try again.");
    }

    await admin.from("pro_boost_credits").update({ purchase_id: purchase.id }).eq("id", credit.id);
    const result = await fulfillMonetizationPurchase(admin, purchase.id);

    return jsonResponse(200, {
      ok: true,
      fulfilled: result.fulfilled,
      listing_id: listingId,
      credit_period_end: credit.period_end,
    });
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
