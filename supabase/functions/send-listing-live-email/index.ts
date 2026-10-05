// Thin proxy: routes listing-published emails through Lovable Emails queue.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCaller, isAdminUser, isBackendCaller, forbiddenResponse, unauthorizedResponse } from "../_shared/callerGuard.ts";
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const b = await req.json();
    if (!b?.listingId) {
      return new Response(JSON.stringify({ error: 'listingId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    // Recipient and listing facts come from the database, never the request.
    const { data: listing } = await supabase.from('listings')
      .select('id, title, category, city, address, cover_image_url, mode, host_id, status')
      .eq('id', b.listingId).maybeSingle();
    if (!listing || listing.status !== 'published') {
      return new Response(JSON.stringify({ error: 'Listing not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!(await isBackendCaller(req))) {
      const caller = await getCaller(req);
      if (!caller) return unauthorizedResponse(corsHeaders);
      if (caller.id !== listing.host_id && !(await isAdminUser(caller.id))) return forbiddenResponse(corsHeaders);
    }
    const { data: host } = await supabase.from('profiles').select('email, full_name, first_name').eq('id', listing.host_id).maybeSingle();
    if (!host?.email) {
      return new Response(JSON.stringify({ skipped: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { error } = await invokeTransactionalEmail({
        templateName: 'listing-published',
        recipientEmail: host.email,
        idempotencyKey: `listing-published-${b.listingId}`,
        templateData: {
XX
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
