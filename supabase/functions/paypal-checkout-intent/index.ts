import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { DEFAULT_SHORT_LEAD_MAX_DAYS, leadTimeDays } from "../_shared/payments/paymentStrategy.ts";

type CheckoutIntent = "CAPTURE" | "AUTHORIZE";

/** Returns the PayPal SDK intent without creating an order. */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError(401, "unauthenticated", "Please sign in to continue.");
    const { data: userData, error: userError } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData?.user;
    if (userError || !user) return jsonError(401, "unauthenticated", "Your session expired. Please sign in again.");

    const body = await req.json().catch(() => ({}));
    const kind = String(body?.kind ?? "");
    const id = body?.id ? String(body.id) : null;
    let intent: CheckoutIntent = "CAPTURE";

    if (kind === "sale") {
      if (!id) return jsonError(400, "missing_fields", "Missing transaction id.");
      const { data: sale } = await admin.from("sale_transactions")
        .select("buyer_id, seller_id, seller_confirmed_at").eq("id", id).maybeSingle();
      if (!sale) return jsonError(404, "not_found", "We couldn't find that transaction.");
      if (sale.buyer_id !== user.id) return jsonError(403, "forbidden", "You aren't the buyer on this transaction.");
      if (sale.seller_id === user.id) return jsonError(403, "self_transaction", "You can't purchase your own listing.");
      intent = sale.seller_confirmed_at ? "CAPTURE" : "AUTHORIZE";
    } else if (kind === "booking") {
      if (!id) return jsonError(400, "missing_fields", "Missing booking id.");
      const { data: booking } = await admin.from("booking_requests")
        .select("shopper_id, host_id, status, is_instant_book, start_date, start_time")
        .eq("id", id).maybeSingle();
      if (!booking) return jsonError(404, "not_found", "We couldn't find that booking.");
      if (booking.shopper_id !== user.id) return jsonError(403, "forbidden", "You aren't the guest on this booking.");
      if (booking.host_id === user.id) return jsonError(403, "self_transaction", "You can't book your own listing.");
      if (!booking.is_instant_book && booking.status !== "approved") {
        return jsonError(409, "payment_not_ready", "The host needs to approve this request before payment.");
      }
      const startAt = booking.start_date
        ? new Date(`${booking.start_date}T${booking.start_time ?? "00:00:00"}`).toISOString()
        : null;
      const lead = leadTimeDays(startAt, new Date());
      intent = lead === null || lead <= DEFAULT_SHORT_LEAD_MAX_DAYS ? "AUTHORIZE" : "CAPTURE";
    } else if (!["product", "freight", "notary", "protected_sale_deposit", "concierge"].includes(kind)) {
      return jsonError(400, "invalid_kind", "This payment type isn't supported.");
    }

    return jsonResponse(200, { intent });
  } catch (error) {
    return unknownErrorResponse(error, "We couldn't check payment availability. Please try again.");
  }
});