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

type Action =
  | "ready_for_pickup"
  | "mark_shipped"
  | "mark_out_for_delivery"
  | "mark_delivered"
  | "set_eta"
  | "report_delay";

const ACTIVE_STATUSES = ["pending_cash", "paid", "buyer_confirmed", "seller_confirmed"];

/**
 * Forward-only milestones per handoff method. A pickup is never "shipped",
 * a delivery is never "ready for pickup", and nothing moves backwards.
 */
const PICKUP_STEPS = ["pending", "ready_for_pickup"];
const DELIVERY_STEPS = ["pending", "shipped", "out_for_delivery", "delivered"];
const ACTION_STATUS: Partial<Record<Action, string>> = {
  ready_for_pickup: "ready_for_pickup",
  mark_shipped: "shipped",
  mark_out_for_delivery: "out_for_delivery",
  mark_delivered: "delivered",
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function prettyDate(d: string): string {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
}

function etaLabel(start: string | null | undefined, end: string | null | undefined): string | null {
  if (!start) return null;
  if (end && end !== start) return `${prettyDate(start)}–${prettyDate(end)}`;
  return prettyDate(start);
}

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
      estimated_delivery_end?: string;
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
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (tx.seller_id !== user.id && !isAdmin) {
      return jsonError(403, "forbidden", "Only the seller can update fulfillment on this sale.");
    }
    const actorRole = tx.seller_id === user.id ? "seller" : "admin";
    if (!ACTIVE_STATUSES.includes(String(tx.status))) {
      return jsonError(409, "invalid_state", `This sale can't be updated while it is ${tx.status}.`);
    }

    const isDelivery = ["delivery", "vendibook_freight", "freight", "shipping"].includes(String(tx.fulfillment_type));
    const steps = isDelivery ? DELIVERY_STEPS : PICKUP_STEPS;
    const current = String(tx.shipping_status ?? "pending");

    // Delivery date: validated, recorded with history, buyer told on change.
    const etaStart = body.estimated_delivery_date ?? null;
    const etaEnd = body.estimated_delivery_end ?? null;
    if ((etaStart && !ISO_DATE.test(etaStart)) || (etaEnd && !ISO_DATE.test(etaEnd))) {
      return jsonError(400, "invalid_date", "Use a date like 2026-10-14.");
    }
    if (etaStart && etaEnd && etaEnd < etaStart) {
      return jsonError(400, "invalid_date", "The delivery window must end on or after it starts.");
    }
    if ((action === "set_eta" || action === "report_delay") && !etaStart) {
      return jsonError(400, "missing_fields", "Add the expected delivery date.");
    }
    if ((action === "set_eta" || action === "report_delay") && !isDelivery) {
      return jsonError(409, "invalid_action", "Delivery dates apply to delivered or shipped orders.");
    }

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {};
    const nextStatus = ACTION_STATUS[action] ?? null;

    if (nextStatus) {
      if (!steps.includes(nextStatus)) {
        return jsonError(409, "invalid_action",
          isDelivery
            ? "This order is being delivered, so it can't be marked ready for pickup."
            : "This order is a pickup. Mark it ready for pickup; the buyer confirms once they have it.");
      }
      const from = Math.max(0, steps.indexOf(current));
      if (steps.indexOf(nextStatus) < from) {
        return jsonError(409, "invalid_transition", `This order is already ${current.replace(/_/g, " ")}.`);
      }
      if (nextStatus !== current) patch.shipping_status = nextStatus;
      if (nextStatus === "shipped" || nextStatus === "out_for_delivery") patch.shipped_at = tx.shipped_at ?? now;
      if (nextStatus === "delivered") patch.delivered_at = tx.delivered_at ?? now;
      if (body.carrier) patch.carrier = body.carrier;
      if (body.tracking_number) patch.tracking_number = body.tracking_number;
      if (body.tracking_url) patch.tracking_url = body.tracking_url;
    } else if (action !== "set_eta" && action !== "report_delay") {
      return jsonError(400, "invalid_action", "That fulfillment action isn't supported.");
    }

    const oldEta = etaLabel(tx.estimated_delivery_date, tx.estimated_delivery_end);
    const newEta = etaStart ? etaLabel(etaStart, etaEnd) : oldEta;
    const etaChanged = !!etaStart && newEta !== oldEta;
    if (etaChanged) {
      patch.estimated_delivery_date = etaStart;
      patch.estimated_delivery_end = etaEnd && etaEnd !== etaStart ? etaEnd : null;
    }
    if (body.notes) patch.shipping_notes = body.notes;

    const statusChanged = "shipping_status" in patch;
    if (!Object.keys(patch).length) {
      return jsonResponse(200, { success: true, unchanged: true, shipping_status: current });
    }

    const { error: upErr } = await admin
      .from("sale_transactions")
      .update(patch)
      .eq("id", transaction_id);
    if (upErr) return jsonError(500, "update_failed", "We couldn't save that update. Please try again.");

    const history: Record<string, unknown>[] = [];
    if (statusChanged) {
      history.push({ kind: "status", from_value: current, to_value: patch.shipping_status, note: body.notes ?? null });
    }
    if (etaChanged) {
      history.push({
        kind: "eta",
        from_value: oldEta,
        to_value: newEta,
        note: action === "report_delay" ? (body.notes ?? "Delivery delayed") : (body.notes ?? null),
      });
    }
    if (history.length) {
      const { error: histErr } = await admin.from("sale_fulfillment_updates").insert(
        history.map((h) => ({ ...h, sale_transaction_id: transaction_id, actor_id: user.id, actor_role: actorRole })),
      );
      if (histErr) console.error("[sale-fulfillment-update] history not saved", histErr.message);
    }

    // Buyer-facing signals, only for real changes. Failures here never fail
    // the milestone write.
    const { data: listing } = await admin
      .from("listings").select("title, category").eq("id", tx.listing_id).maybeSingle();
    const title = listing?.title ?? "your purchase";
    const etaSentence = newEta ? ` Estimated delivery: ${newEta}.` : "";

    const notices: { title: string; message: string; key: string }[] = [];
    if (statusChanged) {
      const byStatus: Record<string, { title: string; message: string }> = {
        ready_for_pickup: {
          title: "Ready for pickup",
          message: `The seller marked "${title}" ready for pickup. Confirm pickup once you have it.`,
        },
        shipped: {
          title: "On the way",
          message: `"${title}" is on the way.${etaSentence} Track it from your order page.`,
        },
        out_for_delivery: {
          title: "Out for delivery",
          message: `"${title}" is out for delivery.${etaSentence} Track it from your order page.`,
        },
        delivered: {
          title: "Marked delivered",
          message: `The seller marked "${title}" delivered. Inspect it, then confirm receipt or report an issue.`,
        },
      };
      const n = byStatus[String(patch.shipping_status)];
      if (n) notices.push({ ...n, key: `sale-fulfillment:${transaction_id}:${patch.shipping_status}` });
    }
    if (etaChanged && !(statusChanged && notices.length && newEta)) {
      notices.push({
        title: action === "report_delay" ? "Delivery delayed" : "Delivery update",
        message: action === "report_delay"
          ? `Delivery of "${title}" is delayed. It is now expected ${newEta}.`
          : oldEta
          ? `"${title}" is now expected ${newEta}.`
          : `"${title}" is expected ${newEta}.`,
        key: `sale-eta:${transaction_id}:${newEta}`,
      });
    }

    for (const n of notices) {
      try {
        await admin.functions.invoke("create-notification", {
          body: {
            user_id: tx.buyer_id,
            type: "sale_fulfillment",
            title: n.title,
            message: n.message,
            link: `/transaction/${transaction_id}`,
            send_email: n.title === "Delivery delayed" || n.title === "Delivery update" || n.title === "Out for delivery",
          },
        });
      } catch (_e) { /* notification is best-effort */ }
    }

    const emailType = statusChanged && (patch.shipping_status === "shipped" || patch.shipping_status === "delivered")
      ? patch.shipping_status as "shipped" | "delivered"
      : null;
    if (emailType) {
      try {
        await admin.functions.invoke("send-sale-notification", {
          body: { transaction_id, notification_type: emailType, audience: "buyer" },
        });
      } catch (_e) { /* email is best-effort */ }
    }

    return jsonResponse(200, {
      success: true,
      shipping_status: patch.shipping_status ?? current,
      estimated_delivery: newEta,
    });
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
