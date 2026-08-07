import { describe, it, expect } from 'vitest';
import { buildListingHighlights, type HighlightsListing } from './transactionTerms';

// Every case pins the *exact* bullet strings produced by the current
// spec-mapping in transactionTerms.ts::buildListingHighlights.
// A copy or ordering drift will fail these tests loudly.

const base = (over: Partial<HighlightsListing> = {}): HighlightsListing => ({
  mode: 'rent',
  category: null,
  city: null,
  state: null,
  instant_book: false,
  accept_paypal_checkout: true,
  accept_cash_payment: false,
  deposit_amount: 0,
  security_deposit: 0,
  fulfillment_type: null,
  delivery_fee: 0,
  cancellation_policy: null,
  vendibook_freight_enabled: false,
  ...over,
});

describe('buildListingHighlights — heading + linkLabel', () => {
  it('sale mode → "Before You Buy" / "View Purchase Details"', () => {
    const { heading, linkLabel } = buildListingHighlights(base({ mode: 'sale' }));
    expect(heading).toBe('Before You Buy');
    expect(linkLabel).toBe('View Purchase Details');
  });

  it('ghost_kitchen → "Booking Details" / "View Booking Details"', () => {
    const { heading, linkLabel } = buildListingHighlights(
      base({ mode: 'rent', category: 'ghost_kitchen' }),
    );
    expect(heading).toBe('Booking Details');
    expect(linkLabel).toBe('View Booking Details');
  });

  it('vendor_lot → "Booking Details" / "View Booking Details"', () => {
    const { heading, linkLabel } = buildListingHighlights(
      base({ mode: 'rent', category: 'vendor_lot' }),
    );
    expect(heading).toBe('Booking Details');
    expect(linkLabel).toBe('View Booking Details');
  });

  it('generic rental → "Good to Know" / "View Rental Details"', () => {
    const { heading, linkLabel } = buildListingHighlights(base({ mode: 'rent' }));
    expect(heading).toBe('Good to Know');
    expect(linkLabel).toBe('View Rental Details');
  });
});

describe('buildListingHighlights — approval vs instant book', () => {
  it('rental with instant_book=true renders the Instant Book bullet', () => {
    const { bullets } = buildListingHighlights(base({ instant_book: true }));
    expect(bullets).toContain('Instant Book — confirmed after payment');
    expect(bullets).not.toContain('Host approval required before payment is charged');
  });

  it('rental with instant_book=false renders the approval bullet', () => {
    const { bullets } = buildListingHighlights(base({ instant_book: false }));
    expect(bullets).toContain('Host approval required before payment is charged');
    expect(bullets).not.toContain('Instant Book — confirmed after payment');
  });

  it('SALE mode never renders approval / instant-book bullets', () => {
    const ib = buildListingHighlights(base({ mode: 'sale', instant_book: true }));
    const na = buildListingHighlights(base({ mode: 'sale', instant_book: false }));
    for (const b of [...ib.bullets, ...na.bullets]) {
      expect(b).not.toMatch(/Instant Book|Host approval/);
    }
  });

  it('ghost_kitchen still emits an approval/instant bullet even without rent mode', () => {
    const { bullets } = buildListingHighlights(
      base({ mode: null, category: 'ghost_kitchen', instant_book: true }),
    );
    expect(bullets).toContain('Instant Book — confirmed after payment');
  });
});

describe('buildListingHighlights — sale payment posture', () => {
  it('cash-only sale → Pay-in-Person copy', () => {
    const { bullets } = buildListingHighlights(
      base({ mode: 'sale', accept_cash_payment: true, accept_paypal_checkout: false }),
    );
    expect(bullets).toContain(
      'Pay in Person — Vendibook records the transaction but does not hold funds',
    );
  });

  it('cash + paypal sale → dual-option copy', () => {
    const { bullets } = buildListingHighlights(
      base({ mode: 'sale', accept_cash_payment: true, accept_paypal_checkout: true }),
    );
    expect(bullets).toContain('Pay online via PayPal or in person');
  });

  it('paypal-only sale → secure checkout copy', () => {
    const { bullets } = buildListingHighlights(
      base({ mode: 'sale', accept_cash_payment: false, accept_paypal_checkout: true }),
    );
    expect(bullets).toContain('Payment is completed securely via PayPal at checkout');
  });

  it('rental never renders a payment-posture bullet', () => {
    const { bullets } = buildListingHighlights(
      base({ mode: 'rent', accept_cash_payment: true, accept_paypal_checkout: true }),
    );
    for (const b of bullets) {
      expect(b).not.toMatch(/Pay in Person|Pay online via PayPal|completed securely via PayPal/);
    }
  });
});

describe('buildListingHighlights — deposit relevance', () => {
  it('rental with deposit_amount > 0 renders formatted deposit bullet', () => {
    const { bullets } = buildListingHighlights(base({ deposit_amount: 1500 }));
    expect(bullets).toContain('Refundable deposit: $1,500');
  });

  it('falls back to security_deposit when deposit_amount is null', () => {
    const { bullets } = buildListingHighlights(
      base({ deposit_amount: null, security_deposit: 250 }),
    );
    expect(bullets).toContain('Refundable deposit: $250');
  });

  it('no deposit → no deposit bullet (relevance rule)', () => {
    const { bullets } = buildListingHighlights(
      base({ deposit_amount: 0, security_deposit: 0 }),
    );
    for (const b of bullets) expect(b).not.toMatch(/Refundable deposit/);
  });

  it('SALE listings never render a deposit bullet even when configured', () => {
    const { bullets } = buildListingHighlights(
      base({ mode: 'sale', deposit_amount: 500 }),
    );
    for (const b of bullets) expect(b).not.toMatch(/Refundable deposit/);
  });
});

describe('buildListingHighlights — fulfillment / location', () => {
  it('sale + vendibook_freight_enabled → freight bullet (wins over fulfillment_type)', () => {
    const { bullets } = buildListingHighlights(
      base({
        mode: 'sale',
        vendibook_freight_enabled: true,
        fulfillment_type: 'delivery',
        city: 'Mesa',
        state: 'AZ',
      }),
    );
    expect(bullets).toContain('Vendibook Freight available for delivery');
    for (const b of bullets) expect(b).not.toMatch(/Delivery available|Located in/);
  });

  it('fulfillment_type=delivery with city+state → "Delivery available from City, ST"', () => {
    const { bullets } = buildListingHighlights(
      base({ fulfillment_type: 'delivery', city: 'Phoenix', state: 'AZ' }),
    );
    expect(bullets).toContain('Delivery available from Phoenix, AZ');
  });

  it('fulfillment_type=delivery without location → plain "Delivery available"', () => {
    const { bullets } = buildListingHighlights(base({ fulfillment_type: 'delivery' }));
    expect(bullets).toContain('Delivery available');
  });

  it('fulfillment_type=both with location → "Pickup or delivery in ..."', () => {
    const { bullets } = buildListingHighlights(
      base({ fulfillment_type: 'both', city: 'Phoenix', state: 'AZ' }),
    );
    expect(bullets).toContain('Pickup or delivery in Phoenix, AZ');
  });

  it('default rental with location → "Pickup in ..."', () => {
    const { bullets } = buildListingHighlights(
      base({ mode: 'rent', city: 'Phoenix', state: 'AZ' }),
    );
    expect(bullets).toContain('Pickup in Phoenix, AZ');
  });

  it('sale with only a location → "Located in ..."', () => {
    const { bullets } = buildListingHighlights(
      base({ mode: 'sale', city: 'Phoenix', state: 'AZ' }),
    );
    expect(bullets).toContain('Located in Phoenix, AZ');
  });

  it('ghost_kitchen with location → "On-site use in ..."', () => {
    const { bullets } = buildListingHighlights(
      base({ mode: 'rent', category: 'ghost_kitchen', city: 'Tempe', state: 'AZ' }),
    );
    expect(bullets).toContain('On-site use in Tempe, AZ');
  });

  it('vendor_lot with location → "Vendor space in ..."', () => {
    const { bullets } = buildListingHighlights(
      base({ mode: 'rent', category: 'vendor_lot', city: 'Tempe', state: 'AZ' }),
    );
    expect(bullets).toContain('Vendor space in Tempe, AZ');
  });

  it('no fulfillment + no location → no fulfillment bullet', () => {
    const { bullets } = buildListingHighlights(base({ mode: 'sale' }));
    for (const b of bullets) {
      expect(b).not.toMatch(/Delivery|Pickup|Located|Freight|On-site|Vendor space/);
    }
  });
});

describe('buildListingHighlights — cap and ordering', () => {
  it('emits at most 4 bullets even when every rule matches', () => {
    const { bullets } = buildListingHighlights(
      base({
        mode: 'rent',
        category: 'vendor_lot',
        instant_book: true,
        deposit_amount: 300,
        fulfillment_type: 'both',
        city: 'Phoenix',
        state: 'AZ',
      }),
    );
    expect(bullets.length).toBeLessThanOrEqual(4);
  });

  it('cash-only sale with freight renders exactly the expected ordered bullets', () => {
    const { bullets } = buildListingHighlights(
      base({
        mode: 'sale',
        accept_cash_payment: true,
        accept_paypal_checkout: false,
        vendibook_freight_enabled: true,
        city: 'Phoenix',
        state: 'AZ',
      }),
    );
    expect(bullets).toEqual([
      'Pay in Person — Vendibook records the transaction but does not hold funds',
      'Vendibook Freight available for delivery',
    ]);
  });

  it('instant-book rental with deposit + pickup renders exactly the expected ordered bullets', () => {
    const { bullets } = buildListingHighlights(
      base({
        mode: 'rent',
        instant_book: true,
        deposit_amount: 500,
        city: 'Phoenix',
        state: 'AZ',
      }),
    );
    expect(bullets).toEqual([
      'Instant Book — confirmed after payment',
      'Refundable deposit: $500',
      'Pickup in Phoenix, AZ',
    ]);
  });
});
