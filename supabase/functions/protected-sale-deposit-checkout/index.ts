import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { assertListingPurchasable } from "../_shared/listingGuard.ts";

/**
 * Protected Sale deposit checkout.
 *
 * Returns a Vendibook-hosted PayPal checkout URL. The deposit amount and the
 * allowed sale statuses are re-validated in `paypal-create-order`, which also
 * advances the protected sale to `deposit_paid` once PayPal confirms capture.
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
    const protectedSaleId = body?.protected_sale_id ? String(body.protected_sale_id) : "";
    if (!protectedSaleId) return jsonError(400, "missing_fields", "Missing protected_sale_id.");

    const { data: ps } = await admin
      .from("protected_sales")
      .select("id, buyer_id, deposit_cents, status, sale_transaction_id, listing_id")
      .eq("id", protectedSaleId)
      .maybeSingle();
    if (!ps) return jsonError(404, "not_found", "We couldn't find that protected sale.");
    if (ps.buyer_id !== user.id) return jsonError(403, "forbidden", "You aren't the buyer on this sale.");
    if (ps.status !== "agreement_signed" && ps.status !== "id_verified") {
      return jsonError(409, "not_ready", "The deposit isn't collectable at this stage.");
    }
    if (!ps.deposit_cents || ps.deposit_cents <= 0) {
      return jsonError(400, "invalid_amount", "There's no deposit amount due.");
    }

    if (ps.listing_id) {
      const blocked = await assertListingPurchasable(admin, ps.listing_id);
      if (blocked) return blocked;
    }

    const origin = req.headers.get("origin") ?? "https://vendibook.com";
    const success = `/sale/${ps.sale_transaction_id}/protection?deposit=success`;
    const cancel = `/sale/${ps.sale_transaction_id}/protection?deposit=cancelled`;
    const url = `${origin}/checkout/pay?kind=protected_sale_deposit&id=${encodeURIComponent(ps.id)}` +
      `&amount_cents=${ps.deposit_cents}&label=${encodeURIComponent("Protected Sale deposit")}` +
      `&success=${encodeURIComponent(success)}&cancel=${encodeURIComponent(cancel)}`;

    return jsonResponse(200, { url, provider: "paypal" });
  } catch (error) {
    return unknownErrorResponse(error);
  }
});
