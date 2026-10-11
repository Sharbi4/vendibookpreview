import { Capacitor } from '@capacitor/core';

const PUBLIC_ORIGIN = 'https://vendibook.com';

/** Only verified Vendibook HTTPS links may enter the app router. */
export function parseAppLink(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || !['vendibook.com', 'www.vendibook.com'].includes(url.hostname) || url.port || url.username || url.password) return null;
    if (url.pathname.startsWith('//') || /%2f|%5c/i.test(url.pathname)) return null;
    return url;
  } catch { return null; }
}

/** Emails must never point at the native container's localhost origin. */
export function publicReturnUrl(path: string): string {
  const origin = Capacitor.isNativePlatform() ? PUBLIC_ORIGIN : window.location.origin;
  const url = new URL(path, origin);
  return url.origin === origin ? url.href : `${origin}/dashboard`;
}
