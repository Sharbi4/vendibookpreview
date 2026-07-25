import type { NavigateFunction } from 'react-router-dom';

/**
 * Navigation continuity utilities.
 *
 * Every full-page flow (verification, checkout, publish wizard, auth) MUST use
 * these helpers so users are returned to the state they came from. Never dump
 * users onto `/` unless they actually started there.
 */

const DEFAULT_FALLBACK = '/dashboard';

/**
 * Guard against open-redirect: only internal paths that start with a single
 * `/` are allowed. Blocks protocol-relative (`//evil.com`), absolute URLs,
 * javascript:, data:, etc.
 */
export function isSafeInternalPath(path: string | null | undefined): path is string {
  if (!path || typeof path !== 'string') return false;
  if (!path.startsWith('/')) return false;
  if (path.startsWith('//')) return false;
  if (path.startsWith('/\\')) return false;
  return true;
}

/**
 * Resolve where "back" should send the user. Priority:
 *  1. `?returnTo=` search param on the current URL
 *  2. `sessionStorage['origin_return_to']` (set by callers via captureOrigin)
 *  3. `document.referrer` when it's the same origin AND different from current
 *  4. `fallback` (defaults to /dashboard — never '/')
 */
export function resolveOrigin(fallback = DEFAULT_FALLBACK): string {
  if (typeof window === 'undefined') return fallback;

  try {
    const url = new URL(window.location.href);
    const returnTo = url.searchParams.get('returnTo');
    if (isSafeInternalPath(returnTo)) return returnTo;
  } catch {
    /* noop */
  }

  try {
    const stored = window.sessionStorage.getItem('origin_return_to');
    if (isSafeInternalPath(stored)) return stored;
  } catch {
    /* noop */
  }

  try {
    const ref = document.referrer;
    if (ref) {
      const refUrl = new URL(ref);
      if (refUrl.origin === window.location.origin) {
        const path = refUrl.pathname + refUrl.search;
        if (
          isSafeInternalPath(path) &&
          path !== window.location.pathname + window.location.search
        ) {
          return path;
        }
      }
    }
  } catch {
    /* noop */
  }

  return isSafeInternalPath(fallback) ? fallback : DEFAULT_FALLBACK;
}

export function goBackToOrigin(
  navigate: NavigateFunction,
  fallback = DEFAULT_FALLBACK,
): void {
  const target = resolveOrigin(fallback);
  navigate(target);
  try {
    window.sessionStorage.removeItem('origin_return_to');
  } catch {
    /* noop */
  }
}

/**
 * Capture the current spot before pushing the user into a flow so
 * `goBackToOrigin` can restore it. Callers typically invoke this right
 * before `navigate('/verify-identity')` or similar.
 */
export function captureOrigin(pathWithSearch?: string): void {
  if (typeof window === 'undefined') return;
  const path =
    pathWithSearch ?? window.location.pathname + window.location.search;
  if (!isSafeInternalPath(path)) return;
  try {
    window.sessionStorage.setItem('origin_return_to', path);
  } catch {
    /* noop */
  }
}

/**
 * Build a URL that includes `?returnTo=<current-location>` so downstream pages
 * can honor the origin without relying on sessionStorage.
 */
export function withReturnTo(target: string, returnTo?: string): string {
  if (!isSafeInternalPath(target)) return target;
  const ret =
    returnTo ??
    (typeof window !== 'undefined'
      ? window.location.pathname + window.location.search
      : undefined);
  if (!isSafeInternalPath(ret)) return target;
  const [pathname, existing] = target.split('?');
  const params = new URLSearchParams(existing || '');
  params.set('returnTo', ret);
  return `${pathname}?${params.toString()}`;
}
