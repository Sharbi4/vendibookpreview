/**
 * Seller-driven fulfillment milestones for an equipment sale.
 *
 * `sale_transactions.tracking_number` / logistics columns are blocked for
 * end users by `trg_guard_sale_transaction_user_update`, so these writes run
 * server-side after an explicit ownership check. Payment status is never
 * touched here — only the fulfillment milestone — and a sale can never be
 * completed from this endpoint (that stays with `confirm-sale`).
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";

type Action = "ready_for_pickup" | "mark_shipped" | "mark_delivered";

const ACTIVE_STATUSES = ["pending_cash", "paid", "buyer_confirmed", "seller_confirmed"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError(401, "unauthenticated", "Please sign in to update this sale.");
    const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData?.user;
    if (!user) return jsonError(401, "unauthenticated", "Your session expired. Please sign in again.");

    const body = await req.json().catch(() => ({})) as {
      transaction_id?: string;
      action?: Action;
      carrier?: string;
      tracking_number?: string;
      tracking_url?: string;
      estimated_delivery_date?: string;
      notes?: string;
    };

    const { transaction_id, action } = body;
    if (!transaction_id || !action) {
      return jsonError(400, "missing_fields", "A transaction and an action are required.");
    }

    const { data: tx } = await admin
      .from("sale_transactions")
      .select("*")
      .eq("id", transaction_id)
      .maybeSingle();
    if (!tx) return jsonError(404, "not_found", "We couldn't find that sale.");
    if (tx.seller_id !== user.id) {
      return jsonError(403, "forbidden", "Only the seller can update fulfillment on this sale.");
    }
    if (!ACTIVE_STATUSES.includes(String(tx.status))) {
      return jsonError(409, "invalid_state", `This sale can't be updated while it is ${tx.status}.`);
    }

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {};
    let notification: "shipped" | "delivered" | null = null;

    if (action === "ready_for_pickup") {
      patch.shipping_status = "ready_for_pickup";
    } else if (action === "mark_shipped") {
      patch.shipping_status = "shipped";
      patch.shipped_at = tx.shipped_at ?? now;
      if (body.carrier) patch.carrier = body.carrier;
      if (body.tracking_number) patch.tracking_number = body.tracking_number;
      if (body.tracking_url) patch.tracking_url = body.tracking_url;
      if (body.estimated_delivery_date) patch.estimated_delivery_date = body.estimated_delivery_date;
      notification = "shipped";
    } else if (action === "mark_delivered") {
      patch.shipping_status = "delivered";
      patch.delivered_at = tx.delivered_at ?? now;
      notification = "delivered";
    } else {
      return jsonError(400, "invalid_action", "That fulfillment action isn't supported.");
    }
    if (body.notes) patch.shipping_notes = body.notes;

    const { error: upErr } = await admin
      .from("sale_transactions")
      .update(patch)
      .eq("id", transaction_id);
    if (upErr) return jsonError(500, "update_failed", "We couldn't save that update. Please try again.");

    // Buyer-facing signals. Failures here never fail the milestone write.
    const { data: listing } = await admin
      .from("listings").select("title").eq("id", tx.listing_id).maybeSingle();
    const title = listing?.title ?? "your purchase";

    const messages: Record<Action, { title: string; message: string }> = {
      ready_for_pickup: {
        title: "Ready for pickup",
        message: `The seller marked "${title}" ready for pickup. Confirm pickup once you have it.`,
      },
      mark_shipped: {
        title: "On the way",
        message: `"${title}" is on the way. Confirm receipt once it arrives.`,
      },
      mark_delivered: {
        title: "Marked delivered",
        message: `The seller marked "${title}" delivered. Confirm receipt to close the sale.`,
      },
    };

    try {
      await admin.functions.invoke("create-notification", {
        body: {
          user_id: tx.buyer_id,
          type: "sale_fulfillment",
          title: messages[action].title,
          message: messages[action].message,
          link: `/transaction/${transaction_id}`,
          send_email: false,
        },
      });
    } catch (_e) { /* notification is best-effort */ }

    if (notification) {
      try {
        await admin.functions.invoke("send-sale-notification", {
          body: { transaction_id, notification_type: notification },
        });
      } catch (_e) { /* email is best-effort */ }
    }

    return jsonResponse(200, { success: true, shipping_status: patch.shipping_status });
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
