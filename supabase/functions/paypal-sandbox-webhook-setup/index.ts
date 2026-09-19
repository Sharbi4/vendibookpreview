// TEMPORARY one-shot setup: registers the Vendibook webhook with the PayPal
// SANDBOX API and returns the webhook id so it can be stored as
// PAYPAL_WEBHOOK_ID_SANDBOX. Refuses to run in live. Deleted after use.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, jsonResponse } from "../_shared/jsonError.ts";
import { paypalEnvironment } from "../_shared/paypal.ts";

const SANDBOX_BASE = "https://api-m.sandbox.paypal.com";


const WEBHOOK_URL = "https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/paypal-webhook";

const EVENT_TYPES = [
  "CHECKOUT.ORDER.APPROVED",
  "CHECKOUT.ORDER.COMPLETED",
  "CHECKOUT.PAYMENT-APPROVAL.REVERSED",
  "PAYMENT.CAPTURE.COMPLETED",
  "PAYMENT.CAPTURE.PENDING",
  "PAYMENT.CAPTURE.DECLINED",
  "PAYMENT.CAPTURE.DENIED",
  "PAYMENT.CAPTURE.REFUNDED",
  "PAYMENT.CAPTURE.REVERSED",
  "PAYMENT.AUTHORIZATION.CREATED",
  "PAYMENT.AUTHORIZATION.VOIDED",
  "PAYMENT.AUTHORIZATION.EXPIRED",
  "CUSTOMER.DISPUTE.CREATED",
  "CUSTOMER.DISPUTE.UPDATED",
  "CUSTOMER.DISPUTE.RESOLVED",
  "PAYMENT.SALE.COMPLETED",
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "BILLING.SUBSCRIPTION.CREATED",
  "BILLING.SUBSCRIPTION.UPDATED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.EXPIRED",
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
  "MERCHANT.ONBOARDING.COMPLETED",
  "MERCHANT.PARTNER-CONSENT.REVOKED",
  "CUSTOMER.MERCHANT-INTEGRATION.CAPABILITY-UPDATED",
  "CUSTOMER.MERCHANT-INTEGRATION.PRODUCT-SUBSCRIPTION-UPDATED",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (paypalEnvironment() !== "sandbox") {
    return jsonResponse(403, { error: "Sandbox-only setup endpoint." });
  }

  const clientId = Deno.env.get("PAYPAL_SANDBOX_CLIENT_ID") ?? Deno.env.get("PAYPAL_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("PAYPAL_SANDBOX_CLIENT_SECRET") ?? Deno.env.get("PAYPAL_CLIENT_SECRET") ?? "";
  if (!clientId || !clientSecret) {
    return jsonResponse(500, { error: "Sandbox PayPal credentials are not configured." });
  }

  const tokenRes = await fetch(`${SANDBOX_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!tokenRes.ok) {
    return jsonResponse(502, { error: "Could not get PayPal sandbox token." });
  }
  const { access_token: accessToken } = await tokenRes.json();

  // Reuse an existing webhook for this URL instead of piling up duplicates.
  const listRes = await fetch(`${SANDBOX_BASE}/v1/notifications/webhooks`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const list = listRes.ok ? await listRes.json() : { webhooks: [] };
  const existing = (list.webhooks ?? []).find((w: any) => w.url === WEBHOOK_URL);
  if (existing) {
    return jsonResponse(200, {
      created: false,
      webhook_id: existing.id,
      event_types: (existing.event_types ?? []).length,
      url: existing.url,
    });
  }

  const createRes = await fetch(`${SANDBOX_BASE}/v1/notifications/webhooks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: WEBHOOK_URL, event_types: EVENT_TYPES.map((name) => ({ name })) }),
  });
  if (!createRes.ok) {
    const detail = await createRes.text();
    return jsonResponse(502, { error: "PayPal webhook creation failed.", detail });
  }
  const created = await createRes.json();
  return jsonResponse(200, {
    created: true,
    webhook_id: created.id,
    event_types: (created.event_types ?? []).length,
    url: created.url,
  });
});
