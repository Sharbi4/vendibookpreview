import { describe, it, expect, vi, beforeEach } from 'vitest';

const dbMock = vi.fn();
vi.mock('@/hooks/useAnalyticsEvents', () => ({ trackEventToDb: (...a: unknown[]) => dbMock(...a) }));
let consent = true;
vi.mock('@/lib/cookieConsent', () => ({ hasAnalyticsConsent: () => consent }));

import {
  classifyDestination, parseUtm, trackBuyerSeoView, trackBuyerSeoCta, trackBuyerSeoDownstream,
  getBuyerSeoAttribution, __resetBuyerSeoTracking, isBuyerSeoPage,
  trackBuyerSeoFinancing,
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

  it('attributes coffee inventory interest only with analytics consent', () => {
    const path = '/coffee-trucks-trailers-for-sale';
    consent = false;
    trackBuyerSeoView(path, 'coffee-denied', '', 'food_truck');
    expect(names()).toEqual([]);
    expect(getBuyerSeoAttribution()).toBeNull();
    consent = true;
    trackBuyerSeoView(path, 'coffee-allowed', '', 'food_truck');
    trackBuyerSeoDownstream('listing_view', 'coffee-1');
    expect(names()).toEqual(['buyer_seo_landing_view', 'buyer_seo_attributed_listing_view']);
    expect(getBuyerSeoAttribution()?.landing_page).toBe(path);
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
    expect(getBuyerSeoAttribution()).toBeNull();
  });

  it('attributes financing actions and downstream starts without payment events', () => {
    trackBuyerSeoView('/financing', 'f1', '?utm_source=google');
    trackBuyerSeoFinancing('calculator_completed', { equipment_price: 45000 });
    trackBuyerSeoDownstream('checkout_started', 'truck-1');
    expect(names()).toEqual(['buyer_seo_landing_view', 'buyer_seo_financing_calculator_completed', 'buyer_seo_attributed_checkout_started']);
    expect(dbMock.mock.calls[1][2]).toMatchObject({ landing_page: '/financing', utm_source: 'google' });
    consent = false;
    trackBuyerSeoFinancing('apply_clicked');
    expect(names()).toHaveLength(3);
  });
});
