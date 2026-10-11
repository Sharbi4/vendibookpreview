import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Check, CircleDot, Loader2, MapPin, Mic, RefreshCw, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  DEVICE_PRIVACY_VERSION,
  WALKTHROUGH_TERMS_VERSION,
  recordWalkthroughConsent,
  requestLocationPermission,
  requestMediaPermission,
  queryPermission,
  type PermissionState,
} from '@/lib/walkthroughConsent';
import { RECORDING_CONSENT_VERSION } from '@/lib/legal/versions';
import { recordLegalAcceptance } from '@/lib/legal/recordAcceptance';
import { meetingProfile } from '@/lib/meetingTypes';

/**
 * Pre-call gate: "Ready for your walkthrough?"
 *
 * Nobody enters the video room until the required terms are accepted, the
 * recording of this meeting is explicitly agreed to, and the browser has
 * actually granted camera + microphone. Location is shown only when the
 * specific flow requires it. No permission state is ever faked, and refusing
 * the recording means no entry — never a quiet downgrade.
 */
type Props = {
  walkthroughId: string;
  title: string;
  meetingType?: string | null;
  /** True only for a flow that genuinely depends on device geolocation. */
  requiresLocation?: boolean;
  /** Link target for rescheduling, when the participant declines recording. */
  rescheduleTo?: string;
  onReady: () => void;
  onCancel: () => void;
};

const LABEL: Record<PermissionState, string> = {
  'not-requested': 'Not requested yet',
  granted: 'Ready',
  denied: 'Blocked',
  unavailable: 'Not available on this device',
};

function Row({ icon, name, state, hint }: { icon: React.ReactNode; name: string; state: PermissionState; hint: string }) {
  return (
    <li className={`wc-perm is-${state}`}>
      <span className="wc-perm-icon">{icon}</span>
      <span className="wc-perm-body">
        <strong>{name}</strong>
        <small>{state === 'granted' ? hint : LABEL[state]}</small>
      </span>
      <span className="wc-perm-state">{state === 'granted' ? <Check /> : state === 'denied' ? <X /> : '—'}</span>
    </li>
  );
}

export default function WalkthroughConsentGate({
  walkthroughId, title, meetingType, requiresLocation = false, rescheduleTo, onReady, onCancel,
}: Props) {
  const { user } = useAuth();
  const profile = meetingProfile(meetingType);
  const [camera, setCamera] = useState<PermissionState>('not-requested');
  const [microphone, setMicrophone] = useState<PermissionState>('not-requested');
  const [location, setLocation] = useState<PermissionState>('not-requested');
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [c, m] = await Promise.all([queryPermission('camera'), queryPermission('microphone')]);
      if (cancelled) return;
      setCamera(c);
      setMicrophone(m);
      if (requiresLocation) setLocation(await queryPermission('location'));
    })();
    return () => { cancelled = true; };
  }, [requiresLocation]);

  const checkDevices = useCallback(async () => {
    setChecking(true);
    setMessage('');
    const result = await requestMediaPermission();
    setCamera(result.camera);
    setMicrophone(result.microphone);
    if (requiresLocation) setLocation(await requestLocationPermission());
    setChecking(false);
  }, [requiresLocation]);

  const mediaReady = camera === 'granted' && microphone === 'granted';
  const locationReady = !requiresLocation || location === 'granted';
  // Recording consent is mandatory: this meeting is recorded, so nobody enters
  // the room without agreeing to it first.
  const termsReady = terms && privacy && recording;
  const canJoin = mediaReady && locationReady && termsReady;

  const helper = !termsReady
    ? 'Please review and accept the required terms to continue.'
    : !mediaReady
      ? 'Camera and microphone access are required to join your video walkthrough.'
      : !locationReady
        ? 'This step confirms where the handoff happens, so location access is needed to continue.'
        : '';

  const join = async () => {
    if (!canJoin || !user) return;
    setSaving(true);
    const { error } = await recordWalkthroughConsent(user.id, {
      walkthroughId,
      meetingType: meetingType ?? null,
      camera,
      microphone,
      locationRequired: requiresLocation,
      location,
      recordingConsent: recording,
    });
    // Versioned acceptance rows for the same three documents, so the legal
    // evidence view shows exactly which version each participant accepted.
    await recordLegalAcceptance({
      userId: user.id,
      slugs: ['video-walkthrough-terms', 'device-permissions-privacy', 'recording-consent'],
      surface: 'walkthrough_prejoin',
      relatedEntityType: 'walkthrough',
      relatedEntityId: walkthroughId,
      grantedPermissions: {
        camera: camera === 'granted',
        microphone: microphone === 'granted',
        location: requiresLocation && location === 'granted',
        recording: recording,
      },
    }).catch(() => undefined);
    setSaving(false);
    if (error) {
      setMessage('We could not save your consent just now. Please try again.');
      return;
    }
    onReady();
  };

  if (declined) {
    return (
      <div className="wc-gate">
        <div className="wc-gate-head">
          <span className="wc-gate-kicker"><Video /> Vendibook {profile.label.toLowerCase()}</span>
          <h1>You can’t join without agreeing to the recording</h1>
          <p>{title}</p>
        </div>
        <section className="wc-block">
          <p>
            This meeting is recorded, so there is no way to enter the room without consenting. You
            still have options, and your scheduled time stays saved until you cancel it.
          </p>
          <div className="wc-actions">
            <Button variant="outline" onClick={() => setDeclined(false)}>Back to the consent screen</Button>
            {rescheduleTo && <Button asChild variant="outline"><Link to={rescheduleTo}>Reschedule</Link></Button>}
            <Button asChild><Link to="/support">Contact Vendibook Support</Link></Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="wc-gate">
      <div className="wc-gate-head">
        <span className="wc-gate-kicker"><Video /> Vendibook {profile.label.toLowerCase()}</span>
        <h1>Ready for your walkthrough?</h1>
        <p>{title}</p>
      </div>

      <section className="wc-block">
        <div className="wc-block-head">
          <h2>Device check</h2>
          <button type="button" className="wc-recheck" onClick={checkDevices} disabled={checking}>
            {checking ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            {camera === 'not-requested' && microphone === 'not-requested' ? 'Allow camera & mic' : 'Check again'}
          </button>
        </div>
        <ul className="wc-perms">
          <Row icon={<Camera />} name="Camera" state={camera} hint="Ready" />
          <Row icon={<Mic />} name="Microphone" state={microphone} hint="Ready" />
          {requiresLocation && (
            <Row icon={<MapPin />} name="Location" state={location} hint="Ready for handoff confirmation" />
          )}
        </ul>
        {(camera === 'denied' || microphone === 'denied' || (requiresLocation && location === 'denied')) && (
          <p className="wc-note">
            Access is blocked in your browser. Open the lock or camera icon in the address bar (on
            iPhone, Settings → Safari, or Settings → Vendibook on Android), allow the blocked
            permission, then choose <strong>Check again</strong>.
          </p>
        )}
        {(camera === 'unavailable' || microphone === 'unavailable') && (
          <p className="wc-note">
            We could not find a camera or microphone on this device. You can join from a phone or a
            laptop with a camera instead — your scheduled walkthrough stays saved.
          </p>
        )}
      </section>

      <section className="wc-block wc-recording-block">
        <h2><CircleDot className="wc-rec-dot" /> This walkthrough will be recorded</h2>
        <p>
          Vendibook records this meeting in the cloud. Recording starts automatically once everyone
          who needs to be here has agreed and joined, and stops when the meeting ends. You’ll see a
          red “Recording” indicator in the call while it is running.
        </p>
        <p>
          The recording is stored securely by Vendibook and its video provider, and it is used for
          safety, quality, fraud prevention, and resolving a dispute about this transaction. You and
          the other participant can view it from this meeting’s page, and authorised Vendibook staff
          can review it. There is no transcription, no AI analysis, and no face recognition applied
          to it.
        </p>
        <p>
          A recording is not automatic proof of anything on its own, and it may be incomplete if a
          connection drops. Keep anything important in Vendibook messages as well. Recording
          retention follows Vendibook’s published policy; see the{' '}
          <Link to="/legal/recording-consent" target="_blank" rel="noreferrer">Recording &amp; Monitoring Notice</Link>.
        </p>
        <label className="wc-check wc-check-strong">
          <input type="checkbox" checked={recording} onChange={(e) => { setRecording(e.target.checked); if (e.target.checked) setDeclined(false); }} />
          <span>I agree to participate in this recorded video walkthrough.</span>
        </label>
        <button type="button" className="wc-decline" onClick={() => { setRecording(false); setDeclined(true); }}>
          I do not agree to be recorded
        </button>
      </section>

      <section className="wc-block">
        <h2>Before you join</h2>
        <label className="wc-check">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
          <span>
            I agree to the{' '}
            <Link to="/legal/video-walkthrough-terms" target="_blank" rel="noreferrer">
              Vendibook Video Walkthrough Terms of Use
            </Link>
            .
          </span>
        </label>
        <label className="wc-check">
          <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} />
          <span>
            I acknowledge the{' '}
            <Link to="/legal/device-permissions-privacy" target="_blank" rel="noreferrer">
              Vendibook Privacy Notice
            </Link>{' '}
            and understand how camera, microphone, and device permissions are used for this
            walkthrough.
          </span>
        </label>
        <p className="wc-fineprint">
          Keep messages, offers and payments on Vendibook — off-platform deals can’t be verified or
          protected if something goes wrong.
        </p>
        <p className="wc-fineprint">
          Only you and the other participant can join this room. Chat and screen sharing are turned
          off for this meeting.
        </p>
      </section>

      {message && <p className="wc-note">{message}</p>}

      <div className="wc-actions">
        <Button variant="outline" onClick={onCancel}>Back to details</Button>
        <Button onClick={join} disabled={!canJoin || saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Video />}
          Join walkthrough
        </Button>
      </div>
      {helper && <p className="wc-helper">{helper}</p>}
      <p className="wc-version">
        Terms v{WALKTHROUGH_TERMS_VERSION} · Privacy notice v{DEVICE_PRIVACY_VERSION} · Recording notice v
        {RECORDING_CONSENT_VERSION}
      </p>
    </div>
  );
}
