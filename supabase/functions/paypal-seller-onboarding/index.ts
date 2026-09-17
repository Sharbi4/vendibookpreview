import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import {
  createPartnerReferral,
  getMerchantIntegrationStatus,
  PayPalError,
  paypalOnboardingEnvironment,
  safeLog,
  sellerOnboardingEnabled,
} from "../_shared/paypal.ts";

/**
 * paypal-seller-onboarding — Step 2 of the PayPal Complete Payments /
 * Connected Path integration.
 *
 * Actions (all require the caller's own bearer token):
 *   create_referral  → creates a Partner Referral and returns PayPal's
 *                      action_url so the seller goes straight to PayPal.
 *   refresh_status   → looks up merchant-integration status and records
 *                      primary_email_confirmed / payments_receivable / scopes.
 *   disconnect       → archives the active connection so the seller can link
 *                      a different PayPal account later. No PayPal API call is
 *                      made — Vendibook simply forgets the association while
 *                      keeping historical records for reconciliation.
 *
 * Sandbox-first rollout: the flow runs in the environment chosen by
 * PAYPAL_ONBOARDING_ENV (defaults to PAYPAL_ENVIRONMENT) and is gated behind
 * PAYPAL_SELLER_ONBOARDING_ENABLED (default OFF) so production sellers are
 * never sent to sandbox and nothing is exposed before certification.
 */

const SITE_URL = "https://vendibook.com";
const RETURN_URL = `${SITE_URL}/account?paypal_return=1`;

interface DerivedStatus {
  status: "ready" | "action_required";
  reasons: string[];
  scopes: string[];
  activeOauth: boolean;
  ppcpApproved: boolean;
  emailConfirmed: boolean;
  receivable: boolean;
  merchantId: string | null;
}

function deriveStatus(raw: any): DerivedStatus {
  const oauth = Array.isArray(raw?.oauth_integrations) ? raw.oauth_integrations : [];
  const activeOauth = oauth.some(
    (o: any) => String(o?.oauth_integration_status ?? "").toUpperCase() === "ACTIVE",
  );
  const scopes = oauth.flatMap((o: any) => (Array.isArray(o?.scopes) ? o.scopes : []));
  const products = Array.isArray(raw?.products) ? raw.products : [];
  // If PayPal doesn't return a products array yet, don't fail readiness on it.
  const ppcpApproved = products.length === 0 ||
    products.some(
      (p: any) => p?.name === "PPCP" && String(p?.vetting_status ?? "").toUpperCase() === "APPROVED",
    );
  const emailConfirmed = raw?.primary_email_confirmed === true;
  const receivable = raw?.payments_receivable === true;
  const merchantId = typeof raw?.merchant_id === "string" ? raw.merchant_id : null;

  const reasons: string[] = [];
  if (!activeOauth) reasons.push("oauth_not_active");
  if (!ppcpApproved) reasons.push("vetting_pending");
  if (!emailConfirmed) reasons.push("primary_email_unconfirmed");
  if (!receivable) reasons.push("payments_receivable_false");

  const ready = activeOauth && ppcpApproved && emailConfirmed && receivable && !!merchantId;
  return {
    status: ready ? "ready" : "action_required",
    reasons,
    scopes,
    activeOauth,
    ppcpApproved,
    emailConfirmed,
    receivable,
    merchantId,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Public capability probe for the UI — no secrets, no PII.
    if (req.method === "GET") {
      return jsonResponse(200, {
        enabled: sellerOnboardingEnabled(),
        environment: paypalOnboardingEnvironment(),
      });
    }

    if (req.method !== "POST") {
      return jsonError(405, "method_not_allowed", "Unsupported method.");
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return jsonError(401, "unauthenticated", "Sign in to manage your PayPal connection.");
    }
    const { data: userData, error: userError } = await admin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    const user = userData?.user;
    if (userError || !user) {
      return jsonError(401, "unauthenticated", "Your session expired. Please sign in again.");
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    if (!sellerOnboardingEnabled()) {
      return jsonError(403, "onboarding_disabled", "PayPal connection isn't available yet.");
    }

    const activeRow = async () => {
      const { data } = await admin
        .from("seller_paypal_accounts")
        .select("*")
        .eq("user_id", user.id)
        .is("archived_at", null)
        .maybeSingle();
      return data;
    };

    if (action === "create_referral") {
      const existing = await activeRow();
      if (existing?.referral_url && existing.onboarding_status === "link_sent") {
        // Resume an unfinished signup instead of creating a second referral.
        return jsonResponse(200, {
          onboarding_url: existing.referral_url,
          status: existing.onboarding_status,
        });
      }
      if (existing) {
        return jsonResponse(200, {
          status: existing.onboarding_status,
          action_reasons: existing.action_reasons ?? [],
          already_connected: true,
        });
      }

      const trackingId = `vb-${crypto.randomUUID()}`;
      const referral = await createPartnerReferral({ trackingId, returnUrl: RETURN_URL });
      if (!referral.actionUrl) {
        return jsonError(
          502,
          "referral_failed",
          "PayPal didn't return a signup link. Please try again in a moment.",
        );
      }
      await admin.from("seller_paypal_accounts").insert({
        user_id: user.id,
        tracking_id: trackingId,
        onboarding_status: "link_sent",
        referral_url: referral.actionUrl,
      });
      safeLog("seller_onboarding_started", { user_id: user.id, tracking: trackingId });
      return jsonResponse(200, { onboarding_url: referral.actionUrl, status: "link_sent" });
    }

    if (action === "refresh_status") {
      const row = await activeRow();
      if (!row) {
        return jsonError(404, "not_connected", "Connect your PayPal account first.");
      }
      const raw = await getMerchantIntegrationStatus(row.tracking_id);
      const derived = deriveStatus(raw);

      // Slim, PII-free audit snapshot — no payer PII, no tokens.
      const slim = {
        merchant_id: derived.merchantId,
        oauth_integration_status: derived.activeOauth ? "ACTIVE" : "PENDING",
        products: (Array.isArray(raw?.products) ? raw.products : []).map((p: any) => ({
          name: p?.name ?? null,
          vetting_status: p?.vetting_status ?? null,
        })),
        reasons: derived.reasons,
      };

      await admin
        .from("seller_paypal_accounts")
        .update({
          merchant_id: derived.merchantId,
          paypal_email: typeof raw?.primary_email === "string" ? raw.primary_email : row.paypal_email,
          primary_email_confirmed: derived.emailConfirmed,
          payments_receivable: derived.receivable,
          oauth_scopes: derived.scopes,
          consent_granted: derived.activeOauth,
          products: slim.products,
          onboarding_status: derived.status,
          action_reasons: derived.reasons,
          status_payload: slim,
          last_status_check_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      safeLog("seller_status_refreshed", {
        user_id: user.id,
        onboarding_status: derived.status,
        reasons: derived.reasons.length,
      });
      return jsonResponse(200, {
        status: derived.status,
        action_reasons: derived.reasons,
        merchant_id: derived.merchantId,
      });
    }

    if (action === "disconnect") {
      const row = await activeRow();
      if (!row) return jsonError(404, "not_connected", "PayPal isn't connected.");
      const now = new Date().toISOString();
      // Forget the active association only — the archived row keeps the
      // tracking id, merchant id and history for reconciliation. Vendibook
      // cannot revoke PayPal permissions; the seller can relink later.
      await admin
        .from("seller_paypal_accounts")
        .update({
          archived_at: now,
          onboarding_status: "disconnected",
          referral_url: null,
          updated_at: now,
        })
        .eq("id", row.id);
      safeLog("seller_paypal_disconnected", { user_id: user.id });
      return jsonResponse(200, { status: "disconnected" });
    }

    return jsonError(400, "invalid_action", "Unknown action.");
  } catch (err) {
    if (err instanceof PayPalError) {
      safeLog("seller_onboarding_paypal_error", {
        status: err.status,
        issue: err.issue,
        debugId: err.debugId,
      });
      return jsonError(
        err.status >= 500 ? 502 : 400,
        "paypal_error",
        "PayPal couldn't process that request. Please try again in a moment.",
      );
    }
    return unknownErrorResponse(err);
  }
});
