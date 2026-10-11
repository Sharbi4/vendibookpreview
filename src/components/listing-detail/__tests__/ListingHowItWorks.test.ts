import { describe, it, expect } from 'vitest';
import { resolveWalkthrough } from '../ListingHowItWorks';

describe('resolveWalkthrough', () => {
  it('sale + card → sale_card variant', () => {
    const c = resolveWalkthrough({
      id: '1', mode: 'sale', accept_paypal_checkout: true, category: 'food_truck',
    });
    expect(c.variant).toBe('sale_card');
    expect(c.finalCtaLabel).toMatch(/purchase/i);
  });

  it('sale + no card → sale_pay_in_person variant', () => {
    const c = resolveWalkthrough({
      id: '2', mode: 'sale', accept_paypal_checkout: false, category: 'food_truck',
    });
    expect(c.variant).toBe('sale_pay_in_person');
    // Payment method must be different — no Stripe language
    const combined = c.fullSteps.map(s => s.description).join(' ');
    expect(combined).not.toMatch(/stripe/i);
    expect(combined).toMatch(/in person|directly/i);
  });

  it('rent + instant_book → rent_instant', () => {
    const c = resolveWalkthrough({
      id: '3', mode: 'rent', instant_book: true, category: 'food_trailer',
    });
    expect(c.variant).toBe('rent_instant');
    expect(c.fullSteps.some(s => /instant/i.test(s.description) || /immediate/i.test(s.description))).toBe(true);
  });

  it('rent without instant_book → rent_request', () => {
    const c = resolveWalkthrough({
      id: '4', mode: 'rent', instant_book: false, category: 'food_trailer',
    });
    expect(c.variant).toBe('rent_request');
    expect(c.fullSteps.some(s => /authoriz/i.test(s.description))).toBe(true);
  });

  it('ghost_kitchen rental gets on-site access step, not pickup', () => {
    const c = resolveWalkthrough({
      id: '5', mode: 'rent', instant_book: false, category: 'ghost_kitchen',
    });
    expect(c.fulfillment).toBe('on_site_kitchen');
    const titles = c.fullSteps.map(s => s.title).join(' | ');
    expect(titles).toMatch(/access/i);
    expect(titles).not.toMatch(/pickup/i);
  });

  it('vendor_lot rental gets arrival/setup step, not pickup', () => {
    const c = resolveWalkthrough({
      id: '6', mode: 'rent', instant_book: true, category: 'vendor_lot',
    });
    expect(c.fulfillment).toBe('on_site_lot');
    const titles = c.fullSteps.map(s => s.title).join(' | ');
    expect(titles).toMatch(/arrival|setup/i);
    expect(titles).not.toMatch(/pickup/i);
  });

  it('sale with delivery fulfillment shows delivery/freight step', () => {
    const c = resolveWalkthrough({
      id: '7', mode: 'sale', accept_paypal_checkout: true, category: 'food_truck',
      fulfillment_type: 'delivery',
    });
    const titles = c.fullSteps.map(s => s.title).join(' | ');
    expect(titles).toMatch(/deliver|freight/i);
  });

  it('sale with fulfillment_type=both shows combined pickup+delivery step', () => {
    const c = resolveWalkthrough({
      id: '8', mode: 'sale', accept_paypal_checkout: true, category: 'food_truck',
      fulfillment_type: 'both',
    });
    expect(c.fulfillment).toBe('pickup_or_delivery');
    const step = c.fullSteps.find(s => /pickup.*deliver|deliver.*pickup|choose pickup/i.test(s.title));
    expect(step).toBeTruthy();
  });

  it('rent with fulfillment_type=both shows combined pickup+delivery step', () => {
    const c = resolveWalkthrough({
      id: '9', mode: 'rent', instant_book: true, category: 'food_trailer',
      fulfillment_type: 'both',
    });
    expect(c.fulfillment).toBe('pickup_or_delivery');
    const titles = c.fullSteps.map(s => s.title).join(' | ');
    expect(titles).toMatch(/pickup.*deliver|deliver.*pickup|choose pickup/i);
  });

  it('rent with fulfillment_type=pickup_delivery treated as combined', () => {
    const c = resolveWalkthrough({
      id: '10', mode: 'rent', instant_book: false, category: 'food_trailer',
      fulfillment_type: 'pickup_delivery',
    });
    expect(c.fulfillment).toBe('pickup_or_delivery');
  });

  it('mode=both → sale_and_rent variant with both branches', () => {
    const c = resolveWalkthrough({
      id: '11', mode: 'both', category: 'food_truck',
      accept_paypal_checkout: true, instant_book: true,
      price_sale: 40000, price_daily: 300,
    });
    expect(c.variant).toBe('sale_and_rent');
    expect(c.heading).toMatch(/how this listing works/i);
    expect(c.cta).toMatch(/see your options/i);
    expect(c.branches).toBeTruthy();
    expect(c.branches!.sale.variant).toBe('sale_card');
    expect(c.branches!.rent.variant).toBe('rent_instant');
  });

  it('both prices present with mode=sale still resolves to dual', () => {
    const c = resolveWalkthrough({
      id: '12', mode: 'sale', category: 'food_trailer',
      accept_paypal_checkout: true, instant_book: false,
      price_sale: 25000, price_hourly: 50,
    });
    expect(c.variant).toBe('sale_and_rent');
    expect(c.branches!.rent.variant).toBe('rent_request');
  });

  it('sale price only (no rental price) with mode=sale stays sale_card', () => {
    const c = resolveWalkthrough({
      id: '13', mode: 'sale', category: 'food_truck',
      accept_paypal_checkout: true, price_sale: 25000,
    });
    expect(c.variant).toBe('sale_card');
  });

  it('dual mode with pay-in-person seller uses sale_pay_in_person branch', () => {
    const c = resolveWalkthrough({
      id: '14', mode: 'both', category: 'food_truck',
      accept_paypal_checkout: false, price_sale: 30000, price_daily: 250,
    });
    expect(c.variant).toBe('sale_and_rent');
    expect(c.branches!.sale.variant).toBe('sale_pay_in_person');
  });
});
