import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * listing-visibility-sweep
 *
 * Backstop job (runs every 2 hours via pg_cron) that guarantees no deleted,
 * paused, draft, archived or flagged listing keeps any public-surface artifact:
 *   - featured_enabled flags
 *   - active listing_promotions rows
 *
 * Database triggers already clear these the moment a listing leaves published
 * state; this sweep catches rows changed by direct SQL, imports, or historical
 * data. It also reports any listing that is still publicly reachable while not
 * being publicly visible, so we can see leaks instead of guessing.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: swept, error: sweepError } = await supabase.rpc(
      'sweep_non_public_listing_artifacts',
    );
    if (sweepError) throw sweepError;

    // Visibility audit: how many listings exist per non-public status.
    const { count: draftCount } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'draft');
    const { count: pausedCount } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'paused');
    const { count: deletedCount } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .not('deleted_at', 'is', null);

    const summary = {
      ...(swept as Record<string, unknown>),
      non_public_counts: {
        draft: draftCount ?? 0,
        paused: pausedCount ?? 0,
        soft_deleted: deletedCount ?? 0,
      },
    };

    console.log('listing-visibility-sweep', JSON.stringify(summary));

    return new Response(JSON.stringify({ ok: true, ...summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('listing-visibility-sweep failed:', message);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
