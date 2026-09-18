/**
 * Server-controlled cloud recording for Vendibook meetings.
 *
 * Recording only ever starts when BOTH conditions are true:
 *   1. every required participant has explicitly consented to being recorded
 *      for this meeting, under the current recording notice version; and
 *   2. every required participant is actually present in the room.
 *
 * The browser cannot start, stop, or request a recording. `maybeStartRecording`
 * is idempotent: a partial unique index allows only one row per walkthrough in
 * `requested` or `recording` state, so concurrent join hooks cannot double-start.
 */
import { LEGAL_VERSIONS } from './legalVersions.ts';
import { getVideoProvider, VideoProviderUnavailableError } from './videoProvider.ts';
import { recordingMaxDurationSeconds, roomProfileFor } from './videoMeetings.ts';

type Db = { from: (t: string) => any };

export type RecordingAttempt =
  | { started: false; reason: 'already_active' | 'missing_consent' | 'participants_absent' | 'no_room' | 'provider_unavailable' | 'provider_error' }
  | { started: true; recordingRowId: string };

/** Required participants for a meeting: both sides of the transaction. */
const requiredUserIds = (w: { buyer_id: string; seller_id: string }) => [w.buyer_id, w.seller_id];

export async function hasRecordingConsent(db: Db, walkthroughId: string, userId: string): Promise<boolean> {
  const { data } = await db
    .from('video_walkthrough_consents')
    .select('id')
    .eq('walkthrough_id', walkthroughId)
    .eq('user_id', userId)
    .eq('recording_consent_granted', true)
    .limit(1);
  if (Array.isArray(data) && data.length > 0) return true;
  // Fall back to the versioned acceptance ledger for the recording notice.
  const { data: accepted } = await db
    .from('legal_acceptances')
    .select('id')
    .eq('user_id', userId)
    .eq('document_slug', 'recording-consent')
    .eq('document_version', LEGAL_VERSIONS['recording-consent'])
    .limit(1);
  return Array.isArray(accepted) && accepted.length > 0;
}

export async function consentStatus(db: Db, w: { id: string; buyer_id: string; seller_id: string }) {
  const entries = await Promise.all(
    requiredUserIds(w).map(async (userId) => [userId, await hasRecordingConsent(db, w.id, userId)] as const),
  );
  return {
    byUser: Object.fromEntries(entries) as Record<string, boolean>,
    all: entries.every(([, ok]) => ok),
  };
}

export async function presenceStatus(db: Db, walkthroughId: string, userIds: string[]) {
  const { data } = await db
    .from('video_walkthrough_participants')
    .select('user_id, is_present')
    .eq('walkthrough_id', walkthroughId);
  const present = new Set((data || []).filter((r: any) => r.is_present).map((r: any) => r.user_id));
  return { present, all: userIds.every((id) => present.has(id)) };
}

/**
 * Start the cloud recording when the meeting is fully consented and fully
 * attended. Safe to call on every join event.
 */
export async function maybeStartRecording(
  db: Db,
  w: { id: string; buyer_id: string; seller_id: string; meeting_type: string; starts_at: string; ends_at: string },
): Promise<RecordingAttempt> {
  const { data: active } = await db
    .from('video_walkthrough_recordings')
    .select('id')
    .eq('walkthrough_id', w.id)
    .in('status', ['requested', 'recording'])
    .limit(1);
  if (Array.isArray(active) && active.length > 0) return { started: false, reason: 'already_active' };

  const consent = await consentStatus(db, w);
  if (!consent.all) return { started: false, reason: 'missing_consent' };

  const presence = await presenceStatus(db, w.id, requiredUserIds(w));
  if (!presence.all) return { started: false, reason: 'participants_absent' };

  const { data: room } = await db
    .from('video_walkthrough_provider_rooms')
    .select('room_name, provider')
    .eq('walkthrough_id', w.id)
    .maybeSingle();
  if (!room?.room_name) return { started: false, reason: 'no_room' };

  const profile = roomProfileFor(w.meeting_type);
  const maxDuration = recordingMaxDurationSeconds(profile, w.starts_at, w.ends_at);

  // Claim the slot BEFORE calling the provider. The partial unique index is the
  // concurrency guard; a lost race simply means somebody else already started.
  const { data: claimed, error: claimError } = await db
    .from('video_walkthrough_recordings')
    .insert({
      walkthrough_id: w.id,
      provider: room.provider || 'daily',
      room_name: room.room_name,
      meeting_type: w.meeting_type,
      status: 'requested',
      max_duration_seconds: maxDuration,
    })
    .select('id')
    .single();
  if (claimError || !claimed) return { started: false, reason: 'already_active' };

  try {
    const provider = getVideoProvider(room.provider || 'daily');
    const result = await provider.startCloudRecording(room.room_name, maxDuration);
    await db
      .from('video_walkthrough_recordings')
      .update({
        status: 'recording',
        started_at: new Date().toISOString(),
        provider_recording_id: result.recordingId,
        instance_id: result.instanceId,
      })
      .eq('id', claimed.id);
    await db.from('video_walkthrough_events').insert({
      walkthrough_id: w.id,
      actor_id: null,
      event_type: 'recording_started',
      metadata: { source: 'server_auto_start' },
    });
    return { started: true, recordingRowId: claimed.id };
  } catch (e) {
    const unavailable = e instanceof VideoProviderUnavailableError;
    await db
      .from('video_walkthrough_recordings')
      .update({
        status: 'error',
        error_code: unavailable ? 'provider_unavailable' : 'start_failed',
        error_message: 'The recording could not be started.',
      })
      .eq('id', claimed.id);
    return { started: false, reason: unavailable ? 'provider_unavailable' : 'provider_error' };
  }
}
