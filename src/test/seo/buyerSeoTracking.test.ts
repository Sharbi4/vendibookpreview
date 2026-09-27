import { describe, it, expect, vi, beforeEach } from 'vitest';

const dbMock = vi.fn();
vi.mock('@/hooks/useAnalyticsEvents', () => ({ trackEventToDb: (...a: unknown[]) => dbMock(...a) }));
let consent = true;
vi.mock('@/lib/cookieConsent', () => ({ hasAnalyticsConsent: () => consent, CONSENT_CHANGE_EVENT: 'vb:cookie-consent-change' }));

import {
  classifyDestination, parseUtm, trackBuyerSeoView, trackBuyerSeoCta, trackBuyerSeoDownstream,
  getBuyerSeoAttribution, __resetBuyerSeoTracking, isBuyerSeoPage, sanitizeDestination, looksLikePii,
} from '@/lib/buyerSeoTracking';

const names = () => dbMock.mock.calls.map((c) => c[0]);

describe('buyer SEO tracking', () => {
  beforeEach(() => { dbMock.mockReset(); consent = true; __resetBuyerSeoTracking(); });

  it('classifies destinations', () => {
    expect(classifyDestination('/listing/abc-123')).toBe('listing_detail');
    expect(classifyDestination('/search?category=food_truck&mode=sale')).toBe('search');
    expect(classifyDestination('/financing')).toBe('financing');
    expect(classifyDestination('/food-trailers-for-sale')).toBe('sale_hub');
    expect(classifyDestination('/how-to-buy-a-food-truck')).toBe('buyer_guide');
    expect(classifyDestination('/sell-my-food-truck')).toBe('seller');
  });

  it('only buyer pages are tracked', () => {
    expect(isBuyerSeoPage('/food-trucks-for-sale')).toBe(true);
    expect(isBuyerSeoPage('/food-trucks-for-rent')).toBe(false);
  });

  it('parses and sanitizes UTM params, ignores others', () => {
    const u = parseUtm('?utm_source=google&utm_campaign=<script>x&email=a@b.com');
    expect(u).toEqual({ utm_source: 'google', utm_campaign: 'scriptx' });
  });

  it('landing view fires once per navigation key and stores first-touch attribution', () => {
    trackBuyerSeoView('/food-trucks-for-sale', 'k1', '?utm_source=linkedin', 'food_truck');
    trackBuyerSeoView('/food-trucks-for-sale', 'k1', '?utm_source=linkedin', 'food_truck');
    expect(names()).toEqual(['buyer_seo_landing_view']);
    trackBuyerSeoView('/used-food-trucks-for-sale', 'k2', '?utm_source=other', 'food_truck');
    expect(names()).toHaveLength(2);
    expect(getBuyerSeoAttribution()).toMatchObject({ landing_page: '/food-trucks-for-sale', utm_source: 'linkedin' });
  });

  it('downstream is a no-op without attribution, and single-fires with it', () => {
    trackBuyerSeoDownstream('listing_view', 'L1');
    expect(dbMock).not.toHaveBeenCalled();
    trackBuyerSeoView('/food-trucks-for-sale', 'k1', '', 'food_truck');
    trackBuyerSeoDownstream('listing_view', 'L1');
    trackBuyerSeoDownstream('listing_view', 'L1');
    trackBuyerSeoDownstream('checkout_started', 'L1', { payment_path: 'online' });
    expect(names()).toEqual(['buyer_seo_landing_view', 'buyer_seo_attributed_listing_view', 'buyer_seo_attributed_checkout_started']);
    const payload = dbMock.mock.calls[2][2];
    expect(payload).toMatchObject({ landing_page: '/food-trucks-for-sale', listing_id: 'L1', payment_path: 'online' });
  });

  it('CTA payload has no PII fields and classifies listing clicks', () => {
    trackBuyerSeoCta({ landingPage: '/food-trucks-for-sale', ctaId: 'listing_card', ctaLocation: 'inventory', destination: '/listing/L9', category: 'food_truck', listingId: 'L9' });
    const [name, cat, payload, listingId] = dbMock.mock.calls[0];
    expect(name).toBe('buyer_seo_cta_click');
    expect(cat).toBe('buyer_seo');
    expect(listingId).toBe('L9');
    expect(Object.keys(payload).sort()).toEqual(['asset_category', 'cta_id', 'cta_location', 'destination', 'destination_type', 'landing_page', 'listing_id']);
    expect(payload.destination_type).toBe('listing_detail');
  });

  it('respects analytics consent', () => {
    consent = false;
    trackBuyerSeoView('/food-trucks-for-sale', 'k1', '', 'food_truck');
    trackBuyerSeoCta({ landingPage: '/food-trucks-for-sale', ctaId: 'x', ctaLocation: 'hero', destination: '/search' });
    expect(dbMock).not.toHaveBeenCalled();
  });

  it('no consent => no storage, no events, no dedupe poisoning; accept later => one view', () => {
    consent = false;
    trackBuyerSeoView('/food-trucks-for-sale', 'k1', '?utm_source=linkedin', 'food_truck');
    trackBuyerSeoCta({ landingPage: '/food-trucks-for-sale', ctaId: 'x', ctaLocation: 'body', destination: '/search' });
    trackBuyerSeoDownstream('listing_view', 'L1');
    expect(dbMock).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('vb_buyer_seo_attr')).toBeNull();
    consent = true;
    trackBuyerSeoView('/food-trucks-for-sale', 'k1', '?utm_source=linkedin', 'food_truck');
    trackBuyerSeoView('/food-trucks-for-sale', 'k1', '?utm_source=linkedin', 'food_truck'); // StrictMode double effect
    expect(names()).toEqual(['buyer_seo_landing_view']);
    expect(getBuyerSeoAttribution()).toMatchObject({ landing_page: '/food-trucks-for-sale', utm_source: 'linkedin' });
  });

  it('revoke => attribution cleared and nothing further stored or sent', () => {
    trackBuyerSeoView('/food-trucks-for-sale', 'k1', '', 'food_truck');
    consent = false;
    window.dispatchEvent(new Event('vb:cookie-consent-change'));
    expect(sessionStorage.getItem('vb_buyer_seo_attr')).toBeNull();
    dbMock.mockReset();
    trackBuyerSeoView('/used-food-trucks-for-sale', 'k2', '', 'food_truck');
    trackBuyerSeoDownstream('listing_view', 'L1');
    expect(dbMock).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('vb_buyer_seo_attr')).toBeNull();
  });

  it('drops utm_term/content and PII-like UTM values', () => {
    expect(parseUtm('?utm_source=a&utm_term=food+truck&utm_content=x')).toEqual({ utm_source: 'a' });
    expect(parseUtm('?utm_campaign=jane%40x.com&utm_source=555-123-4567&utm_medium=cpc')).toEqual({ utm_medium: 'cpc' });
    expect(looksLikePii('john at gmail dot com')).toBe(true);
    expect(looksLikePii('spring_2026')).toBe(false);
  });

  it('destination keeps pathname + category/mode only', () => {
    expect(sanitizeDestination('/search?category=food_truck&mode=sale&q=jane@x.com&phone=555#top')).toBe('/search?category=food_truck&mode=sale');
    expect(sanitizeDestination('/listing/abc?email=a@b.c')).toBe('/listing/abc');
    trackBuyerSeoCta({ landingPage: '/food-trucks-for-sale', ctaId: 's', ctaLocation: 'hero', destination: '/search?q=secret' });
    expect(dbMock.mock.calls[0][2].destination).toBe('/search');
  });
});
