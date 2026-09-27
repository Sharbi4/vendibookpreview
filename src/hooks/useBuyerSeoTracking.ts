import { useCallback, useEffect, useRef } from 'react';
import type { MouseEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { CONSENT_CHANGE_EVENT } from '@/lib/cookieConsent';
import { isBuyerSeoPage, trackBuyerSeoCta, trackBuyerSeoView } from '@/lib/buyerSeoTracking';

/**
 * Wire buyer SEO tracking onto a page. Returns an `onClickCapture` handler to
 * put on the page's <main>: every internal link click inside it is recorded
 * with its CTA id (data-cta-id, or derived) and location (nearest
 * data-cta-location). Pages that aren't buyer SEO pages get a no-op.
 */
export const useBuyerSeoTracking = (landingPage: string, category?: string) => {
  const location = useLocation();
  const enabled = isBuyerSeoPage(landingPage);

  const loc = useRef(location);
  loc.current = location;
  const fireView = useCallback(() => {
    if (enabled) trackBuyerSeoView(landingPage, loc.current.key, loc.current.search, category);
  }, [enabled, landingPage, category]);

  useEffect(() => { fireView(); }, [fireView, location.key, location.search]);

  // Accepting analytics while on the landing page captures it once (deduped by nav key).
  useEffect(() => {
    if (!enabled) return;
    window.addEventListener(CONSENT_CHANGE_EVENT, fireView);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, fireView);
  }, [enabled, fireView]);

  return useCallback((e: MouseEvent<HTMLElement>) => {
    if (!enabled) return;
    const a = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null;
    if (!a || a.closest('[data-site-chrome]')) return; // ignore site header/footer navigation
    const href = a.getAttribute('href') || '';
    if (!href.startsWith('/')) return; // internal navigation only (skip #jump links, external)
    fireView(); // CTA before effect / late consent: make sure the landing is recorded first (deduped)
    const listingMatch = href.match(/^\/listing\/([^/?#]+)/);
    const ctaLocation = (a.closest('[data-cta-location]') as HTMLElement | null)?.dataset.ctaLocation ?? 'body';
    const ctaId = a.dataset.ctaId ?? (listingMatch ? 'listing_card' : `link_${href.split(/[?#]/)[0].replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')}`);
    trackBuyerSeoCta({
      landingPage,
      ctaId,
      ctaLocation,
      destination: href,
      category,
      listingId: listingMatch?.[1],
    });
  }, [enabled, landingPage, category, fireView]);
};
