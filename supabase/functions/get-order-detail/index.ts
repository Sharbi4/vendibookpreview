import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { buildOrderDetail, type ViewerRole } from "../_shared/orders/buildOrderDetail.ts";

/**
 * Single read endpoint behind /orders/:orderId.
 *
 * Ownership is resolved server-side from the authenticated user — a route
 * parameter alone is never trusted. Buyers see their own orders, admins see
 * everything, sellers see a reduced seller-facing view.
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
    if (!authHeader) return jsonError(401, "unauthenticated", "Please sign in to view this order.");
    const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData?.user;
    if (!user) return jsonError(401, "unauthenticated", "Your session expired. Please sign in again.");

    const body = await req.json().catch(() => ({}));
    const orderId: string | undefined = body.order_id;
    const paypalOrderId: string | undefined = body.paypal_order_id;
    const reference: string | undefined = body.reference;
    if (!orderId && !paypalOrderId && !reference) {
      return jsonError(400, "missing_fields", "An order identifier is required.");
    }

    let query = admin.from("payment_records").select("*");
    if (orderId) query = query.eq("id", orderId);
    else if (paypalOrderId) query = query.eq("paypal_order_id", paypalOrderId);
    else query = query.eq("reference", reference!);

    const { data: record } = await query.maybeSingle();
    if (!record) return jsonError(404, "not_found", "We couldn't find that order.");

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });

    let viewerRole: ViewerRole;
    if (record.buyer_id === user.id) viewerRole = "buyer";
    else if (isAdmin) viewerRole = "admin";
    else if (record.seller_id === user.id) viewerRole = "seller";
    else return jsonError(403, "forbidden", "This order belongs to another account.");

    const detail = await buildOrderDetail(admin, record, viewerRole);

    if (viewerRole !== "seller") {
      const { data: attempts } = await admin
        .from("payment_attempts")
        .select("id, attempt_number, status, failure_category, failure_code, failure_message_safe, created_at, completed_at")
        .eq("payment_record_id", record.id)
        .order("attempt_number", { ascending: false })
        .limit(10);
      detail.attempts = attempts ?? [];
    }

    if (viewerRole === "admin") {
      const { data: receipt } = await admin
        .from("payment_receipts")
        .select("*")
        .eq("payment_record_id", record.id)
        .maybeSingle();
      detail.receipt = receipt ?? null;
    }

    return jsonResponse(200, { order: detail });
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
