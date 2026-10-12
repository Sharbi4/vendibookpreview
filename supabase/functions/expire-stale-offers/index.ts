import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isAdminOrBackendCaller, forbiddenResponse } from '../_shared/callerGuard.ts';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (!(await isAdminOrBackendCaller(req))) return forbiddenResponse();
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  try {
    // Database transitions and in-app notifications commit together.
    const { data: expired, error } = await db.rpc('expire_offer_batch');
    if (error) throw error;
    const { data: pending, error: pendingError } = await db.from('offer_events')
      .select('offer_id,event_type').is('delivered_at',null)
      .lte('next_attempt_at',new Date().toISOString()).order('next_attempt_at').limit(30);
    if (pendingError) throw pendingError;
    let failures = 0;
    for (const event of pending ?? []) {
      // Sender claims a lease and uses a stable provider idempotency key.
      const { error: sendError } = await db.functions.invoke('send-offer-notification', { body: event });
      if (sendError) failures++;
    }
    return new Response(JSON.stringify({ success: failures === 0, expired, retry_failures: failures }),
      { status: failures ? 503 : 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('[expire-stale-offers]',error);
    return new Response(JSON.stringify({ error: 'Offer maintenance failed' }), { status: 500, headers: corsHeaders });
  }
});
