import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";

/**
 * Freight checkout for a for-sale transaction.
 *
 * Returns a Vendibook-hosted PayPal checkout URL. The freight amount and every
 * eligibility rule are re-derived server-side in `paypal-create-order`; the
 * amount below is display-only.
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
    const transactionId = body?.transaction_id ? String(body.transaction_id) : "";
    if (!transactionId) return jsonError(400, "missing_fields", "Transaction ID is required.");

    const { data: tx } = await admin
      .from("sale_transactions")
      .select("id, buyer_id, freight_cost, fulfillment_type, freight_payment_status, seller_confirmed_at")
      .eq("id", transactionId)
      .maybeSingle();
    if (!tx) return jsonError(404, "not_found", "We couldn't find that transaction.");
    if (tx.buyer_id !== user.id) {
      return jsonError(403, "forbidden", "Only the buyer can pay for freight.");
    }
    if (!tx.seller_confirmed_at) {
      return jsonError(409, "not_ready", "The seller must confirm the sale before freight can be paid.");
    }
    if (tx.fulfillment_type !== "vendibook_freight") {
      return jsonError(409, "not_applicable", "This order doesn't use Vendibook freight.");
    }
    if (tx.freight_payment_status === "paid") {
      return jsonError(409, "already_paid", "Freight has already been paid.");
    }

    const amountCents = Math.round(Number(tx.freight_cost ?? 0) * 100);
    if (amountCents <= 0) return jsonError(400, "invalid_amount", "There's no freight amount due.");

    const origin = req.headers.get("origin") ?? "https://vendibook.com";
    const success = `/order-tracking/${transactionId}?freight_paid=true`;
    const cancel = `/order-tracking/${transactionId}?freight_cancelled=true`;
    const url = `${origin}/checkout/pay?kind=freight&id=${encodeURIComponent(transactionId)}` +
      `&amount_cents=${amountCents}&label=${encodeURIComponent("Vendibook freight shipping")}` +
      `&success=${encodeURIComponent(success)}&cancel=${encodeURIComponent(cancel)}`;

    return jsonResponse(200, { url, provider: "paypal" });
  } catch (error) {
    return unknownErrorResponse(error);
  }
});
