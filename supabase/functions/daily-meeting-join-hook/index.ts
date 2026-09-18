/**
 * Daily `meeting_join_hook`.
 *
 * This is the ONLY source of truth that a person really entered a Vendibook
 * meeting. Everything in the payload is treated as untrusted:
 *   - the shared secret is compared in constant time;
 *   - the room must exist in `video_walkthrough_provider_rooms`;
 *   - the user must be a real participant of THAT walkthrough;
 *   - `is_owner` from the payload is ignored entirely.
 *
 * On a verified join it records presence, notifies the counterparty once, and
 * asks the recording layer whether the meeting is now fully consented and
 * fully attended.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { counterpartyRoleLabel, roleForUser, roomProfileFor } from '../_shared/videoMeetings.ts';
import { maybeStartRecording } from '../_shared/videoRecording.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function timingSafeEqual(a: string, b: string) {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  try {
    const secret = Deno.env.get('DAILY_JOIN_HOOK_SECRET');
    const supplied = new URL(req.url).searchParams.get('s') || '';
    if (!secret || !timingSafeEqual(supplied, secret)) return json({ error: 'unauthorized' }, 401);

    const payload = await req.json().catch(() => ({} as Record<string, unknown>));
    const roomName = String((payload as any).room || (payload as any).room_name || '');
    const userId = String((payload as any).user_id || '');
    const sessionId = (payload as any).meeting_session_id || (payload as any).session_id || null;
    const participantId = (payload as any).participant_id || (payload as any).id || null;
    if (!roomName || !userId) return json({ received: true }, 200);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

    const { data: room } = await admin
      .from('video_walkthrough_provider_rooms')
      .select('walkthrough_id, room_name')
      .eq('room_name', roomName)
      .maybeSingle();
    if (!room) return json({ received: true }, 200);

    const { data: w } = await admin
      .from('video_walkthroughs')
      .select('id, buyer_id, seller_id, status, meeting_type, starts_at, ends_at, listing:listings(title)')
      .eq('id', room.walkthrough_id)
      .maybeSingle();
    if (!w) return json({ received: true }, 200);

    const role = roleForUser(w.meeting_type, w, userId);
    if (!role) {
      // Not a participant of this meeting: record nothing, grant nothing.
      return json({ received: true }, 200);
    }

    const nowIso = new Date().toISOString();
    const { data: existing } = await admin
      .from('video_walkthrough_participants')
      .select('id, total_join_count')
      .eq('walkthrough_id', w.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await admin.from('video_walkthrough_participants').update({
        role, room_name: roomName, meeting_session_id: sessionId, last_participant_id: participantId,
        is_present: true, last_joined_at: nowIso, total_join_count: (existing.total_join_count || 0) + 1,
      }).eq('id', existing.id);
    } else {
      await admin.from('video_walkthrough_participants').insert({
        walkthrough_id: w.id, user_id: userId, role, room_name: roomName,
        meeting_session_id: sessionId, last_participant_id: participantId,
        is_present: true, first_joined_at: nowIso, last_joined_at: nowIso,
      });
    }

    // Idempotent join event: the unique index covers (walkthrough, actor, type, session).
    const eventType = `${role}_joined`;
    await admin.from('video_walkthrough_events').insert({
      walkthrough_id: w.id,
      actor_id: userId,
      event_type: eventType,
      metadata: { role, meeting_type: w.meeting_type, meeting_session_id: sessionId, source: 'daily_join_hook' },
    }).select('id').maybeSingle();

    if (!w.meeting_started_at) {
      await admin.from('video_walkthroughs').update({ meeting_started_at: nowIso }).eq('id', w.id).is('meeting_started_at', null);
    }

    // Tell the other side exactly once per meeting that somebody is waiting.
    const counterpartyId = userId === w.seller_id ? w.buyer_id : w.seller_id;
    const profile = roomProfileFor(w.meeting_type);
    const notifyType = 'walkthrough_participant_waiting';
    const { count } = await admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', counterpartyId)
      .eq('type', notifyType)
      .eq('link', `/walkthrough/${w.id}`);
    if (!count) {
      await admin.from('notifications').insert({
        user_id: counterpartyId,
        type: notifyType,
        title: `Your ${counterpartyRoleLabel(role)} has joined`,
        message: `${(w as any).listing?.title || profile.label} — your ${counterpartyRoleLabel(role)} is waiting in the ${profile.label.toLowerCase()}.`,
        link: `/walkthrough/${w.id}`,
      });
    }

    const attempt = await maybeStartRecording(admin, w as any);
    return json({ received: true, recording: attempt.started }, 200);
  } catch (e) {
    console.error('[daily-meeting-join-hook]', e instanceof Error ? e.message : 'failed');
    return json({ received: true }, 200);
  }
});
