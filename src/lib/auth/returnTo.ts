/**
 * Canonical helpers for preserving where a visitor was when we sent them to
 * /auth. Every "sign in required" path should route through these so the user
 * lands back on the listing, checkout, or /list/start flow they started in.
 */

import { safePath } from '@/lib/auth/oauthIntent';

/** Current path + query (same-origin only), safe to round-trip through /auth. */
export const currentReturnPath = (fallback = '/dashboard'): string => {
  if (typeof window === 'undefined') return fallback;
  return safePath(window.location.pathname + window.location.search, fallback);
};

/**
 * Build the /auth URL that preserves the destination.
 * @param returnTo explicit destination; defaults to the current location.
 * @param mode optional 'signup' to open the create-account tab.
 */
export const authPath = (returnTo?: string | null, mode?: 'signin' | 'signup'): string => {
  const dest = safePath(returnTo ?? currentReturnPath(), '/dashboard');
  const params = new URLSearchParams();
  if (mode) params.set('mode', mode);
  params.set('redirect', dest);
  return `/auth?${params.toString()}`;
};
