import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonResponse } from "../_shared/jsonError.ts";
import {
  getIdentityVerification,
  plaidEnvironment,
  plaidLog,
  verifyPlaidWebhook,
} from "../_shared/plaid.ts";
import {
  plaidEnvironmentMatches,
  webhookConvergenceKey,
} from "../_shared/verifiedSellerLogic.ts";
import { claimEvent, log, reconcileVerification } from "../_shared/verifiedSeller.ts";

/**
 * Plaid Identity Verification webhook.
 *
 * Signature is verified with Plaid's JWK process BEFORE anything is read from
 * the payload. We never trust the event body for status — the authoritative
 * result is re-queried from Plaid, and that authoritative status is what the
 * dedupe key converges on.
 *
 * Configure in the Plaid dashboard as:
 *   <SUPABASE_URL>/functions/v1/verified-seller-webhook
 *   webhook_type IDENTITY_VERIFICATION
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const raw = await req.text();

  const valid = await verifyPlaidWebhook(req.headers, raw);
  if (!valid) {
    // 200 keeps Plaid from hammering us; nothing is processed.
    plaidLog("webhook_rejected");
    return jsonResponse(200, { received: true, processed: false });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return jsonResponse(200, { received: true, processed: false });
  }

  const webhookType = String(payload.webhook_type ?? "");
  const webhookCode = String(payload.webhook_code ?? "");
  const verificationId = payload.identity_verification_id
    ? String(payload.identity_verification_id)
    : null;

  if (webhookType !== "IDENTITY_VERIFICATION" || !verificationId) {
    return jsonResponse(200, { received: true, processed: false });
  }

  // A sandbox notification must never touch production records (or vice versa).
  if (!plaidEnvironmentMatches(payload.environment, plaidEnvironment())) {
    plaidLog("webhook_environment_mismatch", { verification_id: verificationId });
    return jsonResponse(200, { received: true, processed: false, reason: "environment_mismatch" });
  }

  // STATUS_UPDATED and RETRIED carry outcomes. STEP_UPDATED is progress noise
  // that must never be allowed to downgrade a settled result.
  if (!["STATUS_UPDATED", "RETRIED"].includes(webhookCode)) {
    return jsonResponse(200, { received: true, processed: false, reason: "ignored_code" });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const { data: attempt } = await admin
      .from("seller_verification_attempts")
      .select("user_id")
      .eq("plaid_verification_id", verificationId)
      .maybeSingle();

    /**
     * Free booking-purpose identity checks share the same Plaid template, so
     * the same webhook carries their outcome. Money is never involved here —
     * we only mirror the authoritative status onto the booking record.
     */
    const { data: bookingIdv } = await admin
      .from("booking_identity_verifications")
      .select("user_id")
      .eq("plaid_verification_id", verificationId)
      .maybeSingle();

    if (bookingIdv?.user_id) {
      try {
        const live = await getIdentityVerification(verificationId) as { status?: string };
        const mapped = live?.status === "success"
          ? "verified"
          : live?.status === "pending_review"
          ? "pending_review"
          : ["failed", "expired", "canceled"].includes(String(live?.status))
          ? String(live?.status)
          : "in_progress";
        await admin
          .from("booking_identity_verifications")
          .update({
            status: mapped,
            identity_status: live?.status ?? null,
            verified_at: mapped === "verified" ? new Date().toISOString() : null,
          })
          .eq("user_id", bookingIdv.user_id);
      } catch (bookingErr) {
        plaidLog("booking_idv_webhook_sync_failed", {
          verification_id: verificationId,
          message: (bookingErr as Error).message,
        });
      }
    }

    if (!attempt?.user_id) {
      plaidLog("webhook_unknown_attempt", { verification_id: verificationId });
      return jsonResponse(200, { received: true, processed: !!bookingIdv?.user_id });
    }


    /**
     * Official STATUS_UPDATED bodies are byte-identical across transitions, so
     * the dedupe key is composed from the AUTHORITATIVE Plaid state instead.
     * Duplicate deliveries of one state coalesce; active -> pending_review ->
     * success each process.
     */
    const authoritative = await getIdentityVerification(verificationId) as {
      status?: string;
      completed_at?: string | null;
    };
    const eventKey = webhookConvergenceKey({
      webhookCode,
      verificationId,
      authoritativeStatus: String(authoritative?.status ?? "unknown"),
      completedAt: authoritative?.completed_at ?? null,
    });

    const claimed = await claimEvent(admin, {
      provider: "plaid",
      eventKey,
      eventType: webhookCode,
      userId: attempt.user_id,
      verificationId,
    });
    if (!claimed) {
      return jsonResponse(200, { received: true, processed: false, reason: "duplicate" });
    }

    let result;
    try {
      result = await reconcileVerification(admin, attempt.user_id, { verificationId });
    } catch (inner) {
      // Release the claim so Plaid's retry can reprocess this event.
      await admin
        .from("seller_verification_events")
        .delete()
        .eq("provider", "plaid")
        .eq("event_key", eventKey);
      throw inner;
    }

    await admin
      .from("seller_verification_events")
      .update({ outcome: `${result.status}:${result.action_taken}` })
      .eq("provider", "plaid")
      .eq("event_key", eventKey);

    log("webhook_processed", { code: webhookCode, action: result.action_taken });
    return jsonResponse(200, { received: true, processed: true });
  } catch (err) {
    log("webhook_error", { message: (err as Error).message });
    // Non-200 asks Plaid to retry; our dedupe makes that safe.
    return jsonResponse(500, { received: true, processed: false });
  }
});

