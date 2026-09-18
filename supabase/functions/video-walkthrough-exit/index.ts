/**
 * Records that an authenticated participant left the native Vendibook call,
 * and — conservatively — marks the walkthrough completed.
 *
 * Completion requires evidence that a real meeting happened: at least one
 * verified join event written by the Daily meeting join hook. A browser
 * requesting a token is NOT evidence. Cancelled / no_show walkthroughs are
 * never overwritten.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return json({ error: 'authentication_required' }, 401);
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: 'authentication_required' }, 401);

    const { walkthrough_id } = await req.json().catch(() => ({}));
    if (!walkthrough_id) return json({ error: 'walkthrough_id_required' }, 400);

    const { data: w } = await admin
      .from('video_walkthroughs')
      .select('id, buyer_id, seller_id, status, starts_at, completed_at')
      .eq('id', walkthrough_id)
      .maybeSingle();
    if (!w || (w.buyer_id !== user.id && w.seller_id !== user.id)) return json({ error: 'not_authorized' }, 403);

    await admin.from('video_walkthrough_events').insert({
      walkthrough_id: w.id,
      actor_id: user.id,
      event_type: 'participant_left',
      metadata: { role: user.id === w.seller_id ? 'seller' : 'buyer', source: 'native_call_exit' },
    });

    let completed = w.status === 'completed';
    if (!completed && ['scheduled', 'rescheduled'].includes(w.status)) {
      const { count } = await admin
        .from('video_walkthrough_events')
        .select('id', { count: 'exact', head: true })
        .eq('walkthrough_id', w.id)
        .in('event_type', ['buyer_joined', 'seller_joined']);
      if ((count ?? 0) > 0) {
        await admin
          .from('video_walkthroughs')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', w.id)
          .in('status', ['scheduled', 'rescheduled']);
        await admin.from('video_walkthrough_events').insert({
          walkthrough_id: w.id, actor_id: user.id, event_type: 'completed',
          metadata: { source: 'verified_join_then_exit' },
        });
        completed = true;
      }
    }

    return json({ success: true, completed });
  } catch (e) {
    console.error('[video-walkthrough-exit]', e instanceof Error ? e.message : 'failed');
    return json({ error: 'exit_not_recorded' }, 500);
  }
});
