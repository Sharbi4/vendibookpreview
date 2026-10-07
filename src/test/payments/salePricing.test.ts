import { describe, expect, it } from 'vitest';

import { allowedFulfillment, priceFulfillment } from '../../../supabase/functions/_shared/salePricing';
import { freightQuote } from '../../../supabase/functions/_shared/freightRates';

// Phoenix listing; the buyer address resolves ~10 miles north.
const listing = {
  fulfillment_type: 'both',
  delivery_fee: 5,
  delivery_fee_type: 'per_mile',
  delivery_radius_miles: 50,
  latitude: 33.45,
  longitude: -112.07,
  address: '100 Main St, Phoenix, AZ 85004',
  pickup_location_text: 'Phoenix, AZ',
  vendibook_freight_enabled: true,
};
const north10 = { lat: 33.5948, lng: -112.07 };
const geocode = async (a: string) => (a.includes('Phoenix') || a.includes('33.45') ? { lat: 33.45, lng: -112.07 } : north10);

describe('priceFulfillment (server-side delivery and freight)', () => {
  it('pickup is free', async () => {
    expect(await priceFulfillment(listing, 'pickup', null, geocode)).toEqual({ deliveryFee: 0, freightCost: 0 });
  });

  it('per-mile delivery is priced from the server distance, not the browser', async () => {
    const r = await priceFulfillment(listing, 'delivery', '1 Somewhere Rd, Scottsdale AZ', geocode);
    expect(r).toEqual({ deliveryFee: 50, freightCost: 0 });
  });

  it('flat delivery charges the seller rate', async () => {
    const r = await priceFulfillment({ ...listing, delivery_fee_type: 'flat', delivery_fee: 300 }, 'delivery', '1 Somewhere Rd', geocode);
    expect(r).toEqual({ deliveryFee: 300, freightCost: 0 });
  });

  it('rejects addresses outside the delivery radius', async () => {
    const r = await priceFulfillment({ ...listing, delivery_radius_miles: 5 }, 'delivery', '1 Somewhere Rd', geocode);
    expect(r).toMatchObject({ code: 'outside_delivery_area' });
  });

  it('prices freight with the shared freight quote', async () => {
    const r = await priceFulfillment(listing, 'vendibook_freight', '1 Somewhere Rd', geocode);
    expect(r).toEqual({ deliveryFee: 0, freightCost: freightQuote(Math.abs(north10.lat - 33.45) * 69.09).total_cost });
  });

  it('rejects options the listing does not offer', async () => {
    expect(allowedFulfillment({ fulfillment_type: 'pickup' })).toEqual(['pickup']);
    expect(await priceFulfillment({ fulfillment_type: 'pickup' }, 'delivery', 'x street', geocode)).toMatchObject({ code: 'fulfillment_unavailable' });
    expect(await priceFulfillment({ fulfillment_type: 'pickup' }, 'vendibook_freight', 'x street', geocode)).toMatchObject({ code: 'fulfillment_unavailable' });
  });

  it('requires a resolvable address for delivery', async () => {
    expect(await priceFulfillment(listing, 'delivery', '', geocode)).toMatchObject({ code: 'delivery_address_required' });
    expect(await priceFulfillment(listing, 'delivery', 'nowhere at all', async () => null)).toMatchObject({ code: 'delivery_address_unresolved' });
  });
});
