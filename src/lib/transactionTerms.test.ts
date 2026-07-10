import { describe, it, expect } from 'vitest';
import { buildTerms, renderTermsEmailBlock, TERMS_VERSION } from './transactionTerms';

const listing = {
  id: 'lst_1',
  title: 'Test Cargo Van',
  host_id: 'host_1',
  cover_image_url: null,
  mode: 'rent',
  city: 'Phoenix',
  state: 'AZ',
  cancellation_policy: null,
  rules: null,
  security_deposit: 200,
  price_daily: 100,
  price_sale: 5000,
  accept_card_payment: true,
  required_documents: [{ label: 'Drivers License' }],
} as const;

describe('buildTerms', () => {
  it('produces a rent snapshot with 12.9% renter fee, delivery, deposit', () => {
    const t = buildTerms({
      listing: { ...listing },
      selection: {
        mode: 'rent',
        paymentMethod: 'stripe_card',
        basePriceDollars: 100,
        deliveryFeeDollars: 25,
        depositDollars: 200,
        startDate: '2026-01-01',
        endDate: '2026-01-02',
      },
    });
    expect(t.termsVersion).toBe(TERMS_VERSION);
    expect(t.pricing.subtotalCents).toBe(10000);
    expect(t.pricing.deliveryCents).toBe(2500);
    // 12.9% of (100 + 25) = 16.125 → rounded cents
    expect(t.pricing.renterFeeCents).toBe(1613);
    expect(t.pricing.depositCents).toBe(20000);
    // Customer total = 100 + 25 + 16.125 + 200 = 341.125 → 34113 or 34112 depending on order of rounding
    expect(t.pricing.totalCents).toBeGreaterThanOrEqual(34112);
    expect(t.pricing.totalCents).toBeLessThanOrEqual(34113);
    expect(t.policies.requiredDocuments).toContain('Drivers License');
    expect(t.policies.acknowledgements.some((a) => /security deposit/i.test(a))).toBe(true);
  });

  it('sale card produces $0 buyer fee', () => {
    const t = buildTerms({
      listing: { ...listing, mode: 'sale' },
      selection: {
        mode: 'sale',
        paymentMethod: 'stripe_card',
        basePriceDollars: 5000,
      },
    });
    expect(t.pricing.totalCents).toBe(500000);
    expect(t.pricing.renterFeeCents).toBe(0);
    // 12.9% commission on seller side (info only for buyer)
    expect(t.pricing.commissionCents).toBe(64500);
  });

  it('pay-in-person sale is 100% free — zero commission, zero fee', () => {
    const t = buildTerms({
      listing: { ...listing, mode: 'sale' },
      selection: {
        mode: 'sale',
        paymentMethod: 'pay_in_person',
        basePriceDollars: 5000,
        isCashSale: true,
      },
    });
    expect(t.pricing.totalCents).toBe(500000);
    expect(t.pricing.commissionCents).toBe(0);
    expect(t.pricing.renterFeeCents).toBe(0);
    expect(t.policies.acknowledgements.some((a) => /Pay-in-Person/i.test(a))).toBe(true);
  });

  it('seller-paid freight is not added to buyer total', () => {
    const t = buildTerms({
      listing: { ...listing, mode: 'sale' },
      selection: {
        mode: 'sale',
        paymentMethod: 'stripe_card',
        basePriceDollars: 1000,
        deliveryFeeDollars: 250,
        isSellerPaidFreight: true,
      },
    });
    expect(t.pricing.totalCents).toBe(100000);
    expect(t.pricing.deliveryCents).toBe(0);
  });

  it('email block contains total, cancellation policy, and version', () => {
    const t = buildTerms({
      listing: { ...listing },
      selection: {
        mode: 'rent',
        paymentMethod: 'stripe_card',
        basePriceDollars: 100,
        depositDollars: 200,
      },
    });
    const html = renderTermsEmailBlock(t);
    expect(html).toContain('What you agreed to');
    expect(html).toContain('Cancellation policy');
    expect(html).toContain(TERMS_VERSION);
    expect(html).toContain('Total due today');
  });
});
