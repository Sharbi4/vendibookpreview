import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { loadConciergeConfig, transitionOrder } from "../_shared/concierge.ts";
import { notifyUser } from "../_shared/notify.ts";

/**
 * Administrator work queue for the Listing Concierge.
 *
 * Admin-only. Internal notes and reviewer identity never leave this endpoint
 * for a seller. Publication is never performed here — only the seller can
 * approve and publish their own listing.
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
    if (!authHeader) return jsonError(401, "unauthenticated", "Please sign in.");
    const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData?.user;
    if (!user) return jsonError(401, "unauthenticated", "Your session expired.");
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return jsonError(403, "forbidden", "Administrator access required.");

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    // ------------------------------------------------------------- queue
    if (action === "list") {
      let q = admin
        .from("listing_concierge_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (body?.status) q = q.eq("status", String(body.status));
      if (body?.assigned_to_me === true) q = q.eq("assigned_reviewer_id", user.id);
      if (body?.paid_only !== false) q = q.eq("payment_status", "paid");
      const { data } = await q;
      return jsonResponse(200, { orders: data ?? [], config: await loadConciergeConfig(admin) });
    }

    // ------------------------------------------------------------ config
    if (action === "get_config") {
      return jsonResponse(200, { config: await loadConciergeConfig(admin) });
    }

    if (action === "save_config") {
      const patch: Record<string, unknown> = {};
      const c = body?.config ?? {};
      if (typeof c.is_available === "boolean") patch.is_available = c.is_available;
      if (Number.isFinite(c.price_cents) && c.price_cents > 0) {
        patch.price_cents = Math.round(Number(c.price_cents));
      }
      if (typeof c.currency === "string") patch.currency = c.currency.slice(0, 3).toUpperCase();
      if (Number.isFinite(c.turnaround_business_days)) {
        patch.turnaround_business_days = Math.max(1, Math.round(Number(c.turnaround_business_days)));
      }
      if (Number.isFinite(c.included_revisions)) {
        patch.included_revisions = Math.max(0, Math.round(Number(c.included_revisions)));
      }
      if (typeof c.specialist_contact_enabled === "boolean") {
        patch.specialist_contact_enabled = c.specialist_contact_enabled;
      }
      if (typeof c.terms_version === "string" && c.terms_version.trim()) {
        patch.terms_version = c.terms_version.trim().slice(0, 60);
      }
      if (c.copy && typeof c.copy === "object") patch.copy = c.copy;
      if (!Object.keys(patch).length) return jsonError(400, "missing_fields", "Nothing to update.");

      const { data } = await admin
        .from("listing_concierge_config")
        .update(patch)
        .eq("id", true)
        .select("*")
        .maybeSingle();
      return jsonResponse(200, { config: data });
    }

    const orderId = body?.order_id ? String(body.order_id) : "";
    if (!orderId) return jsonError(400, "missing_fields", "Missing order id.");
    const { data: order } = await admin
      .from("listing_concierge_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return jsonError(404, "not_found", "Order not found.");

    if (action === "get") {
      const [{ data: messages }, { data: events }, { data: agreements }] = await Promise.all([
        admin.from("listing_concierge_messages").select("*").eq("order_id", orderId)
          .order("created_at", { ascending: true }),
        admin.from("listing_concierge_events").select("*").eq("order_id", orderId)
          .order("created_at", { ascending: true }),
        admin.from("listing_concierge_agreements").select("*").eq("order_id", orderId)
          .order("accepted_at", { ascending: true }),
      ]);
      return jsonResponse(200, {
        order,
        messages: messages ?? [],
        events: events ?? [],
        agreements: agreements ?? [],
      });
    }

    if (action === "assign") {
      const reviewerId = body?.reviewer_id ? String(body.reviewer_id) : user.id;
      const updated = await transitionOrder(admin, {
        order,
        code: "reviewer_assigned",
        actorId: user.id,
        actorRole: "admin",
        patch: { assigned_reviewer_id: reviewerId },
      });
      return jsonResponse(200, { order: updated });
    }

    if (action === "save_notes") {
      const updated = await transitionOrder(admin, {
        order,
        code: "internal_note_saved",
        actorId: user.id,
        actorRole: "admin",
        patch: { internal_notes: String(body?.internal_notes ?? "").slice(0, 8000) },
      });
      return jsonResponse(200, { order: updated });
    }

    if (action === "request_info") {
      const text = String(body?.body ?? "").trim();
      if (!text) return jsonError(400, "missing_fields", "Write the question first.");
      await admin.from("listing_concierge_messages").insert({
        order_id: orderId,
        author_id: user.id,
        author_role: "admin",
        kind: "question",
        body: text.slice(0, 4000),
        internal: false,
      });
      const updated = await transitionOrder(admin, {
        order,
        to: "information_needed",
        code: "information_requested",
        actorId: user.id,
        actorRole: "admin",
      });
      await notifyUser(admin, {
        userId: order.user_id,
        type: "concierge",
        title: "We need a bit more information",
        message: "Your Listing Concierge order has a question waiting for you.",
        link: `/list/concierge/${orderId}`,
        dedupeKey: `concierge-question:${orderId}:${Date.now()}`,
      });
      return jsonResponse(200, { order: updated });
    }

    if (action === "internal_note_message") {
      await admin.from("listing_concierge_messages").insert({
        order_id: orderId,
        author_id: user.id,
        author_role: "admin",
        kind: "message",
        body: String(body?.body ?? "").slice(0, 4000),
        internal: true,
      });
      return jsonResponse(200, { ok: true });
    }

    if (action === "mark_ready") {
      if (!order.listing_id) {
        return jsonError(409, "no_draft", "Attach a draft listing before marking this ready.");
      }
      const updated = await transitionOrder(admin, {
        order,
        to: "ready_for_seller_review",
        code: "draft_delivered",
        actorId: user.id,
        actorRole: "admin",
        patch: {
          draft_delivered_at: new Date().toISOString(),
          reviewer_completed_at: new Date().toISOString(),
          reviewer_completed_by: user.id,
        },
      });
      await notifyUser(admin, {
        userId: order.user_id,
        type: "concierge",
        title: "Your listing draft is ready to review",
        message: "Review your draft and approve it when it looks right. Nothing publishes until you approve.",
        link: `/list/concierge/${orderId}`,
        dedupeKey: `concierge-ready:${orderId}:${order.revision_count}`,
      });
      return jsonResponse(200, { order: updated });
    }

    if (action === "cancel") {
      const updated = await transitionOrder(admin, {
        order,
        to: "canceled",
        code: "canceled",
        actorId: user.id,
        actorRole: "admin",
        patch: { canceled_at: new Date().toISOString() },
        metadata: { reason: body?.reason ?? null },
      });
      return jsonResponse(200, { order: updated });
    }

    // Refund runs through the existing verified PayPal refund endpoint —
    // never a database-only status flip.
    if (action === "refund") {
      if (!order.payment_record_id) {
        return jsonError(409, "not_captured", "This order has no captured payment to refund.");
      }
      const { data: result, error } = await admin.functions.invoke("paypal-refund", {
        body: {
          payment_record_id: order.payment_record_id,
          amount_cents: body?.amount_cents,
          reason: body?.reason ?? "Listing Concierge refund",
        },
        headers: { Authorization: authHeader },
      });
      if (error) return jsonError(502, "refund_failed", error.message ?? "PayPal refund failed.");

      const refundedCents = Number((result as Record<string, unknown>)?.refunded_cents ?? 0) ||
        Number(body?.amount_cents ?? order.price_cents);
      const total = (order.refunded_cents ?? 0) + refundedCents;
      const full = total >= order.price_cents;

      const updated = await transitionOrder(admin, {
        order,
        to: full ? "refunded" : undefined,
        code: "refund_recorded",
        actorId: user.id,
        actorRole: "admin",
        patch: {
          refunded_cents: total,
          refund_status: full ? "refunded" : "partially_refunded",
          refunded_at: new Date().toISOString(),
        },
        metadata: { amount_cents: refundedCents },
      });
      return jsonResponse(200, { order: updated, refund: result });
    }

    return jsonError(400, "invalid_action", "Unsupported action.");
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
