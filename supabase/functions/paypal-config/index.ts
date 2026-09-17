import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, jsonResponse } from "../_shared/jsonError.ts";
import {
  PARTNER_ATTRIBUTION_ID,
  paypalConfigStatus,
  paypalPublicClientId,
} from "../_shared/paypal.ts";

/**
 * Public bootstrap for the browser PayPal SDK.
 * Returns ONLY the publishable client id, the partner attribution (BN) code
 * and environment — never the secret. PayPal requires the BN code on the SDK
 * script tag, so it is safe (and mandatory) to expose it here.
 */
serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const status = paypalConfigStatus();
  return jsonResponse(200, {
    enabled: status.client_id_configured && status.client_secret_configured,
    environment: status.environment,
    client_id: paypalPublicClientId(),
    partner_attribution_id: PARTNER_ATTRIBUTION_ID,
    currency: "USD",
    // applepay/googlepay are express wallets layered on the same PayPal order
    // lifecycle; the SDK hides them automatically when they are not eligible.
    components: ["buttons", "messages", "card-fields", "applepay", "googlepay"],
    enable_funding: ["venmo", "paylater"],
  });
});

