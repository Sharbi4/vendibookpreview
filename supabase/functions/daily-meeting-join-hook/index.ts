/**
 * Daily `meeting_join_hook` receiver.
 *
 * Daily POSTs here when a participant ACTUALLY enters a Vendibook walkthrough
 * room. This — not token issuance — is what records buyer_joined /
 * seller_joined. The endpoint is public by necessity, so every request is
 * checked against a server-only shared secret, a known room row, and a real
 * participant of that walkthrough.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-vendibook-join-secret',
  'Content-Type': 'application/json',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

const timingSafeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const secret = Deno.env.get('DAILY_JOIN_HOOK_SECRET');
    if (!secret) return json({ error: 'not_configured' }, 503);

    const url = new URL(req.url);
    const presented = url.searchParams.get('s') || req.headers.get('x-vendibook-join-secret') || '';
    if (!timingSafeEqual(presented, secret)) return json({ error: 'forbidden' }, 403);

    const payload = await req.json().catch(() => null) as Record<string, any> | null;
    if (!payload) return json({ error: 'bad_request' }, 400);

    const roomName = String(payload.room_name ?? payload.room ?? '').trim();
    const userId = String(payload.user_id ?? '').trim();
    const meetingSessionId = String(payload.meeting_session_id ?? payload.session_id ?? '').trim();
    if (!roomName || !UUID.test(userId)) return json({ ignored: true }, 200);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

    const { data: room } = await admin
      .from('video_walkthrough_provider_rooms')
      .select('walkthrough_id, provider')
      .eq('room_name', roomName)
      .maybeSingle();
    if (!room) return json({ ignored: true }, 200);

    const { data: w } = await admin
      .from('video_walkthroughs')
      .select('id, buyer_id, seller_id, status, listing:listings(title)')
      .eq('id', room.walkthrough_id)
      .maybeSingle();
    if (!w || (userId !== w.buyer_id && userId !== w.seller_id)) return json({ ignored: true }, 200);

    const isSeller = userId === w.seller_id;
    const eventType = isSeller ? 'seller_joined' : 'buyer_joined';

    // Dedupe: Daily retries must not create duplicate join events. A unique
    // index covers (walkthrough, actor, type, meeting_session_id).
    const { error: insertError } = await admin.from('video_walkthrough_events').insert({
      walkthrough_id: w.id,
      actor_id: userId,
      event_type: eventType,
      metadata: {
        meeting_session_id: meetingSessionId || 'unknown',
        is_owner: Boolean(payload.is_owner),
        owner_is_present: Boolean(payload.owner_is_present),
        first_non_owner_join: Boolean(payload.first_non_owner_join),
        source: 'daily_meeting_join_hook',
      },
    });
    const duplicate = Boolean(insertError && (insertError as any).code === '23505');
    if (insertError && !duplicate) {
      console.error('[daily-meeting-join-hook] event insert failed');
      return json({ received: true }, 200);
    }
    if (duplicate) return json({ received: true, duplicate: true }, 200);

    // Counterparty waiting notice — only when the other side has not joined.
    const counterpartyType = isSeller ? 'buyer_joined' : 'seller_joined';
    const { count } = await admin
      .from('video_walkthrough_events')
      .select('id', { count: 'exact', head: true })
      .eq('walkthrough_id', w.id)
      .eq('event_type', counterpartyType);

    if (!count) {
      const recipient = isSeller ? w.buyer_id : w.seller_id;
      const title = isSeller ? 'The seller is in the walkthrough' : 'Your buyer has joined the walkthrough';
      const message = isSeller
        ? `${(w as any).listing?.title || 'Your walkthrough'} — the seller is waiting in the meeting.`
        : `${(w as any).listing?.title || 'Your walkthrough'} — your buyer has joined the video walkthrough and is waiting.`;
      await admin.from('notifications').insert({
        user_id: recipient,
        type: 'walkthrough_participant_waiting',
        title,
        message,
        link: `/walkthrough/${w.id}`,
      });
    }

    return json({ received: true }, 200);
  } catch (e) {
    console.error('[daily-meeting-join-hook]', e instanceof Error ? e.message : 'failed');
    return json({ received: true }, 200);
  }
});
