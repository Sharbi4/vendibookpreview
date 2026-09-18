import { supabase } from '@/integrations/supabase/client';

/**
 * Consent + device-permission rules for native Vendibook video walkthroughs.
 *
 * Browsing, saving, messaging and ordinary checkout never touch this module —
 * camera/microphone are required ONLY to join a live walkthrough, and browser
 * geolocation is required only for a flow that genuinely depends on it.
 */

/** Bump when the legal copy on the linked pages materially changes. */
export const WALKTHROUGH_TERMS_VERSION = '2026-09-18b';
export const DEVICE_PRIVACY_VERSION = '2026-09-18b';

/**
 * Monitoring / recording disclosure.
 *
 * Every participant must explicitly consent, before entering the room, that a
 * walkthrough MAY be monitored or recorded for safety, quality and dispute
 * resolution. The consent is stored per participant in
 * `video_walkthrough_consents.recording_consent_granted`.
 *
 * Automatic cloud recording is not switched on in the video provider today, so
 * copy must always say "may be" — never assert that a given call was recorded.
 */
export const WALKTHROUGH_RECORDING_DISCLOSURE = true;

export type PermissionState = 'not-requested' | 'granted' | 'denied' | 'unavailable';

export type PermissionKind = 'camera' | 'microphone' | 'location';

/** Read a permission without prompting, when the browser supports it. */
export async function queryPermission(kind: PermissionKind): Promise<PermissionState> {
  const name = kind === 'microphone' ? 'microphone' : kind === 'camera' ? 'camera' : 'geolocation';
  if (kind !== 'location' && !navigator.mediaDevices?.getUserMedia) return 'unavailable';
  if (kind === 'location' && !navigator.geolocation) return 'unavailable';
  try {
    const status = await (navigator.permissions as any)?.query({ name });
    if (!status) return 'not-requested';
    if (status.state === 'granted') return 'granted';
    if (status.state === 'denied') return 'denied';
    return 'not-requested';
  } catch {
    // Safari and older browsers cannot query camera/mic; ask directly instead.
    return 'not-requested';
  }
}

/** Prompt for camera + microphone. Tracks are stopped immediately after. */
export async function requestMediaPermission(): Promise<{ camera: PermissionState; microphone: PermissionState }> {
  if (!navigator.mediaDevices?.getUserMedia) return { camera: 'unavailable', microphone: 'unavailable' };
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return { camera: 'granted', microphone: 'granted' };
  } catch {
    // Fall back to isolating which of the two was refused or is missing.
    const one = async (constraints: MediaStreamConstraints): Promise<PermissionState> => {
      try {
        const s = await navigator.mediaDevices.getUserMedia(constraints);
        s.getTracks().forEach((t) => t.stop());
        return 'granted';
      } catch (err) {
        const name = (err as DOMException)?.name;
        return name === 'NotFoundError' || name === 'OverconstrainedError' ? 'unavailable' : 'denied';
      }
    };
    return { camera: await one({ video: true }), microphone: await one({ audio: true }) };
  }
}

/** Prompt for geolocation. Only called by flows that truly require it. */
export async function requestLocationPermission(): Promise<PermissionState> {
  if (!navigator.geolocation) return 'unavailable';
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve('granted'),
      (err) => resolve(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { timeout: 10000 },
    );
  });
}

export type ConsentRecord = {
  walkthroughId?: string | null;
  camera: PermissionState;
  microphone: PermissionState;
  locationRequired: boolean;
  location: PermissionState;
  recordingConsent?: boolean;
};

/**
 * Persist an auditable consent record. Stores only whether permissions were
 * granted — never a stream, a coordinate, or any location history.
 */
export async function recordWalkthroughConsent(userId: string, record: ConsentRecord) {
  const { error } = await (supabase.from('video_walkthrough_consents') as any).insert({
    user_id: userId,
    walkthrough_id: record.walkthroughId ?? null,
    consent_type: 'video_walkthrough_join',
    consent_version: `terms:${WALKTHROUGH_TERMS_VERSION}|privacy:${DEVICE_PRIVACY_VERSION}`,
    source: 'web',
    route: typeof window !== 'undefined' ? window.location.pathname : null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
    camera_permission_granted: record.camera === 'granted',
    microphone_permission_granted: record.microphone === 'granted',
    location_permission_required: record.locationRequired,
    location_permission_granted: record.locationRequired && record.location === 'granted',
    recording_consent_granted: Boolean(record.recordingConsent),
  });
  return { error };
}
