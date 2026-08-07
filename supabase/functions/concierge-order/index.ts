import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import {
  type ConciergeStatus,
  loadConciergeConfig,
  logConciergeEvent,
  requestIp,
  sellerMayTransition,
  transitionOrder,
} from "../_shared/concierge.ts";
import { notifyUser } from "../_shared/notify.ts";

/**
 * Seller-facing Listing Concierge order API.
 *
 * Every action is authenticated and scoped to the caller's own order. Price,
 * availability, terms version, revision limits and status transitions are all
 * re-derived server-side; nothing the browser sends is trusted.
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
    const action = String(body?.action ?? "");
    const config = await loadConciergeConfig(admin);

    const loadOrder = async (id: string) => {
      const { data } = await admin
        .from("listing_concierge_orders")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!data) return { error: jsonError(404, "not_found", "We couldn't find that concierge order.") };
      if (data.user_id !== user.id) {
        return { error: jsonError(403, "forbidden", "This order belongs to another account.") };
      }
      return { order: data };
    };

    // ------------------------------------------------------------- create
    if (action === "create") {
      if (!config.is_available) {
        return jsonError(409, "unavailable", "The Listing Concierge isn't accepting new orders right now.");
      }
      if (body?.agreement_accepted !== true) {
        return jsonError(400, "agreement_required", "Please accept the Concierge Service Terms to continue.");
      }

      // One in-flight unpaid order per seller per terms version, so a refresh
      // or a double click can never create two orders or two charges.
      const idempotencyKey = String(body?.idempotency_key ?? "").slice(0, 120) ||
        `concierge:${config.terms_version}`;

      const { data: existing } = await admin
        .from("listing_concierge_orders")
        .select("*")
        .eq("user_id", user.id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existing) return jsonResponse(200, { order: existing, reused: true });

      const { data: order, error } = await admin
        .from("listing_concierge_orders")
        .insert({
          user_id: user.id,
          price_cents: config.price_cents,
          currency: config.currency,
          revisions_included: config.included_revisions,
          idempotency_key: idempotencyKey,
          config_snapshot: config,
          status: "payment_required",
        })
        .select("*")
        .maybeSingle();

      if (error || !order) {
        // Unique-violation race: return the winner instead of failing.
        const { data: raced } = await admin
          .from("listing_concierge_orders")
          .select("*")
          .eq("user_id", user.id)
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();
        if (raced) return jsonResponse(200, { order: raced, reused: true });
        return jsonError(500, "create_failed", "We couldn't start that order. Please try again.");
      }

      await admin.from("listing_concierge_agreements").insert({
        order_id: order.id,
        user_id: user.id,
        agreement_kind: "concierge_service_terms",
        agreement_version: config.terms_version,
        ip_address: requestIp(req),
        user_agent: req.headers.get("user-agent"),
      });

      await logConciergeEvent(admin, {
        orderId: order.id,
        code: "order_created",
        actorId: user.id,
        actorRole: "seller",
        toStatus: "payment_required",
        metadata: { terms_version: config.terms_version },
      });

      return jsonResponse(200, { order });
    }

    const orderId = body?.order_id ? String(body.order_id) : "";
    if (!orderId) return jsonError(400, "missing_fields", "Missing order id.");
    const loaded = await loadOrder(orderId);
    if (loaded.error) return loaded.error;
    const order = loaded.order!;

    // ---------------------------------------------------------------- get
    if (action === "get") {
      const [{ data: messages }, { data: events }] = await Promise.all([
        admin
          .from("listing_concierge_messages")
          .select("id, author_role, kind, body, answered_at, created_at")
          .eq("order_id", order.id)
          .eq("internal", false)
          .order("created_at", { ascending: true }),
        admin
          .from("listing_concierge_events")
          .select("id, code, from_status, to_status, created_at")
          .eq("order_id", order.id)
          .order("created_at", { ascending: true }),
      ]);

      // Never leak private internal notes or the reviewer's identity.
      const { internal_notes: _notes, assigned_reviewer_id: _rev, ...safeOrder } = order;

      return jsonResponse(200, {
        order: safeOrder,
        config,
        messages: messages ?? [],
        events: events ?? [],
        human_reviewed: !!order.reviewer_completed_at,
      });
    }

    if (order.payment_status !== "paid") {
      return jsonError(409, "payment_required", "This order isn't paid yet.");
    }

    // -------------------------------------------------------- save intake
    if (action === "save_intake") {
      const intake = typeof body?.intake === "object" && body.intake ? body.intake : {};
      const to: ConciergeStatus | undefined =
        order.status === "intake_not_started" ? "intake_in_progress" : undefined;
      const updated = await transitionOrder(admin, {
        order,
        to,
        code: "intake_saved",
        actorId: user.id,
        actorRole: "seller",
        patch: {
          intake,
          intake_version: (order.intake_version ?? 1) + 1,
          specialist_contact_requested: config.specialist_contact_enabled
            ? body?.specialist_contact_requested === true
            : false,
          contact_method: body?.contact_method ? String(body.contact_method).slice(0, 60) : order.contact_method,
          contact_availability: body?.contact_availability
            ? String(body.contact_availability).slice(0, 300)
            : order.contact_availability,
          uploads: Array.isArray(body?.uploads) ? body.uploads.slice(0, 60) : order.uploads,
        },
      });
      return jsonResponse(200, { order: updated });
    }

    // ------------------------------------------------------ submit intake
    if (action === "submit_intake") {
      if (!sellerMayTransition(order.status, "listing_being_created")) {
        return jsonError(409, "invalid_transition", "This order isn't at the intake stage.");
      }
      const updated = await transitionOrder(admin, {
        order,
        to: "listing_being_created",
        code: "intake_submitted",
        actorId: user.id,
        actorRole: "seller",
        patch: { intake_submitted_at: new Date().toISOString() },
      });
      await notifyUser(admin, {
        userId: user.id,
        type: "concierge",
        title: "Intake received",
        message:
          `Thanks — we have what we need to start. Estimated turnaround is ${config.turnaround_business_days} business days from a complete intake.`,
        link: `/list/concierge/${order.id}`,
        dedupeKey: `concierge-intake:${order.id}:${order.intake_version}`,
      });
      return jsonResponse(200, { order: updated });
    }

    // ----------------------------------------------------- answer message
    if (action === "answer") {
      const text = String(body?.body ?? "").trim();
      if (!text) return jsonError(400, "missing_fields", "Please write a response first.");
      await admin.from("listing_concierge_messages").insert({
        order_id: order.id,
        author_id: user.id,
        author_role: "seller",
        kind: "answer",
        body: text.slice(0, 4000),
        internal: false,
      });
      const updated = order.status === "information_needed"
        ? await transitionOrder(admin, {
          order,
          to: "listing_being_created",
          code: "seller_answered",
          actorId: user.id,
          actorRole: "seller",
        })
        : order;
      return jsonResponse(200, { order: updated });
    }

    // ---------------------------------------------------- request revision
    if (action === "request_revision") {
      if (!sellerMayTransition(order.status, "revision_requested")) {
        return jsonError(409, "invalid_transition", "There's no draft awaiting your review right now.");
      }
      if ((order.revision_count ?? 0) >= (order.revisions_included ?? 1)) {
        return jsonError(
          409,
          "revision_limit",
          `Your order includes ${order.revisions_included} revision. Message us if you need more help.`,
        );
      }
      const note = String(body?.body ?? "").trim();
      if (!note) return jsonError(400, "missing_fields", "Tell us what you'd like changed.");
      await admin.from("listing_concierge_messages").insert({
        order_id: order.id,
        author_id: user.id,
        author_role: "seller",
        kind: "revision_request",
        body: note.slice(0, 4000),
        internal: false,
      });
      const updated = await transitionOrder(admin, {
        order,
        to: "revision_requested",
        code: "revision_requested",
        actorId: user.id,
        actorRole: "seller",
        patch: {
          revision_count: (order.revision_count ?? 0) + 1,
          revision_requested_at: new Date().toISOString(),
        },
      });
      return jsonResponse(200, { order: updated });
    }

    // --------------------------------------------------- approve + publish
    if (action === "approve_publish") {
      if (!sellerMayTransition(order.status, "approved_for_publication")) {
        return jsonError(409, "invalid_transition", "There's no draft awaiting your approval.");
      }
      const required = ["ownership_authority", "accuracy", "condition", "marketplace_rules", "electronic_consent"];
      const accepted: string[] = Array.isArray(body?.agreements) ? body.agreements.map(String) : [];
      const missing = required.filter((k) => !accepted.includes(k));
      if (missing.length) {
        return jsonError(400, "agreement_required", "Please confirm every statement before publishing.");
      }
      if (!order.listing_id) {
        return jsonError(409, "not_ready", "Your listing draft isn't ready yet.");
      }

      const nowIso = new Date().toISOString();
      await admin.from("listing_concierge_agreements").insert(
        required.map((kind) => ({
          order_id: order.id,
          user_id: user.id,
          agreement_kind: kind,
          agreement_version: config.terms_version,
          ip_address: requestIp(req),
          user_agent: req.headers.get("user-agent"),
        })),
      );

      await transitionOrder(admin, {
        order,
        to: "approved_for_publication",
        code: "seller_approved",
        actorId: user.id,
        actorRole: "seller",
        patch: { approved_at: nowIso },
      });

      const { error: pubErr } = await admin
        .from("listings")
        .update({ status: "published", published_at: nowIso })
        .eq("id", order.listing_id)
        .eq("host_id", user.id);

      if (pubErr) {
        return jsonError(
          409,
          "publish_failed",
          pubErr.message ||
            "We couldn't publish this listing yet. Your approval is saved — our team will finish it.",
        );
      }

      const { data: fresh } = await admin
        .from("listing_concierge_orders")
        .select("*")
        .eq("id", order.id)
        .maybeSingle();

      const published = await transitionOrder(admin, {
        order: fresh ?? order,
        to: "published",
        code: "published",
        actorId: user.id,
        actorRole: "seller",
        patch: { published_at: nowIso },
      });

      return jsonResponse(200, { order: published, listing_id: order.listing_id });
    }

    return jsonError(400, "invalid_action", "Unsupported action.");
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
