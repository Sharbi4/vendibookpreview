import { useCallback, useEffect } from 'react';
import type { MouseEvent } from 'react';
import { useLocation } from 'react-router-dom';
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

  useEffect(() => {
    if (!enabled) return;
    trackBuyerSeoView(landingPage, location.key, location.search, category);
  }, [enabled, landingPage, location.key, location.search, category]);

  return useCallback((e: MouseEvent<HTMLElement>) => {
    if (!enabled) return;
    const a = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null;
    if (!a || a.closest('[data-site-chrome]')) return; // ignore site header/footer navigation
    const href = a.getAttribute('href') || '';
    if (!href.startsWith('/')) return; // internal navigation only (skip #jump links, external)
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
  }, [enabled, landingPage, category]);
};
