import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

/**
 * RETIRED: check-stripe-connect
 *
 * The legacy card processor's Connect onboarding is no longer used. This
 * endpoint never contacts the retired provider; it always reports a
 * disconnected state with a 200 so callers render the "set up payouts"
 * state instead of blank-screening. Payout destinations now live on
 * `profiles.paypal_payout_email`.
 */
Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  return new Response(
    JSON.stringify({
      connected: false,
      onboarding_complete: false,
      provider_retired: true,
      message: 'Payouts are handled through PayPal. Save your payout email in account settings.',
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
