import { describe, it, expect } from 'vitest';
import { resolveWalkthrough } from '../ListingHowItWorks';

describe('resolveWalkthrough', () => {
  it('sale + card → sale_card variant', () => {
    const c = resolveWalkthrough({
      id: '1', mode: 'sale', accept_card_payment: true, category: 'food_truck',
    });
    expect(c.variant).toBe('sale_card');
    expect(c.finalCtaLabel).toMatch(/purchase/i);
  });

  it('sale + no card → sale_pay_in_person variant', () => {
    const c = resolveWalkthrough({
      id: '2', mode: 'sale', accept_card_payment: false, category: 'food_truck',
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
      id: '7', mode: 'sale', accept_card_payment: true, category: 'food_truck',
      fulfillment_type: 'delivery',
    });
    const titles = c.fullSteps.map(s => s.title).join(' | ');
    expect(titles).toMatch(/deliver|freight/i);
  });
});
