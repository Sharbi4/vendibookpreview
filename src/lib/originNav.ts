import type { NavigateFunction } from 'react-router-dom';

/**
 * Navigate the user back to where they came from before entering a flow
 * (verification, checkout, etc). Falls back to /dashboard, then '/'.
 *
 * Origin is captured from, in priority order:
 *  1. `?returnTo=` search param on the current URL
 *  2. `sessionStorage['origin_return_to']` (set by callers before navigating away)
 *  3. `document.referrer` when it points to the same origin
 */
export function resolveOrigin(): string {
  if (typeof window === 'undefined') return '/dashboard';

  try {
    const url = new URL(window.location.href);
    const returnTo = url.searchParams.get('returnTo');
    if (returnTo && returnTo.startsWith('/')) return returnTo;
  } catch {
    /* noop */
  }

  try {
    const stored = window.sessionStorage.getItem('origin_return_to');
    if (stored && stored.startsWith('/')) return stored;
  } catch {
    /* noop */
  }

  try {
    const ref = document.referrer;
    if (ref) {
      const refUrl = new URL(ref);
      if (refUrl.origin === window.location.origin) {
        const path = refUrl.pathname + refUrl.search;
        // Avoid bouncing to the same page we're on
        if (path && path !== window.location.pathname + window.location.search) {
          return path;
        }
      }
    }
  } catch {
    /* noop */
  }

  return '/dashboard';
}

export function goBackToOrigin(navigate: NavigateFunction, fallback = '/dashboard'): void {
  const target = resolveOrigin() || fallback;
  navigate(target);
  try {
    window.sessionStorage.removeItem('origin_return_to');
  } catch {
    /* noop */
  }
}

/**
 * Callers should invoke this before pushing the user into a modal flow
 * (verification, checkout) so `goBackToOrigin` can restore the exact spot.
 */
export function captureOrigin(pathWithSearch?: string): void {
  if (typeof window === 'undefined') return;
  const path =
    pathWithSearch ?? window.location.pathname + window.location.search;
  try {
    window.sessionStorage.setItem('origin_return_to', path);
  } catch {
    /* noop */
  }
}
