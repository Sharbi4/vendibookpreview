import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";

/**
 * Featured Boost checkout.
 *
 * PayPal is the only live payment path. This endpoint keeps the historical
 * contract (`{ url }`) so every existing caller keeps working, but the URL now
 * points at Vendibook's own hosted PayPal checkout for the boost product.
 * Pricing comes from the catalog (`monetization_products`) — never from here.
 */

const FEATURED_PRODUCT_SLUG = "boost-featured-30";

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[CREATE-FEATURED-CHECKOUT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

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
    const listingId = body?.listing_id ? String(body.listing_id) : "";
    if (!listingId) return jsonError(400, "missing_fields", "Missing listing_id.");

    const { data: listing } = await admin
      .from("listings")
      .select("id, title, host_id, status, published_at, pending_featured_payment")
      .eq("id", listingId)
      .maybeSingle();
    if (!listing) return jsonError(404, "listing_not_found", "We couldn't find that listing.");
    if (listing.host_id !== user.id) {
      return jsonError(403, "not_owner", "You don't own this listing.");
    }

    const origin = req.headers.get("origin") ?? "https://vendibook.com";

    // A boost already paid for but not yet applied (listing was a draft) must
    // never be charged twice.
    const pendingPaid = listing.pending_featured_payment as
      | { session_id?: string; applied_at?: string }
      | null;
    if (pendingPaid?.session_id && !pendingPaid.applied_at) {
      logStep("pending_paid_boost", { listingId });
      return jsonResponse(200, {
        url: `${origin}/listing-published?listing_id=${listingId}&featured_paid=true&pending=true`,
        already_paid: true,
      });
    }

    // The wizard can request a boost while the row is still a draft.
    if (listing.status !== "published" || !listing.published_at) {
      const nowIso = new Date().toISOString();
      const { data: published, error: publishError } = await admin
        .from("listings")
        .update({ status: "published", published_at: listing.published_at ?? nowIso })
        .eq("id", listing.id)
        .eq("host_id", user.id)
        .select("id, status, published_at")
        .maybeSingle();
      if (publishError || published?.status !== "published") {
        return jsonError(
          409,
          "publish_failed",
          "We couldn't publish this listing before starting the boost. Please try again.",
        );
      }
      logStep("draft_published_before_checkout", { listingId });
    }

    const { data: product } = await admin
      .from("monetization_products")
      .select("slug")
      .eq("slug", FEATURED_PRODUCT_SLUG)
      .eq("is_active", true)
      .maybeSingle();
    if (!product) {
      return jsonError(409, "product_unavailable", "Featured Boost isn't available right now.");
    }

    const success = `/listing-published?listing_id=${listingId}&featured_paid=true`;
    const cancel = `/create-listing/${listingId}?featured_cancelled=true&step=review`;
    const url = `${origin}/checkout/product/${product.slug}` +
      `?listing_id=${encodeURIComponent(listingId)}` +
      `&success=${encodeURIComponent(success)}&cancel=${encodeURIComponent(cancel)}`;

    logStep("checkout_url_issued", { listingId });
    return jsonResponse(200, { url, provider: "paypal" });
  } catch (error) {
    return unknownErrorResponse(error);
  }
});
