import { expect, it } from 'vitest';
import { locationSitemapEntries } from '../../../scripts/lib/sitemapLocations';

it('includes only supported cities and the actual inventory mode with canonical category slugs', () => {
  const row = { city: 'Houston', state: 'Texas', category: 'food_trailer', mode: 'rent', updated_at: '2026-10-08T10:00:00Z' };
  expect(locationSitemapEntries([row, { ...row, city: 'Unknown City' }, { ...row, state: 'Florida' }])).toEqual([
    { path: '/houston', lastmod: '2026-10-08' },
    { path: '/rent/food-trailers/houston-tx', lastmod: '2026-10-08' },
  ]);
});
it('deduplicates routes and uses real modification dates', () => {
  const row = { city: 'Atlanta', state: 'GA', category: 'food_truck', mode: 'sale', updated_at: '2026-10-07' };
  const entries = locationSitemapEntries([row, { ...row, updated_at: '2026-10-09' }]);
  expect(entries).toHaveLength(2);
  expect(entries.every(e => e.lastmod === '2026-10-09')).toBe(true);
  expect(entries.some(e => e.path === '/food-trucks-for-sale/atlanta-ga')).toBe(true);
});

it('adds North Florida only for actual sale truck inventory in its region', () => {
  const row = {city:'Pensacola',state:'Florida',category:'food_truck',mode:'sale',updated_at:'2026-10-23'};
  expect(locationSitemapEntries([row])).toEqual([{path:'/food-trucks-for-sale/north-florida',lastmod:'2026-10-23'}]);
  expect(locationSitemapEntries([{...row,mode:'rent'}]).some(e=>e.path.includes('north-florida'))).toBe(false);
  expect(locationSitemapEntries([{...row,city:'Miami'}]).some(e=>e.path.includes('north-florida'))).toBe(false);
});
