import { describe, it, expect } from 'vitest';
import {
  getPublishContentBlockers,
  requiresStreetAddress,
  isStaticLocationCategory,
  MIN_PHOTOS,
} from '@/lib/listings/publishParity';
import { getPublishBlockerDetails } from '@/lib/vendi-listing/script';

const ids = (input: Parameters<typeof getPublishContentBlockers>[0]) =>
  getPublishContentBlockers(input).map((b) => b.id);

const completeRental = {
  mode: 'rent' as const,
  category: 'food_truck',
  title: 'Fully equipped taco truck',
  description: 'A well maintained taco truck with a full kitchen, generator and ample prep space for events.',
  photoCount: MIN_PHOTOS,
  priceDaily: 350,
  streetAddress: '100 Main St',
  city: 'Tucson',
  state: 'AZ',
  zipCode: '85719',
  fulfillmentType: 'pickup',
};

describe('publish parity — content blockers', () => {
  it('passes a complete rental', () => {
    expect(ids(completeRental)).toEqual([]);
  });

  it('requires a daily rate even when weekly pricing exists', () => {
    expect(ids({ ...completeRental, priceDaily: null, priceWeekly: 1500 })).toContain('price');
  });

  it('requires the parity minimums', () => {
    const missing = ids({ photoCount: 0 });
    expect(missing).toEqual(
      expect.arrayContaining(['mode', 'category', 'title', 'description', 'photos', 'location', 'zip_code']),
    );
  });

  it('blocks a sale with both payment methods off', () => {
    const sale = { ...completeRental, mode: 'sale' as const, priceDaily: null, priceSale: 60000 };
    expect(ids(sale)).toEqual([]);
    expect(ids({ ...sale, acceptPayPalCheckout: false, acceptCashPayment: false })).toContain('payment_method');
  });

  it('skips the street address only for delivery-only sales', () => {
    expect(requiresStreetAddress('sale', 'food_truck', 'delivery')).toBe(false);
    expect(requiresStreetAddress('sale', 'food_truck', 'pickup')).toBe(true);
    expect(requiresStreetAddress('rent', 'food_truck', 'delivery')).toBe(true);
    expect(requiresStreetAddress('sale', 'vendor_lot', 'delivery')).toBe(true);
  });

  it('treats static categories as location-based', () => {
    expect(isStaticLocationCategory('ghost_kitchen')).toBe(true);
    expect(isStaticLocationCategory('food_truck')).toBe(false);
  });

  it('requires access instructions for static categories instead of fulfillment', () => {
    const lot = { ...completeRental, category: 'vendor_lot', fulfillmentType: null };
    expect(ids(lot)).toContain('access_instructions');
    expect(ids(lot)).not.toContain('fulfillment');
  });
});

describe('Vendi checklist links every blocker to a question', () => {
  it('maps content blockers to interview questions', () => {
    const details = getPublishBlockerDetails({ mode: 'rent', category: 'food_truck' } as never, 0);
    const byId = Object.fromEntries(details.map((d) => [d.id, d.questionId]));
    expect(byId.photos).toBe('photos');
    expect(byId.title).toBe('title');
    expect(byId.price).toBe('rent_daily_rate');
    expect(byId.zip_code).toBe('zip_code');
    // Every blocker must be actionable — no dead ends in the checklist.
    expect(details.every((d) => d.questionId !== null)).toBe(true);
  });

  it('routes a sale price blocker to the sale price question', () => {
    const details = getPublishBlockerDetails({ mode: 'sale', category: 'food_truck' } as never, 0);
    expect(details.find((d) => d.id === 'price')?.questionId).toBe('sale_price');
  });
});
