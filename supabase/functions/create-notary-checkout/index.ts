import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

/**
 * RETIRED: create-notary-checkout
 *
 * The legacy card processor is no longer used by Vendibook. This endpoint is
 * kept only so old clients/bookmarks get a stable, non-500 answer. It never
 * contacts the retired provider. All active payments run through PayPal
 * (`paypal-create-order`, `paypal-capture-order`, `paypal-subscription-create`).
 */
Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  return new Response(
    JSON.stringify({
      error: 'provider_retired',
      message:
        'This payment path has been retired. Please refresh the page — checkout now runs through PayPal.',
      
    }),
    { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
