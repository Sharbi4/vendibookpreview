/**
 * Buyer SEO landing-page tracking.
 *
 * Measures: landing views, CTA clicks (with destination classification), and —
 * when a session started on a buyer SEO page — attributed downstream *starts*
 * (listing view, inquiry submitted, checkout started). It never records a
 * payment/purchase: verified completion lives server-side (PayPal webhook).
 *
 * Privacy: non-PII only (paths, CTA ids, category, listing id, UTM params).
 * Consent: every event is gated on the existing analytics consent.
 * Sinks: the same first-party analytics_events table + GA4 used by leadTracking.
 * See docs/analytics/buyer-seo-events.md for the event map.
 */
import { hasAnalyticsConsent } from '@/lib/cookieConsent';
import { trackEventToDb } from '@/hooks/useAnalyticsEvents';

export const BUYER_SEO_PAGES = [
  '/food-trucks-for-sale',
  '/food-trailers-for-sale',
  '/used-food-trucks-for-sale',
  '/how-to-buy-a-food-truck',
  '/food-truck-prices',
  '/financing',
  '/coffee-trucks-trailers-for-sale',
  '/coffee-trucks-for-sale',
  '/coffee-trailers-for-sale',
] as const;

export const isBuyerSeoPage = (path: string): boolean =>
  (BUYER_SEO_PAGES as readonly string[]).includes(path);

export type BuyerSeoDestination =
  | 'listing_detail'
  | 'search'
  | 'financing'
  | 'sale_hub'
  | 'buyer_guide'
  | 'prices'
  | 'inspection'
  | 'freight'
  | 'how_it_works'
  | 'seller'
  | 'other_internal';

export type BuyerSeoDownstreamStage = 'listing_view' | 'inquiry_submitted' | 'checkout_started';

const ATTR_KEY = 'vb_buyer_seo_attr';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;
const firedViews = new Set<string>();
const firedDownstream = new Set<string>();

export interface BuyerSeoAttribution {
  landing_page: string;
  landed_at: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

const clean = (v: string | null): string | undefined => {
  if (!v) return undefined;
  const s = v.replace(/[^\w\-.~ +:/]/g, '').slice(0, 100).trim();
  return s || undefined;
};

export const parseUtm = (search: string): Partial<BuyerSeoAttribution> => {
  const p = new URLSearchParams(search);
  const out: Partial<BuyerSeoAttribution> = {};
  for (const k of UTM_KEYS) {
    const v = clean(p.get(k));
    if (v) out[k] = v;
  }
  return out;
};

export const getBuyerSeoAttribution = (): BuyerSeoAttribution | null => {
  try {
    const raw = sessionStorage.getItem(ATTR_KEY);
    return raw ? (JSON.parse(raw) as BuyerSeoAttribution) : null;
  } catch {
    return null;
  }
};

/** Pure classifier — exported for tests. */
export const classifyDestination = (href: string): BuyerSeoDestination => {
  const path = href.split(/[?#]/)[0];
  if (/^\/listing\/[^/]+/.test(path)) return 'listing_detail';
  if (path === '/search') return 'search';
  if (path.startsWith('/financing')) return 'financing';
  if (path === '/how-to-buy-a-food-truck') return 'buyer_guide';
  if (path === '/food-truck-prices') return 'prices';
  if (path === '/guides/meetup-inspection') return 'inspection';
  if (path === '/vendibook-freight') return 'freight';
  if (path.startsWith('/how-it-works')) return 'how_it_works';
  if (/^\/sell|^\/list/.test(path)) return 'seller';
  if (/-for-sale(\/|$)/.test(path)) return 'sale_hub';
  return 'other_internal';
};

const send = (name: string, payload: Record<string, unknown>, listingId?: string) => {
  if (!hasAnalyticsConsent()) return;
  if (import.meta.env.DEV) console.log('[BuyerSEO]', name, payload);
  void trackEventToDb(name, 'buyer_seo', payload, listingId);
  const w = window as unknown as { gtag?: (...a: unknown[]) => void };
  if (typeof w.gtag === 'function') {
    try { w.gtag('event', name, payload); } catch { /* ignore */ }
  }
};

/**
 * Fire once per navigation (dedupe key = path + router location key), so
 * StrictMode double effects and re-renders never double count, while a real
 * return visit via client navigation counts again.
 */
export const trackBuyerSeoView = (landingPage: string, navKey: string, search: string, category?: string) => {
  if (!hasAnalyticsConsent()) return;
  const key = `${landingPage}|${navKey}`;
  if (firedViews.has(key)) return;
  firedViews.add(key);

  const utm = parseUtm(search);
  // First buyer-SEO landing in the session owns attribution (first touch).
  if (!getBuyerSeoAttribution()) {
    try {
      sessionStorage.setItem(ATTR_KEY, JSON.stringify({ landing_page: landingPage, landed_at: new Date().toISOString(), ...utm }));
    } catch { /* storage unavailable */ }
  }
  send('buyer_seo_landing_view', { landing_page: landingPage, asset_category: category ?? null, ...utm });
};

export const trackBuyerSeoCta = (p: {
  landingPage: string;
  ctaId: string;
  ctaLocation: string;
  destination: string;
  category?: string;
  listingId?: string;
}) => {
  send('buyer_seo_cta_click', {
    landing_page: p.landingPage,
    cta_id: p.ctaId,
    cta_location: p.ctaLocation,
    destination: p.destination.split('#')[0].slice(0, 200),
    destination_type: classifyDestination(p.destination),
    asset_category: p.category ?? null,
    listing_id: p.listingId ?? null,
  }, p.listingId);
};

/**
 * Downstream starts attributed to a buyer SEO landing in this session.
 * No-op without attribution. Once per stage+listing per page load.
 * These are *starts*, not completed or paid transactions.
 */
export const trackBuyerSeoDownstream = (stage: BuyerSeoDownstreamStage, listingId?: string, extra: Record<string, unknown> = {}) => {
  if (!hasAnalyticsConsent()) return;
  const attr = getBuyerSeoAttribution();
  if (!attr) return;
  const key = `${stage}|${listingId ?? ''}`;
  if (firedDownstream.has(key)) return;
  firedDownstream.add(key);
  send(`buyer_seo_attributed_${stage}`, { ...attr, listing_id: listingId ?? null, ...extra }, listingId);
};

/** Financing-specific interactions share the buyer SEO consent and first-touch contract. */
export const trackBuyerSeoFinancing = (
  action: 'calculator_started' | 'calculator_completed' | 'calculator_browse_clicked' | 'apply_clicked' | 'faq_opened',
  details: Record<string, string | number | null> = {},
) => {
  if (!hasAnalyticsConsent()) return;
  send(`buyer_seo_financing_${action}`, {
    ...getBuyerSeoAttribution(),
    landing_page: getBuyerSeoAttribution()?.landing_page ?? '/financing',
    page_path: '/financing',
    ...details,
  });
};

/** Test helper. */
export const __resetBuyerSeoTracking = () => {
  firedViews.clear();
  firedDownstream.clear();
  try { sessionStorage.removeItem(ATTR_KEY); } catch { /* ignore */ }
};
