import { describe, expect, it } from 'vitest';
import { pickListingFixes } from '../../../supabase/functions/_shared/listingFixes';

const keys = (l: Parameters<typeof pickListingFixes>[0]) => pickListingFixes(l).map((f) => f.key);
const longDesc = 'x'.repeat(400);
const photos = Array.from({ length: 10 }, (_, i) => `p${i}.jpg`);

describe('pickListingFixes', () => {
  it('flags a trailer filed as a truck first (SF "Coffee Tailer" case)', () => {
    expect(keys({ title: 'Turnkey Coffee Trailer', mode: 'sale', category: 'food_truck', description: longDesc, image_urls: photos,
      condition: 'good', title_status: 'clean', operational_status: 'towable', year_built: 2020, make: 'x', mileage: 1, accepts_offers: true })[0])
      .toBe('category');
  });

  it('asks a thin sale listing for trust fields, photos, description and offers (Colleyville case)', () => {
    expect(keys({ title: 'Food Trailer', mode: 'sale', category: 'food_trailer', description: 'short', image_urls: ['a', 'b', 'c'], accepts_offers: false }))
      .toEqual(['trust_fields', 'photos', 'description', 'offers']);
  });

  it('asks truck listings for year/make/mileage (Hiram case)', () => {
    expect(keys({ title: 'Turnkey Food Truck', mode: 'sale', category: 'food_truck', description: longDesc, image_urls: photos,
      condition: 'good', title_status: 'clean', operational_status: 'runs_drives', accepts_offers: false }))
      .toEqual(['truck_basics', 'offers']);
  });

  it('asks rentals for a monthly rate and returns nothing for a complete listing', () => {
    expect(keys({ title: 'Trailer for rent', mode: 'rent', category: 'food_trailer', description: longDesc, image_urls: photos }))
      .toEqual(['monthly_rate']);
    expect(keys({ title: 'Trailer', mode: 'sale', category: 'food_trailer', description: longDesc, image_urls: photos,
      condition: 'good', title_status: 'clean', operational_status: 'towable', accepts_offers: true })).toEqual([]);
  });
});
