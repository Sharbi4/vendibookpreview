// Thin proxy: routes listing-published emails through Lovable Emails queue.
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
    if (!b?.hostEmail || !b?.listingId) {
      return new Response(JSON.stringify({ error: 'hostEmail and listingId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { error } = await invokeTransactionalEmail({
        templateName: 'listing-published',
        recipientEmail: b.hostEmail,
        idempotencyKey: `listing-published-${b.listingId}`,
        templateData: {
          hostName: b.hostName?.split(' ')[0] || b.hostName,
          listingTitle: b.listingTitle,
          listingId: b.listingId,
          category: b.category,
          city: b.city || (b.address ? String(b.address).split(',')[0] : undefined),
          coverImageUrl: b.coverImageUrl,
          listingType: b.listingType, // 'rental' | 'sale' | 'both'
        },
      });
    if (error) throw error;
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[send-listing-live-email]', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
