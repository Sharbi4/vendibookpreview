import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Check, Loader2, MapPin, Mic, RefreshCw, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  DEVICE_PRIVACY_VERSION,
  WALKTHROUGH_RECORDING_ENABLED,
  WALKTHROUGH_TERMS_VERSION,
  recordWalkthroughConsent,
  requestLocationPermission,
  requestMediaPermission,
  queryPermission,
  type PermissionState,
} from '@/lib/walkthroughConsent';

/**
 * Pre-call gate: "Ready for your walkthrough?"
 *
 * Nobody enters the video room until the required terms are accepted and the
 * browser has actually granted camera + microphone. Location is shown only when
 * the specific flow requires it. No permission state is ever faked.
 */
type Props = {
  walkthroughId: string;
  title: string;
  /** True only for a flow that genuinely depends on device geolocation. */
  requiresLocation?: boolean;
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

export default function WalkthroughConsentGate({ walkthroughId, title, requiresLocation = false, onReady, onCancel }: Props) {
  const { user } = useAuth();
  const [camera, setCamera] = useState<PermissionState>('not-requested');
  const [microphone, setMicrophone] = useState<PermissionState>('not-requested');
  const [location, setLocation] = useState<PermissionState>('not-requested');
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [recording, setRecording] = useState(false);
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
  // Monitoring/recording acknowledgment is always required — a walkthrough may be
  // monitored or recorded, so nobody enters the room without consenting to that.
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
      camera,
      microphone,
      locationRequired: requiresLocation,
      location,
      recordingConsent: WALKTHROUGH_RECORDING_ENABLED ? recording : false,
    });
    setSaving(false);
    if (error) {
      setMessage('We could not save your consent just now. Please try again.');
      return;
    }
    onReady();
  };

  return (
    <div className="wc-gate">
      <div className="wc-gate-head">
        <span className="wc-gate-kicker"><Video /> Vendibook walkthrough</span>
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
        {WALKTHROUGH_RECORDING_ENABLED && (
          <label className="wc-check">
            <input type="checkbox" checked={recording} onChange={(e) => setRecording(e.target.checked)} />
            <span>
              I consent to this walkthrough being recorded and understand how the recording will be
              used and retained.
            </span>
          </label>
        )}
        <p className="wc-fineprint">
          {WALKTHROUGH_RECORDING_ENABLED
            ? 'Recording is on for this walkthrough.'
            : 'This walkthrough is not recorded or transcribed. Only you and the other participant can join.'}
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
        Terms v{WALKTHROUGH_TERMS_VERSION} · Privacy notice v{DEVICE_PRIVACY_VERSION}
      </p>
    </div>
  );
}
