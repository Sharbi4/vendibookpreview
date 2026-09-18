/**
 * Issues a short-lived recording playback link to an authorised viewer.
 *
 * The link is generated on demand, handed straight back to the caller, and is
 * never stored in the database, a log, or a cache. Only the two participants of
 * the meeting and Vendibook admins can request one.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getVideoProvider, VideoProviderUnavailableError } from '../_shared/videoProvider.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

/** 30 minutes: inside the 15–60 minute policy window. */
const TTL_SECONDS = 30 * 60;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return json({ error: 'authentication_required' }, 401);
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: 'authentication_required' }, 401);

    const { recording_id } = await req.json().catch(() => ({}));
    if (!recording_id) return json({ error: 'recording_id_required' }, 400);
    if (!await checkRateLimit('walkthrough_recording_access', user.id, 10, 10)) return json({ error: 'rate_limited' }, 429);

    const { data: rec } = await admin
      .from('video_walkthrough_recordings')
      .select('id, status, provider, provider_recording_id, walkthrough_id')
      .eq('id', recording_id)
      .maybeSingle();
    if (!rec) return json({ error: 'not_found' }, 404);

    const { data: w } = await admin
      .from('video_walkthroughs')
      .select('buyer_id, seller_id')
      .eq('id', rec.walkthrough_id)
      .maybeSingle();
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!w || (w.buyer_id !== user.id && w.seller_id !== user.id && !isAdmin)) return json({ error: 'not_authorized' }, 403);

    if (rec.status !== 'ready' || !rec.provider_recording_id) {
      return json({ error: 'not_ready', status: rec.status }, 409);
    }

    const provider = getVideoProvider(rec.provider || 'daily');
    const link = await provider.recordingAccessLink(rec.provider_recording_id, TTL_SECONDS);

    await admin.from('video_walkthrough_events').insert({
      walkthrough_id: rec.walkthrough_id,
      actor_id: user.id,
      event_type: 'recording_access_link_issued',
      metadata: { recording_row_id: rec.id, ttl_seconds: TTL_SECONDS },
    });

    return json({ url: link.url, expiresAt: link.expiresAt });
  } catch (e) {
    if (e instanceof VideoProviderUnavailableError) return json({ error: 'provider_unavailable', message: e.message }, 503);
    console.error('[video-walkthrough-recording-access]', e instanceof Error ? e.message : 'failed');
    return json({ error: 'recording_unavailable', message: 'The recording could not be opened right now.' }, 500);
  }
});
