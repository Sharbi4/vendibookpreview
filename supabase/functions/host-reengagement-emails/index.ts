// Day-7 inactive host re-engagement email sender.
// Triggered by cron daily; finds hosts whose listings have been inactive for 7+ days
// and sends a personalized re-engagement email with optimization tips.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Find published listings with no views in last 7 days, host not nudged in last 14 days
    const { data: listings, error } = await supabase
      .from('listings')
      .select('id, title, host_id, view_count, published_at')
      .eq('status', 'active')
      .lt('published_at', sevenDaysAgo.toISOString())
      .limit(100);

    if (error) throw error;

    let sentCount = 0;
    const processed = new Set<string>();

    for (const listing of listings ?? []) {
      if (!listing.host_id || processed.has(listing.host_id)) continue;
      processed.add(listing.host_id);

      // Check recent views
      const { count: recentViews } = await supabase
        .from('listing_views')
        .select('*', { count: 'exact', head: true })
        .eq('listing_id', listing.id)
        .gte('viewed_at', sevenDaysAgo.toISOString());

      if ((recentViews ?? 0) > 0) continue;

      // Check host hasn't been nudged recently
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name, first_name, draft_nudge_sent_at')
        .eq('id', listing.host_id)
        .maybeSingle();

      if (!profile?.email) continue;
      if (
        profile.draft_nudge_sent_at &&
        new Date(profile.draft_nudge_sent_at) > fourteenDaysAgo
      ) {
        continue;
      }

      // Send re-engagement email via existing transactional infrastructure
      const firstName = profile.first_name || profile.full_name?.split(' ')[0] || 'there';
      try {
        await invokeTransactionalEmail({
            templateName: 'host-reengagement',
            recipientEmail: profile.email,
            idempotencyKey: `reengage-${listing.host_id}-${new Date().toISOString().slice(0, 10)}`,
            templateData: {
              name: firstName,
              listingTitle: listing.title,
              listingId: listing.id,
            },
          });

        await supabase
          .from('profiles')
          .update({ draft_nudge_sent_at: new Date().toISOString() })
          .eq('id', listing.host_id);

        sentCount++;
      } catch (e) {
        console.error('Failed to send to', profile.email, e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, scanned: listings?.length ?? 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('host-reengagement-emails error:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
