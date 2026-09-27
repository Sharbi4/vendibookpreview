import { describe, expect, it } from 'vitest';
import { freightBuyerDisplay, isSellerCoveredFreight } from './presentation';

const estimate = {
  distance_miles: 100,
  rate_per_mile: 4.5,
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

  it('does not expose distance, rate, or calculated cost when the seller pays', () => {
    const display = freightBuyerDisplay(estimate, true);
    expect(display.charge).toBe('Free shipping');
    expect(display.detail).toBe('Seller covers freight on this listing. Estimated transit 7–10 business days.');
    expect(JSON.stringify(display)).not.toMatch(/100|4\.50|450/);
  });

  it('preserves the mileage and rate for buyer-paid freight', () => {
    const display = freightBuyerDisplay(estimate, false);
    expect(display.detail).toContain('100 mi at $4.50/mile');
    expect(display.detail).toContain('Estimated transit 7–10 business days.');
  });
});