/**
 * Pending signup consent — session-deferred capture.
 *
 * When a user completes the signup form but email verification is required,
 * `supabase.auth.signUp()` returns no session, so we can't call
 * `record_user_consent` (RLS requires `auth.uid()`). We stash the exact
 * acceptance snapshot (document types + versions + acceptance text + trigger
 * metadata + timestamp) in localStorage keyed by email. On the first
 * authenticated auth-state change we drain it via
 * `drainPendingSignupConsent()` and clear the stash so the same consent is
 * never written twice.
 *
 * The snapshot mirrors the arguments accepted by the `record_user_consent`
 * RPC so we can replay it byte-for-byte at drain time.
 */
export const PENDING_SIGNUP_CONSENT_KEY = 'vb.pendingSignupConsent.v1';

export interface PendingSignupConsent {
  /** Email the user typed at signup — used to match the eventual session. */
  email: string;
  role: 'host' | 'shopper';
  marketingOptIn: boolean;
  tosVersion: string;
  privacyVersion: string;
  acceptanceText: string;
  route: string;
  locale: string;
  userAgent: string;
  /** ISO timestamp of when the user actually ticked the checkbox. */
  capturedAt: string;
}

const isBrowser = () => typeof window !== 'undefined' && !!window.localStorage;

export function stashPendingSignupConsent(payload: PendingSignupConsent): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(
      PENDING_SIGNUP_CONSENT_KEY,
      JSON.stringify(payload),
    );
  } catch (err) {
    console.warn('[pendingSignupConsent] failed to stash', err);
  }
}

export function readPendingSignupConsent(): PendingSignupConsent | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(PENDING_SIGNUP_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingSignupConsent;
    if (!parsed?.email || !parsed?.tosVersion || !parsed?.privacyVersion) {
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn('[pendingSignupConsent] failed to read stash', err);
    return null;
  }
}

export function clearPendingSignupConsent(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(PENDING_SIGNUP_CONSENT_KEY);
  } catch (err) {
    console.warn('[pendingSignupConsent] failed to clear stash', err);
  }
}
