// Thin proxy: routes listing-published emails through Lovable Emails queue.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'
import { getAuthedUser, isTrustedInternal } from '../_shared/trustedCaller.ts';

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
    // Hosts can only trigger this for their own listing, sent to their own email.
    if (!isTrustedInternal(req)) {
      const user = await getAuthedUser(req);
      if (!user?.email) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: listing } = await supabase
        .from('listings').select('id, host_id, title').eq('id', b.listingId).maybeSingle();
      if (!listing || listing.host_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      b.hostEmail = user.email;
      b.listingTitle = listing.title;
    }

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
