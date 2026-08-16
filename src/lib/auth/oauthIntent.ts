/**
 * Shared OAuth / sign-in smoothing helpers.
 *
 * - Remembers the last successful auth method so returning users get a
 *   "Last used" hint instead of guessing.
 * - Stashes the intended destination so the Google round-trip lands the user
 *   back where they started (AuthContext drains `pending_post_auth_redirect`).
 * - Maps generic Supabase credential errors to actionable copy.
 */

export type AuthMethod = 'google' | 'email' | 'phone';

const LAST_METHOD_KEY = 'vb_last_auth_method';
const GOOGLE_EMAILS_KEY = 'vb_google_auth_emails';
export const PENDING_REDIRECT_KEY = 'pending_post_auth_redirect';

const safeLocal = () => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
};

export const rememberAuthMethod = (method: AuthMethod, email?: string) => {
  const store = safeLocal();
  if (!store) return;
  try {
    store.setItem(LAST_METHOD_KEY, method);
    if (method === 'google' && email) {
      const list = getGoogleEmails();
      const next = Array.from(new Set([...list, email.trim().toLowerCase()])).slice(-10);
      store.setItem(GOOGLE_EMAILS_KEY, JSON.stringify(next));
    }
  } catch {
    /* storage unavailable */
  }
};

export const getLastAuthMethod = (): AuthMethod | null => {
  const store = safeLocal();
  if (!store) return null;
  try {
    const v = store.getItem(LAST_METHOD_KEY);
    return v === 'google' || v === 'email' || v === 'phone' ? v : null;
  } catch {
    return null;
  }
};

export const getGoogleEmails = (): string[] => {
  const store = safeLocal();
  if (!store) return [];
  try {
    const raw = store.getItem(GOOGLE_EMAILS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((e) => typeof e === 'string') : [];
  } catch {
    return [];
  }
};

export const wasGoogleEmail = (email: string) =>
  getGoogleEmails().includes(email.trim().toLowerCase());

/** Same-origin path guard. */
export const safePath = (path?: string | null, fallback = '/dashboard') =>
  path && path.startsWith('/') && !path.startsWith('//') ? path : fallback;

/**
 * Friendly copy for sign-in failures. Supabase returns the same generic
 * "Invalid login credentials" for a wrong password and for an email that only
 * has a Google identity — the local hint disambiguates the common case.
 */
export const describeSignInError = (
  message: string,
  email?: string,
): { title: string; description: string; type: string } => {
  const msg = (message || '').toLowerCase();

  if (msg.includes('rate limit') || msg.includes('too many')) {
    return {
      title: 'Too many attempts',
      description: 'Please wait a few minutes before trying again.',
      type: 'rate_limit',
    };
  }
  if (msg.includes('not confirmed') || msg.includes('verify')) {
    return {
      title: 'Email not verified',
      description: 'Please verify your email before signing in.',
      type: 'email_not_verified',
    };
  }
  if (msg.includes('invalid login credentials') && email && wasGoogleEmail(email)) {
    return {
      title: 'Continue with Google',
      description:
        'This email is registered with Google — use the “Continue with Google” button above to sign in.',
      type: 'google_account',
    };
  }
  return {
    title: 'Sign in failed',
    description:
      'Invalid email or password. If you signed up with Google, use “Continue with Google” instead.',
    type: 'invalid_credentials',
  };
};

export interface GoogleSignInResult {
  ok: boolean;
  error?: string;
}

/**
 * Single entry point for Google sign-in so intent, "last used" memory and
 * double-popup protection behave identically on every surface.
 */
export const startGoogleSignIn = async (
  returnPath?: string | null,
): Promise<GoogleSignInResult> => {
  const destination = safePath(
    returnPath ??
      (typeof window !== 'undefined'
        ? window.location.pathname + window.location.search
        : null),
  );
  try {
    window.sessionStorage.setItem(PENDING_REDIRECT_KEY, destination);
  } catch {
    /* best effort */
  }
  rememberAuthMethod('google');

  try {
    const { lovable } = await import('@/integrations/lovable/index');
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      return {
        ok: false,
        error:
          (result.error as any)?.message ||
          'Could not start Google sign-in. Please try again.',
      };
    }
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error?.message || 'An unexpected error occurred' };
  }
};
