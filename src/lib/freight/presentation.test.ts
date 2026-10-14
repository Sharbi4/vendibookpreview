import { describe, expect, it } from 'vitest';
import { freightBuyerDisplay, isSellerCoveredFreight } from './presentation';

const estimate = {
  estimated_transit_days: { min: 7, max: 10 },
};

describe('seller-covered freight presentation', () => {
  it('labels eligible sale listings as free shipping', () => {
    expect(isSellerCoveredFreight({
      mode: 'sale',
      vendibook_freight_enabled: true,
      freight_payer: 'seller',
    })).toBe(true);
  });

  it('shows only free shipping and transit when the seller pays', () => {
    const display = freightBuyerDisplay(estimate, true);
    expect(display.charge).toBe('Free shipping');
    expect(display.detail).toBe('Seller covers freight on this listing. Estimated transit 7–10 business days.');
  });

  it('never reveals how buyer-paid freight is calculated', () => {
    const display = freightBuyerDisplay(estimate, false);
    expect(display.detail).toBe('Door-to-door freight to your address. Estimated transit 7–10 business days.');
    expect(JSON.stringify(display)).not.toMatch(/mile|\/mi|4\.5|fuel|handling/i);
  });
});
describe('buyerFreightRangeLabel', () => {
  it('asks for a ZIP and never shows a rate or sample prices', async () => {
    const { buyerFreightRangeLabel } = await import('./presentation');
    const label = buyerFreightRangeLabel();
    expect(label).toBe('Enter your ZIP for an exact freight quote');
    expect(label).not.toMatch(/\$|mile|fuel|handling/i);
  });
});
