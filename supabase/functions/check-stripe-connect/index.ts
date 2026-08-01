import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const disabledStatus = {
  connected: false,
  onboarding_complete: false,
  payouts_enabled: false,
  account_id: null,
  bank_last4: null,
  bank_name: null,
  provider: "paypal",
  legacy_provider_disabled: true,
};

/**
 * Compatibility endpoint retained for older cached clients.
 *
 * Vendibook has moved new payment and payout setup to PayPal, so this function
 * deliberately has no Stripe SDK or STRIPE_SECRET_KEY dependency. Returning a
 * stable 200 response prevents legacy status checks from surfacing as runtime
 * 500 errors or blanking the application preview.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(JSON.stringify(disabledStatus), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
});
