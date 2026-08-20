/**
 * Canonical public share helpers.
 *
 * Share links always point at vendibook.com (never preview/localhost hosts) and
 * never carry query strings, admin params, or private seller/listing data.
 */

export const PUBLIC_SITE_URL = 'https://vendibook.com';

/**
 * Public share URL for a listing.
 *
 * Uses the /share/listing/:id alias: social crawlers hitting this path are served
 * prerendered listing-specific OG tags by the seo-prerender edge function, while
 * humans are redirected to the canonical /listing/:id SPA route.
 */
export function listingShareUrl(listingId: string): string {
  return `${PUBLIC_SITE_URL}/share/listing/${listingId}`;
}

/** Canonical (human/SEO) listing URL. */
export function listingCanonicalUrl(listingId: string): string {
  return `${PUBLIC_SITE_URL}/listing/${listingId}`;
}

/** Clean, public-safe share text. Never includes address or seller details. */
export function listingShareText(title?: string | null): string {
  const clean = (title || '').trim();
  return clean ? `${clean} — on Vendibook` : 'Check out this listing on Vendibook';
}

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

/**
 * Native Web Share where supported, graceful clipboard fallback otherwise.
 */
export async function shareOrCopy(opts: {
  url: string;
  title?: string;
  text?: string;
}): Promise<ShareOutcome> {
  const { url, title, text } = opts;

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ url, title, text });
      return 'shared';
    } catch (err) {
      // AbortError = user dismissed the sheet; anything else falls through to copy.
      if (err instanceof Error && err.name === 'AbortError') return 'cancelled';
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    // Legacy fallback for browsers without the async clipboard API.
    try {
      const el = document.createElement('textarea');
      el.value = url;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok ? 'copied' : 'failed';
    } catch {
      return 'failed';
    }
  }
}
