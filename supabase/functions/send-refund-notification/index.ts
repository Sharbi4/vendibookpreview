// Thin proxy: routes refund notification emails through Lovable Emails queue.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const b = await req.json();
    if (!b?.email || !b?.bookingId) {
      return new Response(JSON.stringify({ error: 'email and bookingId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { error } = await invokeTransactionalEmail({
        templateName: 'refund-processed',
        recipientEmail: b.email,
        idempotencyKey: `refund-${b.bookingId}-${b.recipientType || 'shopper'}`,
        templateData: {
          recipientName: b.fullName?.split(' ')[0] || b.fullName,
          listingTitle: b.listingTitle,
          refundAmount: Number(b.refundAmount) || 0,
          reason: b.reason,
          recipientType: b.recipientType || 'shopper',
          initiatedBy: b.initiatedBy,
          bookingId: b.bookingId,
        },
      });
    if (error) throw error;
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[send-refund-notification]', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
