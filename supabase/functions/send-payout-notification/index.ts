// Thin proxy: routes payout notifications through Lovable Emails queue.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const p = await req.json();
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    if (!p?.host_id) {
      return new Response(JSON.stringify({ error: 'host_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: host } = await supabase
      .from('profiles')
      .select('email, full_name, first_name')
      .eq('id', p.host_id)
      .maybeSingle();

    if (!host?.email) {
      return new Response(JSON.stringify({ error: 'host email not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const arrivesBy = p.estimated_arrival
      ? new Date(p.estimated_arrival).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : undefined;

    const idemKey = `payout-${p.transfer_id || p.transaction_id || p.booking_id || crypto.randomUUID()}-${p.payout_status || 'sent'}`;

    const { error } = await invokeTransactionalEmail({
        templateName: 'payout-sent',
        recipientEmail: host.email,
        idempotencyKey: idemKey,
        templateData: {
          recipientName: host.first_name || host.full_name?.split(' ')[0],
          amount: Number(p.payout_amount) || 0,
          transferId: p.transfer_id,
          arrivesBy,
          listingTitle: p.listing_title,
        },
      });
    if (error) throw error;
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[send-payout-notification]', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
