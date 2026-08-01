import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { assertListingPurchasable } from "../_shared/listingGuard.ts";

/**
 * Proof Notary checkout.
 *
 * Returns a Vendibook-hosted PayPal checkout URL. The $45 fee, ownership and
 * eligibility are re-validated server-side in `paypal-create-order`.
 */

const PROOF_NOTARY_FEE_CENTS = 4500;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError(401, "unauthenticated", "You must be signed in.");
    const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData?.user;
    if (!user) return jsonError(401, "unauthenticated", "Your session expired. Please sign in again.");

    const body = await req.json().catch(() => ({}));
    const listingId = body?.listing_id ? String(body.listing_id) : "";
    if (!listingId) return jsonError(400, "missing_fields", "Missing listing_id");

    const { data: listing } = await admin
      .from("listings")
      .select("id, title, host_id, proof_notary_enabled")
      .eq("id", listingId)
      .maybeSingle();
    if (!listing) return jsonError(404, "listing_not_found", "We couldn't find that listing.");
    if (listing.host_id !== user.id) return jsonError(403, "not_owner", "You do not own this listing.");
    if (!listing.proof_notary_enabled) {
      return jsonError(409, "feature_not_enabled", "Proof Notary is not enabled for this listing.");
    }

    const blocked = await assertListingPurchasable(admin, listing.id);
    if (blocked) return blocked;

    const origin = req.headers.get("origin") ?? "https://vendibook.com";
    const success = `/listing-published?listing_id=${listingId}&notary_paid=true`;
    const cancel = `/create-listing/${listingId}?notary_cancelled=true&step=review`;
    const url = `${origin}/checkout/pay?kind=notary&id=${encodeURIComponent(listingId)}` +
      `&amount_cents=${PROOF_NOTARY_FEE_CENTS}&label=${encodeURIComponent("Proof Notary")}` +
      `&success=${encodeURIComponent(success)}&cancel=${encodeURIComponent(cancel)}`;

    return jsonResponse(200, { url, provider: "paypal" });
  } catch (error) {
    return unknownErrorResponse(error);
  }
});
