import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { hasCurrentLegalAcceptance } from "../_shared/legalVersions.ts";
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
const DEFAULT_RETURN_URL = `${SITE_URL}/dashboard/payments/setup?paypal_return=1`;

/**
 * PayPal sends the seller back to whatever return_url we put on the referral.
 * When the flow was started from a preview/published host, hardcoding the
 * production domain strands the seller on the wrong site. Use the request's
 * own origin when it is a known Vendibook host; otherwise the production URL.
 */
const ALLOWED_RETURN_ORIGINS = new Set([
  "https://vendibook.com",
  "https://www.vendibook.com",
  "https://vendibookpreview.lovable.app",
  "https://id-preview--f4d8586e-de66-4307-b052-b071b734f592.lovable.app",
  "http://localhost:8080",
]);

function returnUrlFor(req: Request): string {
  const origin = req.headers.get("origin") ?? "";
  try {
    const host = origin ? new URL(origin).origin : "";
    if (ALLOWED_RETURN_ORIGINS.has(host)) {
      return `${host}/dashboard/payments/setup?paypal_return=1`;
    }
  } catch {
    // fall through to the production default
  }
  return DEFAULT_RETURN_URL;
}

interface DerivedStatus {
  status: "ready" | "action_required";
  reasons: string[];
  scopes: string[];
  activeOauth: boolean;
  ppcpApproved: boolean;
  emailConfirmed: boolean;
  receivable: boolean;
  merchantId: string | null;
  /** PPCP_CUSTOM (advanced card) vetting status, when PayPal reports it. */
  acdcVetting: string | null;
  /** Whether the merchant's integration reports vaulting capability. */
  vaulting: string | null;
  /** Capability names PayPal returned for this merchant. */
  capabilities: string[];
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

  // Advanced card processing (ACDC) and vaulting are reported per product /
  // capability. We record what PayPal says; we never assume a capability.
  const acdcProduct = products.find(
    (p: any) => String(p?.name ?? "").toUpperCase() === "PPCP_CUSTOM",
  );
  const acdcVetting = acdcProduct
    ? String(acdcProduct?.vetting_status ?? "PENDING").toUpperCase()
    : null;
  const capabilityList = Array.isArray(raw?.capabilities) ? raw.capabilities : [];
  const capabilities = capabilityList
    .map((c: any) => (typeof c === "string" ? c : c?.name))
    .filter((c: any): c is string => typeof c === "string");
  // Vaulting readiness is reported in two places, and PayPal treats either one
  // being IN_REVIEW / NEED_MORE_DATA as "not available to the seller yet"
  // (IWT pp.5-6): products[name == 'ADVANCED_VAULTING'].vetting_status and
  // capabilities[name == 'PAYPAL_WALLET_VAULTING_ADVANCED'].status. Report the
  // blocking state so the seller is told what PayPal actually needs.
  const vaultingProduct = products.find(
    (p: any) => String(p?.name ?? "").toUpperCase() === "ADVANCED_VAULTING",
  );
  const vaultingCapability = capabilityList.find(
    (c: any) => String(c?.name ?? c ?? "").toUpperCase().includes("VAULT"),
  );
  const vaultingStates = [
    vaultingProduct ? String(vaultingProduct?.vetting_status ?? "IN_REVIEW").toUpperCase() : null,
    vaultingCapability ? String(vaultingCapability?.status ?? "ACTIVE").toUpperCase() : null,
  ].filter((s): s is string => s !== null);
  const vaulting = vaultingStates.length === 0
    ? null
    : vaultingStates.includes("NEED_MORE_DATA")
      ? "NEED_MORE_DATA"
      : vaultingStates.includes("DENIED")
        ? "DENIED"
        : vaultingStates.includes("IN_REVIEW")
          ? "IN_REVIEW"
          : vaultingStates.every((s) => s === "SUBSCRIBED" || s === "ACTIVE")
            ? "SUBSCRIBED"
            : vaultingStates[0];

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
    acdcVetting,
    vaulting,
    capabilities,
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
      // Legal gate: the seller accepts the Seller Payment Terms and the E-SIGN
      // consent before we ask PayPal for a partner referral link.
      for (const slug of ["seller-payment-terms", "esign"] as const) {
        const accepted = await hasCurrentLegalAcceptance(admin, user.id, slug);
        if (!accepted) {
          return jsonError(
            403,
            "legal_acceptance_required",
            "Please accept the Seller Payment Terms and the electronic records consent before connecting PayPal.",
          );
        }
      }

      let existing = await activeRow();
      // A revoked consent cannot be resumed. Archive it and create a fresh
      // referral so the seller always has a working recovery path.
      if (existing?.onboarding_status === "revoked") {
        const now = new Date().toISOString();
        await admin
          .from("seller_paypal_accounts")
          .update({
            archived_at: now,
            referral_url: null,
            updated_at: now,
          })
          .eq("id", existing.id);
        existing = null;
      }
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
      const referral = await createPartnerReferral({ trackingId, returnUrl: returnUrlFor(req) });
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
      let raw: Record<string, any>;
      try {
        raw = await getMerchantIntegrationStatus(row.tracking_id);
      } catch (err) {
        // PayPal 404s the merchant-integration lookup until the seller
        // actually finishes the hosted signup. That is a normal "not
        // finished yet" state, not a failure — keep the link_sent status,
        // stamp the check time and answer 200 so the UI shows guidance
        // instead of an error.
        if (err instanceof PayPalError && err.status === 404) {
          await admin
            .from("seller_paypal_accounts")
            .update({
              last_status_check_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", row.id);
          safeLog("seller_status_pending", { user_id: user.id });
          return jsonResponse(200, {
            status: "link_sent",
            pending: true,
            action_reasons: row.action_reasons ?? [],
            merchant_id: row.merchant_id,
            paypal_email: row.paypal_email,
            oauth_scopes: [],
            acdc_vetting_status: null,
            vaulting_status: null,
            capabilities: [],
          });
        }
        throw err;
      }
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
        acdc_vetting_status: derived.acdcVetting,
        vaulting_status: derived.vaulting,
        capabilities: derived.capabilities,
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
          acdc_vetting_status: derived.acdcVetting,
          vaulting_status: derived.vaulting,
          capabilities: derived.capabilities,
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
        paypal_email: typeof raw?.primary_email === "string" ? raw.primary_email : null,
        oauth_scopes: derived.scopes,
        acdc_vetting_status: derived.acdcVetting,
        vaulting_status: derived.vaulting,
        capabilities: derived.capabilities,
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
      if (err.status === 401 && err.issue === "AUTHORIZATION_ERROR") {
        return jsonError(
          503,
          "paypal_partner_not_authorized",
          "PayPal seller connection is not configured correctly for this sandbox app. Vendibook support must verify the platform Merchant ID and Partner Referrals access before setup can finish.",
        );
      }
      return jsonError(
        err.status >= 500 ? 502 : 400,
        "paypal_error",
        "PayPal couldn't process that request. Please try again in a moment.",
      );
    }
    return unknownErrorResponse(err);
  }
});
