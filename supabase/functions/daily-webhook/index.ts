/**
 * Daily webhook receiver.
 *
 * Security: every delivery must carry `X-Webhook-Timestamp` and
 * `X-Webhook-Signature`. The signature is HMAC-SHA256 over
 * `<timestamp>.<raw body>` using the base64 HMAC secret Daily returned when the
 * webhook was created, compared in constant time. Unsigned or mis-signed
 * requests get 401 and are never processed.
 *
 * Processing is idempotent and out-of-order safe: each delivery is recorded
 * under a dedupe key, and recording state only ever moves forward.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const decodeBase64 = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
const encodeBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifySignature(rawBody: string, timestamp: string, signature: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', decodeBase64(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
  return timingSafeEqual(encodeBase64(new Uint8Array(mac)), signature.trim());
}

/** Recording states only move forward, so replays and late events are safe. */
const RANK: Record<string, number> = { requested: 0, recording: 1, processing: 2, ready: 3, error: 3 };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*' } });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const secret = Deno.env.get('DAILY_WEBHOOK_HMAC');
  const rawBody = await req.text();
  const timestamp = req.headers.get('X-Webhook-Timestamp') || '';
  const signature = req.headers.get('X-Webhook-Signature') || '';

  if (!secret) {
    console.error('[daily-webhook] HMAC secret not configured');
    return json({ error: 'not_configured' }, 401);
  }
  if (!timestamp || !signature || !(await verifySignature(rawBody, timestamp, signature, secret).catch(() => false))) {
    return json({ error: 'invalid_signature' }, 401);
  }

  let payload: Record<string, any> = {};
  try { payload = JSON.parse(rawBody); } catch { return json({ error: 'invalid_payload' }, 400); }

  // Daily's endpoint validation ping. Signed, so it proves the secret matches.
  if (payload.test === 'test') return json({ received: true, test: true }, 200);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const eventType: string = payload.type || payload.event_type || 'unknown';
  const data: Record<string, any> = payload.payload || payload.data || payload;
  const roomName: string | null = data.room_name || data.room || null;
  const sessionId: string | null = data.meeting_session_id || data.session_id || data.mtgSessionId || null;
  const recordingId: string | null = data.recording_id || data.recordingId || data.id || null;
  const participantId: string | null = data.user_id || data.participant_id || null;
  const dedupeKey = [eventType, sessionId || '', recordingId || '', participantId || '', payload.event_ts || timestamp].join('|');

  const { error: dupeError } = await admin.from('daily_webhook_events').insert({
    dedupe_key: dedupeKey,
    event_type: eventType,
    provider_event_id: payload.id || null,
    room_name: roomName,
    session_id: sessionId,
    event_ts: payload.event_ts ? new Date(Number(payload.event_ts) * 1000).toISOString() : new Date().toISOString(),
    payload: { type: eventType, room_name: roomName, session_id: sessionId, recording_id: recordingId },
  });
  // A duplicate delivery is a success, not an error.
  if (dupeError) return json({ received: true, duplicate: true }, 200);

  try {
    let walkthroughId: string | null = null;
    if (roomName) {
      const { data: room } = await admin
        .from('video_walkthrough_provider_rooms')
        .select('walkthrough_id')
        .eq('room_name', roomName)
        .maybeSingle();
      walkthroughId = room?.walkthrough_id ?? null;
    }
    if (!walkthroughId && recordingId) {
      const { data: rec } = await admin
        .from('video_walkthrough_recordings')
        .select('walkthrough_id')
        .eq('provider_recording_id', recordingId)
        .maybeSingle();
      walkthroughId = rec?.walkthrough_id ?? null;
    }
    if (walkthroughId) await admin.from('daily_webhook_events').update({ walkthrough_id: walkthroughId }).eq('dedupe_key', dedupeKey);

    if (walkthroughId) {
      const { data: w } = await admin
        .from('video_walkthroughs')
        .select('id, buyer_id, seller_id, meeting_type, meeting_started_at, meeting_ended_at, listing:listings(title)')
        .eq('id', walkthroughId)
        .maybeSingle();

      const nowIso = new Date().toISOString();

      switch (eventType) {
        case 'meeting.started':
          await admin.from('video_walkthroughs').update({ meeting_started_at: nowIso }).eq('id', walkthroughId).is('meeting_started_at', null);
          break;

        case 'meeting.ended': {
          await admin.from('video_walkthroughs').update({ meeting_ended_at: nowIso }).eq('id', walkthroughId).is('meeting_ended_at', null);
          await admin.from('video_walkthrough_participants').update({ is_present: false, last_left_at: nowIso }).eq('walkthrough_id', walkthroughId).eq('is_present', true);
          break;
        }

        case 'participant.joined':
          if (participantId) {
            await admin.from('video_walkthrough_participants')
              .update({ is_present: true, last_joined_at: nowIso, meeting_session_id: sessionId })
              .eq('walkthrough_id', walkthroughId).eq('user_id', participantId);
          }
          break;

        case 'participant.left':
          if (participantId) {
            await admin.from('video_walkthrough_participants')
              .update({ is_present: false, last_left_at: nowIso })
              .eq('walkthrough_id', walkthroughId).eq('user_id', participantId);
          }
          break;

        case 'recording.started': {
          const { data: row } = await admin.from('video_walkthrough_recordings')
            .select('id, status').eq('walkthrough_id', walkthroughId).in('status', ['requested', 'recording']).maybeSingle();
          if (row && RANK[row.status] <= RANK.recording) {
            await admin.from('video_walkthrough_recordings')
              .update({ status: 'recording', started_at: nowIso, provider_recording_id: recordingId })
              .eq('id', row.id);
          }
          break;
        }

        case 'recording.ready-to-download':
        case 'recording.ready': {
          const { data: row } = await admin.from('video_walkthrough_recordings')
            .select('id, status').eq('walkthrough_id', walkthroughId)
            .order('created_at', { ascending: false }).limit(1).maybeSingle();
          if (row && RANK[row.status] < RANK.ready) {
            // Only the provider recording id is stored — never a playback URL.
            await admin.from('video_walkthrough_recordings').update({
              status: 'ready',
              ready_at: nowIso,
              provider_recording_id: recordingId,
              duration_seconds: Number(data.duration) || null,
            }).eq('id', row.id);

            for (const userId of [w?.buyer_id, w?.seller_id].filter(Boolean) as string[]) {
              await admin.from('notifications').insert({
                user_id: userId,
                type: 'walkthrough_recording_ready',
                title: 'Your walkthrough recording is ready.',
                message: `${(w as any)?.listing?.title || 'Your walkthrough'} — the recording of your video walkthrough is ready to view.`,
                link: `/walkthrough/${walkthroughId}`,
              });
            }
          }
          break;
        }

        case 'recording.error': {
          const { data: row } = await admin.from('video_walkthrough_recordings')
            .select('id, status').eq('walkthrough_id', walkthroughId)
            .order('created_at', { ascending: false }).limit(1).maybeSingle();
          if (row && row.status !== 'ready') {
            await admin.from('video_walkthrough_recordings').update({
              status: 'error',
              error_code: String(data.error_code || 'recording_error').slice(0, 80),
              error_message: 'The recording could not be finalized.',
            }).eq('id', row.id);

            for (const userId of [w?.buyer_id, w?.seller_id].filter(Boolean) as string[]) {
              await admin.from('notifications').insert({
                user_id: userId,
                type: 'walkthrough_recording_error',
                title: 'Recording could not be finalized',
                message: 'The video call completed, but the recording could not be finalized. Vendibook Support can review the meeting record.',
                link: `/walkthrough/${walkthroughId}`,
              });
            }
          }
          break;
        }

        default:
          break;
      }
    }

    await admin.from('daily_webhook_events').update({ processed_at: new Date().toISOString() }).eq('dedupe_key', dedupeKey);
    return json({ received: true }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'processing failed';
    console.error('[daily-webhook]', eventType, message);
    await admin.from('daily_webhook_events').update({ process_error: message.slice(0, 300) }).eq('dedupe_key', dedupeKey);
    // 200 keeps Daily from retrying a payload we already stored for review.
    return json({ received: true }, 200);
  }
});
