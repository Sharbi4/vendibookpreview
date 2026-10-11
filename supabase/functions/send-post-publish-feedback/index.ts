// Post-publish feedback: finds listings published 24–48h ago and sends a
// one-time feedback request. Idempotent via feedback_email_sent. Triggered
// by pg_cron hourly.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function genToken(): string {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const now = Date.now();
  const minAge = new Date(now - 24 * 60 * 60 * 1000).toISOString(); // 24h ago
  const maxAge = new Date(now - 48 * 60 * 60 * 1000).toISOString(); // 48h ago

  const sent: any[] = [];
  const errors: any[] = [];

  try {
    const { data: listings } = await supabase
      .from('listings')
      .select('id, title, host_id, published_at, profiles!listings_host_id_fkey(email, full_name, first_name)')
      .eq('status', 'published').not('published_at', 'is', null).is('deleted_at', null).eq('moderation_status', 'clear')
      .lt('published_at', minAge)
      .gt('published_at', maxAge)
      .limit(200);

    for (const l of listings || []) {
      const profile: any = (l as any).profiles;
      const email = profile?.email;
      if (!email) continue;

      const { data: already } = await supabase
        .from('feedback_email_sent')
        .select('id')
        .eq('context_type', 'listing_publish')
        .eq('context_id', l.id)
        .maybeSingle();
      if (already) continue;

      const token = genToken();
      const { error: logErr } = await supabase.from('feedback_email_sent').insert({
        context_type: 'listing_publish',
        context_id: l.id,
        recipient_email: email,
      });
      if (logErr) {
        // unique-constraint race — skip
        continue;
      }
      await supabase.from('feedback_submissions').insert({
        user_id: l.host_id,
        context_type: 'listing_publish',
        context_id: l.id,
        email,
        metadata: { token, status: 'pending', listing_title: l.title },
      });

      const recipientName = profile?.first_name || profile?.full_name?.split(' ')[0];

      const { error } = await invokeTransactionalEmail({
          templateName: 'feedback-request',
          recipientEmail: email,
          idempotencyKey: `feedback-publish-${l.id}`,
          templateData: {
            recipientName,
            contextLabel: l.title ? `publishing "${l.title}"` : 'publishing your listing',
            contextType: 'listing_publish',
            feedbackToken: token,
            aiIntro: `You just published${l.title ? ` "${l.title}"` : ' your listing'} — 30 seconds of honest feedback helps us make publishing dramatically smoother for the next host.`,
          },
        });
      if (error) errors.push({ listing: l.id, error: error.message });
      else sent.push({ listing: l.id, email });
    }
  } catch (e) {
    errors.push({ stage: 'listings', error: e instanceof Error ? e.message : String(e) });
  }

  return new Response(JSON.stringify({ success: true, sent: sent.length, errors }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
