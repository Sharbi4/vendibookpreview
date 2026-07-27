// Temporary E2E test tool: builds a signed synthetic Stripe event and
// POSTs it to monetization-webhook using the stored signing secret,
// so we can verify the entitlement chain without a real Stripe charge.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const enc = new TextEncoder();

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user_id, tier = "host_pro", event_type = "customer.subscription.created" } =
      await req.json();
    if (!user_id) throw new Error("user_id required");

    const secret = Deno.env.get("STRIPE_MONETIZATION_WEBHOOK_SECRET");
    if (!secret) throw new Error("missing STRIPE_MONETIZATION_WEBHOOK_SECRET");

    const now = Math.floor(Date.now() / 1000);
    const subId = `sub_e2e_${now}`;
    const custId = `cus_e2e_${now}`;
    const priceId = `price_e2e_${tier}`;

    const subscription = {
      id: subId,
      object: "subscription",
      customer: custId,
      status: "active",
      cancel_at_period_end: false,
      cancel_at: null,
      trial_end: null,
      current_period_start: now,
      current_period_end: now + 30 * 86400,
      metadata: { user_id, tier },
      items: {
        object: "list",
        data: [{
          id: `si_e2e_${now}`,
          current_period_start: now,
          current_period_end: now + 30 * 86400,
          price: {
            id: priceId,
            unit_amount: 2900,
            currency: "usd",
            recurring: { interval: "month" },
            product: `prod_e2e_${tier}`,
          },
        }],
      },
    };

    const event = {
      id: `evt_e2e_${now}`,
      object: "event",
      type: event_type,
      api_version: "2025-08-27.basil",
      created: now,
      data: { object: subscription, previous_attributes: {} },
      livemode: false,
    };

    const payload = JSON.stringify(event);
    const timestamp = now;
    const signedPayload = `${timestamp}.${payload}`;
    const sig = await hmacSha256Hex(secret, signedPayload);
    const stripeSig = `t=${timestamp},v1=${sig}`;

    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/monetization-webhook`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": stripeSig,
      },
      body: payload,
    });
    const bodyText = await res.text();

    return new Response(
      JSON.stringify({
        posted_to: url,
        event_id: event.id,
        event_type,
        subscription_id: subId,
        customer_id: custId,
        response_status: res.status,
        response_body: bodyText,
      }, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
