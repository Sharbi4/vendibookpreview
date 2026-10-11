import { describe, expect, it } from 'vitest';
import { buildMarketSnapshotCsv } from '@/lib/market-data/exportSnapshot';
import type { GroupStats, MarketStats } from '@/lib/market-data/foodTruckPrices';

const sufficient: GroupStats = { n: 5, median: 20000, mean: 20000, p25: 15000, p75: 25000, min: 10000, max: 30000, sufficient: true };
const small: GroupStats = { ...sufficient, n: 2, sufficient: false };
const stats: MarketStats = {
  fetchedAt: new Date('2026-10-04T12:00:00Z'), totalListings: 5, statesRepresented: 1,
  earliestPublished: null, latestPublished: null, overall: sufficient, trucks: sufficient,
  trailers: small, truckCount: 5, trailerCount: 0, newUnits: small, usedUnits: small,
  states: [{ ...small, state: 'TX', stateName: 'Texas', href: null }],
  bands: [], coffee: small, iceCream: small, inventory: [],
};

describe('marketplace pricing export', () => {
  it('preserves source, timestamp, scope and price basis for citation', () => {
    const csv = buildMarketSnapshotCsv(stats);
    expect(csv).toContain('2026-10-04T12:00:00.000Z');
    expect(csv).toContain('https://vendibook.com/food-truck-prices');
    expect(csv).toContain('not representative of the entire market');
    expect(csv).toContain('Advertised asking prices; completed sale prices excluded');
    expect(csv).toContain('"All food trucks and trailers","5","20000","15000","25000","published"');
  });
  it('suppresses small-group prices while retaining sample counts', () => {
    expect(buildMarketSnapshotCsv(stats)).toContain('"State: Texas","2","","","","insufficient_sample"');
    expect(buildMarketSnapshotCsv(stats)).toContain('"Seller-declared used","2","","","","insufficient_sample"');
  });
  it('escapes commas and quotes in labels', () => {
    const csv = buildMarketSnapshotCsv({ ...stats, states: [{ ...small, state: 'TX', stateName: 'A, "B"', href: null }] });
    expect(csv).toContain('"State: A, ""B"""');
  });
});
