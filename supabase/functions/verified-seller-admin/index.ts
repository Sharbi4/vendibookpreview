import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  corsHeaders,
  jsonError,
  jsonResponse,
  unknownErrorResponse,
} from "../_shared/jsonError.ts";
import {
  captureAuthorizationOnce,
  capturedPayment,
  ensureVerification,
  latestOpenPayment,
  log,
  reconcileVerification,
  refundPaymentOnce,
  voidAuthorizationOnce,
} from "../_shared/verifiedSeller.ts";
import { isBadgeEligible, VERIFIED_SELLER } from "../_shared/verifiedSellerLogic.ts";

/**
 * Verified Seller — admin operations.
 *
 * Exposes sanitized operational data and safe recovery actions. Never returns
 * Plaid PII, documents, or provider secrets — only IDs, states, timestamps and
 * status codes support needs to resolve a case.
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
    const actor = userData?.user;
    if (!actor) return jsonError(401, "unauthenticated", "Your session expired.");

    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: actor.id,
      _role: "admin",
    });
    if (!isAdmin) return jsonError(403, "forbidden", "Admins only.");

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "list");
    const targetUserId = body?.user_id ? String(body.user_id) : null;

    // -------------------------------------------------------------- list
    if (action === "list") {
      const statusFilter = body?.status ? String(body.status) : null;
      const paymentFilter = body?.payment_state ? String(body.payment_state) : null;

      let query = admin
        .from("seller_verifications")
        .select(
          "user_id, status, identity_status, payment_state, verified_at, revoked_at, revoked_reason, retry_count, retry_allowance, last_reason_code, current_attempt_id, created_at, updated_at",
        )
        .order("updated_at", { ascending: false })
        .limit(200);
      if (statusFilter) query = query.eq("status", statusFilter);
      if (paymentFilter) query = query.eq("payment_state", paymentFilter);

      const { data: rows } = await query;
      const ids = (rows ?? []).map((r: { user_id: string }) => r.user_id);
      const { data: profiles } = ids.length
        ? await admin.from("profiles").select("id, email, first_name, last_name").in("id", ids)
        : { data: [] };
      const byId = new Map(
        (profiles ?? []).map((p: { id: string }) => [p.id, p]),
      );

      return jsonResponse(200, {
        rows: (rows ?? []).map((r: Record<string, unknown>) => ({
          ...r,
          badge_active: isBadgeEligible(r as never),
          profile: byId.get(r.user_id as string) ?? null,
        })),
      });
    }

    if (!targetUserId) return jsonError(400, "missing_fields", "Missing user id.");
    const record = await ensureVerification(admin, targetUserId);

    // ------------------------------------------------------------ detail
    if (action === "detail") {
      const [{ data: attempts }, { data: payments }, { data: terms }, { data: events }] =
        await Promise.all([
          admin.from("seller_verification_attempts").select(
            "plaid_verification_id, previous_verification_id, status, reason_code, request_id, completed_at, created_at",
          ).eq("user_id", targetUserId).order("created_at", { ascending: false }),
          admin.from("seller_verification_payments").select(
            "id, reference, state, amount_cents, currency, paypal_order_id, paypal_authorization_id, paypal_capture_id, paypal_refund_id, error_code, authorized_at, captured_at, voided_at, refunded_at, created_at",
          ).eq("user_id", targetUserId).order("created_at", { ascending: false }),
          admin.from("seller_verification_terms").select(
            "terms_version, accepted_at, ip_address",
          ).eq("user_id", targetUserId).order("accepted_at", { ascending: false }),
          admin.from("seller_verification_events").select(
            "provider, event_type, verification_id, outcome, processed_at",
          ).eq("user_id", targetUserId).order("processed_at", { ascending: false }).limit(50),
        ]);

      return jsonResponse(200, {
        record: { ...record, badge_active: isBadgeEligible(record) },
        attempts: attempts ?? [],
        payments: payments ?? [],
        terms: terms ?? [],
        events: events ?? [],
      });
    }

    // ----------------------------------------------------------- refresh
    if (action === "refresh") {
      const result = await reconcileVerification(admin, targetUserId);
      return jsonResponse(200, { ok: true, ...result });
    }

    // ---------------------------------------------------- retry-capture
    if (action === "retry-capture") {
      const payment = await latestOpenPayment(admin, targetUserId);
      if (!payment) return jsonError(400, "no_authorization", "There's no open authorization to capture.");
      if (record.identity_status !== "success") {
        return jsonError(400, "identity_not_successful", "Identity has not succeeded — capture is not allowed.");
      }
      const capture = await captureAuthorizationOnce(admin, payment);
      if (!capture.ok) return jsonError(502, "capture_failed", `Capture failed (${capture.errorCode}).`);
      const settled = await reconcileVerification(admin, targetUserId);
      return jsonResponse(200, { ok: true, ...settled });
    }

    // ------------------------------------------------------- retry-void
    if (action === "retry-void") {
      const payment = await latestOpenPayment(admin, targetUserId);
      if (!payment) return jsonResponse(200, { ok: true, message: "Nothing open to void." });
      const result = await voidAuthorizationOnce(admin, payment, "admin_void");
      if (!result.ok) return jsonError(502, "void_failed", `Void failed (${result.errorCode}).`);
      return jsonResponse(200, { ok: true });
    }

    // ----------------------------------------------------------- refund
    /**
     * A refund must make the badge ineligible in the same operation —
     * refundPaymentOnce updates the authoritative seller record atomically.
     */
    if (action === "refund") {
      const reason = String(body?.reason ?? "").trim();
      if (reason.length < 4) return jsonError(400, "reason_required", "A reason is required.");
      const paid = await capturedPayment(admin, targetUserId);
      if (!paid) return jsonError(400, "no_capture", "There's no captured payment to refund.");

      const result = await refundPaymentOnce(admin, paid, reason, { adminId: actor.id });
      if (!result.ok) return jsonError(502, "refund_failed", "PayPal refused the refund.");

      const after = await ensureVerification(admin, targetUserId);
      await admin.from("seller_verification_events").insert({
        provider: "admin",
        event_key: `refund:${targetUserId}:${Date.now()}`,
        event_type: "refund",
        user_id: targetUserId,
        outcome: `by=${actor.id} reason=${reason.slice(0, 160)}`,
      });
      log("refunded_by_admin", { user_id: targetUserId, by: actor.id });
      return jsonResponse(200, {
        ok: true,
        refund_id: result.refundId,
        badge_active: isBadgeEligible(after),
        payment_state: after.payment_state,
      });
    }

    // ------------------------------------------------------------ revoke
    if (action === "revoke") {
      const reason = String(body?.reason ?? "").trim();
      if (reason.length < 4) {
        return jsonError(400, "reason_required", "Please give a reason for revoking the badge.");
      }
      await admin
        .from("seller_verifications")
        .update({
          status: "revoked",
          revoked_at: new Date().toISOString(),
          revoked_reason: reason.slice(0, 500),
          revoked_by: actor.id,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", targetUserId);
      await admin.from("seller_verification_events").insert({
        provider: "admin",
        event_key: `revoke:${targetUserId}:${Date.now()}`,
        event_type: "revoke",
        user_id: targetUserId,
        outcome: `by=${actor.id} reason=${reason.slice(0, 160)}`,
      });
      log("badge_revoked", { user_id: targetUserId, by: actor.id });
      return jsonResponse(200, { ok: true });
    }

    // ----------------------------------------------------------- restore
    /**
     * Restore may only reactivate a badge that would be eligible on its own
     * terms: Plaid success, payment still captured, and that capture not
     * refunded. Anything else clears the revocation without granting a badge.
     */
    if (action === "restore") {
      const reason = String(body?.reason ?? "").trim();
      if (reason.length < 4) {
        return jsonError(400, "reason_required", "Please give a reason for restoring the badge.");
      }

      const paid = await capturedPayment(admin, targetUserId);
      const eligible = record.identity_status === "success" && !!paid && !paid.paypal_refund_id;

      await admin
        .from("seller_verifications")
        .update({
          status: eligible ? "verified" : (record.identity_status === "success" ? "payment_required" : record.status),
          payment_state: eligible ? "captured" : record.payment_state,
          verified_at: eligible ? record.verified_at ?? new Date().toISOString() : null,
          revoked_at: null,
          revoked_reason: null,
          revoked_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", targetUserId);

      await admin.from("seller_verification_events").insert({
        provider: "admin",
        event_key: `restore:${targetUserId}:${Date.now()}`,
        event_type: "restore",
        user_id: targetUserId,
        outcome: `by=${actor.id} eligible=${eligible} reason=${reason.slice(0, 140)}`,
      });
      return jsonResponse(200, {
        ok: true,
        badge_active: eligible,
        message: eligible
          ? "Badge restored."
          : "Revocation cleared, but the badge stays off — identity success and an unrefunded capture are both required.",
      });
    }

    // ------------------------------------------------------ grant-retry
    if (action === "grant-retry") {
      const allowance = (record.retry_allowance ?? VERIFIED_SELLER.selfServiceRetryLimit) + 1;
      await admin
        .from("seller_verifications")
        .update({ retry_allowance: allowance, updated_at: new Date().toISOString() })
        .eq("user_id", targetUserId);
      await admin.from("seller_verification_events").insert({
        provider: "admin",
        event_key: `grant-retry:${targetUserId}:${Date.now()}`,
        event_type: "grant_retry",
        user_id: targetUserId,
        outcome: `allowance=${allowance}`,
      });
      return jsonResponse(200, { ok: true, retry_allowance: allowance });
    }

    return jsonError(400, "unknown_action", "That action isn't supported.");
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
