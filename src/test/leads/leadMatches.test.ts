import { describe, expect, it } from 'vitest';
import {
  leadListingFilter,
  leadMatchLine,
  leadMatchPrice,
  rankLeadMatches,
  type MatchableListing,
} from '../../../supabase/functions/_shared/leadMatches';

const base: MatchableListing = {
  id: 'x',
  title: 'Listing',
  mode: 'rent',
  category: 'food_trailer',
  city: null,
  state: null,
  price_sale: null,
  price_daily: null,
  price_weekly: null,
  price_monthly: null,
  vendibook_freight_enabled: false,
};
const row = (o: Partial<MatchableListing>): MatchableListing => ({ ...base, ...o });

const lilburn = row({ id: 'lilburn', city: 'Lilburn', state: 'GA', price_daily: '350.00', price_weekly: '1200.00', price_monthly: '5000' });
const rex = row({ id: 'rex', city: 'Rex', state: 'GA', price_daily: '300.00', price_weekly: '1600.00' });
const atlKitchen = row({ id: 'atl-kitchen', category: 'ghost_kitchen', city: 'Atlanta', state: 'GA', price_daily: 150 });
const houstonRent = row({ id: 'houston', city: 'Houston', state: 'TX', price_daily: 275 });

describe('leadListingFilter', () => {
  it('maps rent/buy to listing modes and skips seller intents', () => {
    expect(leadListingFilter({ intent: 'rent', category: 'food_trailer' })).toEqual({ mode: 'rent', categories: ['food_trailer'] });
    expect(leadListingFilter({ intent: 'buy', category: 'commercial_kitchen' })).toEqual({ mode: 'sale', categories: ['ghost_kitchen'] });
    expect(leadListingFilter({ intent: 'buy' })).toEqual({ mode: 'sale', categories: null });
    expect(leadListingFilter({ intent: 'sell' })).toBeNull();
    expect(leadListingFilter({ intent: 'list' })).toBeNull();
  });
});

describe('rankLeadMatches', () => {
  it('matches the unanswered Atlanta trailer-rental request to both Atlanta-area rentals', () => {
    const out = rankLeadMatches(
      { intent: 'rent', category: 'food_trailer', city: 'Atlanta ga', budget: 'lt_500' },
      [houstonRent, atlKitchen, rex, lilburn],
    );
    expect(out.map((l) => l.id).sort()).toEqual(['lilburn', 'rex']);
  });

  it('ranks same-city listings first', () => {
    const atlTrailer = row({ id: 'atl', city: 'Atlanta', state: 'GA', price_daily: 400 });
    const out = rankLeadMatches({ intent: 'rent', category: 'food_trailer', city: 'Atlanta, GA' }, [rex, atlTrailer, lilburn]);
    expect(out[0].id).toBe('atl');
  });

  it('includes out-of-state sale listings only when they ship via Vendibook Freight', () => {
    const tnShips = row({ id: 'tn-ships', mode: 'sale', category: 'food_truck', state: 'TN', price_sale: 30000, vendibook_freight_enabled: true });
    const tnPickup = row({ id: 'tn-pickup', mode: 'sale', category: 'food_truck', state: 'TN', price_sale: 30000 });
    const gaTruck = row({ id: 'ga', mode: 'sale', category: 'food_truck', city: 'Hiram', state: 'GA', price_sale: 30000 });
    const out = rankLeadMatches({ intent: 'buy', category: 'food_truck', city: 'Atlanta, Georgia' }, [tnPickup, tnShips, gaTruck]);
    expect(out.map((l) => l.id)).toEqual(['ga', 'tn-ships']);
  });

  it('drops sale listings far over budget but keeps ones slightly over', () => {
    const cheap = row({ id: 'cheap', mode: 'sale', state: 'FL', price_sale: 18000 });
    const slightlyOver = row({ id: 'over', mode: 'sale', state: 'FL', price_sale: 29000 });
    const wayOver = row({ id: 'way', mode: 'sale', state: 'FL', price_sale: 75000 });
    const out = rankLeadMatches({ intent: 'buy', category: 'food_trailer', city: 'Tampa, FL', budget: 'lt_25k' }, [wayOver, slightlyOver, cheap]);
    expect(out.map((l) => l.id)).toEqual(['cheap', 'over']);
  });

  it('returns nothing without a usable location or for seller intents', () => {
    expect(rankLeadMatches({ intent: 'rent', city: '' }, [lilburn])).toEqual([]);
    expect(rankLeadMatches({ intent: 'sell', city: 'Atlanta, GA' }, [lilburn])).toEqual([]);
  });

  it('caps results at the limit', () => {
    const many = Array.from({ length: 6 }, (_, i) => row({ id: `ga-${i}`, state: 'GA' }));
    expect(rankLeadMatches({ intent: 'rent', city: 'Savannah, GA' }, many)).toHaveLength(3);
  });
});

describe('leadMatchLine', () => {
  it('formats rent and sale lines with a UTM-tagged listing URL', () => {
    expect(leadMatchPrice(lilburn)).toBe('$350/day · $1,200/week · $5,000/month');
    expect(leadMatchPrice(row({ mode: 'sale', price_sale: '18000.00' }))).toBe('$18,000');
    expect(leadMatchLine({ ...lilburn, title: '2026 Fully loaded  Food trailer READY ' }, 'https://vendibook.com', 'utm_source=email'))
      .toBe('• 2026 Fully loaded Food trailer READY (Lilburn, GA), $350/day · $1,200/week · $5,000/month: https://vendibook.com/listing/lilburn?utm_source=email');
  });
});
