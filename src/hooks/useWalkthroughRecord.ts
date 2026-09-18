import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * The transaction record for one meeting: who was required, who really joined,
 * who consented to recording, and the state of the recording itself.
 *
 * Everything here is read through row-level security — a non-participant gets
 * empty results, never a leak.
 */
export type MeetingParticipant = {
  user_id: string;
  role: string;
  is_present: boolean;
  first_joined_at: string;
  last_joined_at: string;
  last_left_at: string | null;
};

export type MeetingRecording = {
  id: string;
  status: 'requested' | 'recording' | 'processing' | 'ready' | 'error';
  started_at: string | null;
  ready_at: string | null;
  duration_seconds: number | null;
  created_at: string;
};

export function useWalkthroughRecord(walkthroughId?: string, pollMs = 0) {
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [recording, setRecording] = useState<MeetingRecording | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!walkthroughId) { setIsLoading(false); return; }
    const [p, c, r] = await Promise.all([
      (supabase.from('video_walkthrough_participants') as any)
        .select('user_id, role, is_present, first_joined_at, last_joined_at, last_left_at')
        .eq('walkthrough_id', walkthroughId),
      (supabase.from('video_walkthrough_consents') as any)
        .select('user_id, recording_consent_granted')
        .eq('walkthrough_id', walkthroughId),
      (supabase.from('video_walkthrough_recordings') as any)
        .select('id, status, started_at, ready_at, duration_seconds, created_at')
        .eq('walkthrough_id', walkthroughId)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);
    setParticipants((p.data || []) as MeetingParticipant[]);
    const map: Record<string, boolean> = {};
    for (const row of c.data || []) if (row.recording_consent_granted) map[row.user_id] = true;
    setConsents(map);
    setRecording(((r.data || [])[0] as MeetingRecording) || null);
    setIsLoading(false);
  }, [walkthroughId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!pollMs) return;
    const id = window.setInterval(load, pollMs);
    return () => window.clearInterval(id);
  }, [pollMs, load]);

  return { participants, consents, recording, isLoading, refetch: load };
}

/** Requests a short-lived playback link. The link is never stored or cached. */
export async function openRecording(recordingId: string) {
  const { data, error } = await supabase.functions.invoke('video-walkthrough-recording-access', {
    body: { recording_id: recordingId },
  });
  if (error || !data?.url) return { error: 'The recording could not be opened right now.' };
  window.open(data.url, '_blank', 'noopener,noreferrer');
  return { error: null };
}
