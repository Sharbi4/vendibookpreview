import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CalendarPlus, CircleDot, Clock, Link2 as LinkIcon, MessageCircle, PlayCircle, Users, Video, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { downloadWalkthroughIcs, formatWalkthroughTime } from '@/lib/videoWalkthroughs';
import { meetingProfile } from '@/lib/meetingTypes';
import { openRecording, useWalkthroughRecord } from '@/hooks/useWalkthroughRecord';
import VendibookVideoCall from '@/components/video/VendibookVideoCall';
import WalkthroughConsentGate from '@/components/video/WalkthroughConsentGate';
import { toast } from 'sonner';

const RECORDING_COPY: Record<string, string> = {
  requested: 'Starting — the recording begins once everyone has joined.',
  recording: 'Recording in progress.',
  processing: 'The meeting ended. The recording is still being prepared.',
  ready: 'The recording is ready to view.',
  error: 'The video call completed, but the recording could not be finalized. Vendibook Support can review the meeting record.',
};

export default function WalkthroughDetail() {
  const { walkthroughId } = useParams();
  const { user, isLoading: loading } = useAuth();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [w, setW] = useState<any>();
  const [stage, setStage] = useState<'none' | 'gate' | 'call'>('none');

  const load = () => walkthroughId && (supabase.from('video_walkthroughs') as any)
    .select('*,listing:listings(title,cover_image_url,mode,host_id)')
    .eq('id', walkthroughId).maybeSingle()
    .then(({ data }: any) => setW(data));
  useEffect(() => { load(); }, [walkthroughId]);

  const { participants, consents, recording, refetch } = useWalkthroughRecord(walkthroughId);

  const profile = meetingProfile(w?.meeting_type);
  const parties = useMemo(() => {
    if (!w) return [] as { id: string; label: string }[];
    return [
      { id: w.seller_id, label: profile.hostLabel },
      { id: w.buyer_id, label: profile.guestLabel },
    ];
  }, [w, profile]);

  if (!loading && !user) return <Navigate to={`/auth?redirect=/walkthrough/${walkthroughId}`} replace />;
  if (!w) return <main className="walkthrough-page"><div className="walkthrough-container walkthrough-loading">Loading walkthrough…</div></main>;

  const active = ['scheduled', 'rescheduled'].includes(w.status);
  const now = Date.now();
  const canJoin = active
    && now >= +new Date(w.starts_at) - profile.joinBeforeMinutes * 60_000
    && now <= +new Date(w.ends_at) + profile.joinAfterMinutes * 60_000;

  const durationMinutes = w.meeting_started_at && w.meeting_ended_at
    ? Math.max(1, Math.round((+new Date(w.meeting_ended_at) - +new Date(w.meeting_started_at)) / 60_000))
    : null;

  const cancel = async () => {
    if (!confirm('Cancel this walkthrough? The other participant will be notified.')) return;
    const { error } = await (supabase.rpc as any)('cancel_video_walkthrough', { _walkthrough_id: w.id });
    if (error) return toast.error('Could not cancel.');
    await supabase.functions.invoke('video-walkthrough-notify', { body: { walkthrough_id: w.id, action: 'cancelled' } });
    toast.success('Walkthrough cancelled.');
    load();
  };

  const handleLeave = async ({ joined }: { joined: boolean }) => {
    setStage('none');
    if (!joined) { load(); return; }
    try { await supabase.functions.invoke('video-walkthrough-exit', { body: { walkthrough_id: w.id } }); } catch { /* exit record is best effort */ }
    navigate(`/walkthrough/${w.id}/next-steps`, { replace: true });
  };

  if (stage === 'gate') {
    return (
      <main className="walkthrough-page walkthrough-call-page">
        <div className="walkthrough-container">
          <WalkthroughConsentGate
            walkthroughId={w.id}
            title={w.listing?.title || profile.label}
            meetingType={w.meeting_type}
            requiresLocation={false}
            rescheduleTo={`/walkthrough/schedule/${w.listing_id}?reschedule=${w.id}`}
            onReady={() => { refetch(); setStage('call'); }}
            onCancel={() => setStage('none')}
          />
        </div>
      </main>
    );
  }

  if (stage === 'call') {
    return (
      <main className="walkthrough-page walkthrough-call-page">
        <VendibookVideoCall walkthroughId={w.id} title={w.listing?.title || profile.label} meetingType={w.meeting_type} onLeave={handleLeave} />
      </main>
    );
  }

  const view = async () => {
    if (!recording) return;
    const { error } = await openRecording(recording.id);
    if (error) toast.error(error);
  };

  return (
    <main className="walkthrough-page">
      <header className="walkthrough-topbar">
        <Link to="/dashboard"><span>←</span> Dashboard</Link>
        <Link to="/" className="walkthrough-brand">VENDIBOOK</Link>
      </header>

      <div className="walkthrough-container">
        <div className="walkthrough-heading">
          <p>{search.get('confirmed') ? 'You’re scheduled' : `${profile.label} details`}</p>
          <h1>{w.listing?.title}</h1>
          <span>{profile.blurb}</span>
        </div>

        <div className="walkthrough-detail-grid">
          <section className="walkthrough-card walkthrough-meeting-card">
            {w.listing?.cover_image_url && <img src={w.listing.cover_image_url} alt="" />}
            <div>
              <span className={`v2-status ${active ? 'is-ok' : 'is-alert'}`}>{w.status}</span>
              <h2>{formatWalkthroughTime(w.starts_at)}</h2>
              <p><Clock /> {Math.round((+new Date(w.ends_at) - +new Date(w.starts_at)) / 60000)} minutes · {w.timezone_snapshot}</p>
              <p className="walkthrough-meeting-type">{profile.label}</p>
            </div>
          </section>

          <section className="walkthrough-card walkthrough-detail-actions">
            <h2>Meeting access</h2>
            {canJoin ? (
              <Button onClick={() => setStage('gate')}><Video />Join {profile.label.toLowerCase()}</Button>
            ) : (
              <p>{active
                ? `Join opens ${profile.joinBeforeMinutes} minutes before the scheduled start and closes ${profile.joinAfterMinutes} minutes after the meeting ends.`
                : 'This meeting is no longer active.'}</p>
            )}
            {active && (
              <div className="walkthrough-roomlink">
                <span>Your meeting room link</span>
                <code>{`${window.location.origin}/walkthrough/${w.id}`}</code>
                <button onClick={() => {
                  navigator.clipboard?.writeText(`${window.location.origin}/walkthrough/${w.id}`)
                    .then(() => toast.success('Meeting link copied.'), () => toast.error('Could not copy the link.'));
                }}><LinkIcon />Copy link</button>
                <small>Same link for both of you. It only opens for the {profile.guestLabel.toLowerCase()} and {profile.hostLabel.toLowerCase()} on this meeting.</small>
              </div>
            )}
            <div className="walkthrough-action-list">
              <button onClick={() => downloadWalkthroughIcs(w)}><CalendarPlus />Add to calendar</button>
              {w.conversation_id && <Link to={`/dashboard/messages/${w.conversation_id}`}><MessageCircle />Message</Link>}
              {active && (
                <>
                  <Link to={`/walkthrough/schedule/${w.listing_id}?reschedule=${w.id}`}><Clock />Reschedule</Link>
                  <button onClick={cancel}><XCircle />Cancel walkthrough</button>
                </>
              )}
            </div>
          </section>

          <section className="walkthrough-card walkthrough-record-card">
            <h2><Users /> Meeting record</h2>
            <ul className="walkthrough-party-list">
              {parties.map((party) => {
                const presence = participants.find((p) => p.user_id === party.id);
                return (
                  <li key={party.id}>
                    <strong>{party.label}</strong>
                    <span>{consents[party.id] ? 'Consented to recording' : 'Recording consent not given yet'}</span>
                    <span>
                      {presence
                        ? `Joined ${formatWalkthroughTime(presence.first_joined_at)}${presence.is_present ? ' · in the room now' : ''}`
                        : 'Has not joined this meeting'}
                    </span>
                  </li>
                );
              })}
            </ul>
            {durationMinutes !== null && <p className="walkthrough-duration"><Clock /> Call duration: {durationMinutes} minutes</p>}
            <div className="walkthrough-recording-state">
              <p><CircleDot /> {recording ? RECORDING_COPY[recording.status] : 'No recording yet. It starts automatically once everyone has consented and joined.'}</p>
              {recording?.status === 'ready' && (
                <Button variant="outline" onClick={view}><PlayCircle />View recording</Button>
              )}
              {recording?.status === 'ready' && <small>The viewing link is created on demand and expires shortly after you open it.</small>}
            </div>
          </section>

          <section className="walkthrough-card walkthrough-topics-summary">
            <h2>What to cover</h2>
            {w.requested_topics?.length
              ? <ul>{w.requested_topics.map((t: string) => <li key={t}>{t}</li>)}</ul>
              : <ul>{profile.checklist.map((t) => <li key={t}>{t}</li>)}</ul>}
            {w.buyer_note && <blockquote>{w.buyer_note}</blockquote>}
            <p className="walkthrough-legal-links">
              This meeting is recorded. You’ll accept the <Link to="/legal/video-walkthrough-terms">Walkthrough Terms of Use</Link>,{' '}
              <Link to="/legal/device-permissions-privacy">Privacy Notice</Link> and{' '}
              <Link to="/legal/recording-consent">Recording &amp; Monitoring Notice</Link> before joining.
            </p>
            <p className="walkthrough-legal-links">
              Keep your chat, offers and payments on Vendibook — it protects both of you from scams and gives us a record if there’s a dispute.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
