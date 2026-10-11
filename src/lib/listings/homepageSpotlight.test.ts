import { describe, expect, it } from 'vitest';
import { buildHomepageSpotlight } from './homepageSpotlight';
type Item = { id: string; featured_enabled?: boolean; featured_expires_at?: string; published_at?: string };
const boosted = (id: string): Item => ({ id, featured_enabled: true, featured_expires_at: '2099-01-01', published_at: '2020-01-01' });
describe('homepage spotlight', () => {
  it('keeps active promotions first and fills a sparse row without changing badges', () => {
    const picks: Item[] = [{ id: 'fresh', published_at: '2026-09-24' }, { id: 'older', published_at: '2026-09-20' }];
    const result = buildHomepageSpotlight([boosted('paid')], picks, 3);
    expect(result.map(x => x.id)).toEqual(['paid', 'fresh', 'older']);
    expect(result[1].featured_enabled).toBeUndefined();
    expect(picks.map(x => x.id)).toEqual(['fresh', 'older']);
  });
  it('deduplicates across feeds and respects the cap', () => {
    expect(buildHomepageSpotlight([boosted('a')], [boosted('a'), boosted('b'), { id: 'c' }], 2).map(x => x.id)).toEqual(['a','b']);
  });
  it('excludes expired promotions unless independently eligible as an ordinary pick', () => {
    const expired = { id: 'old', featured_enabled: true, featured_expires_at: '2000-01-01' };
    expect(buildHomepageSpotlight([expired], [])).toEqual([]);
    expect(buildHomepageSpotlight([expired], [expired]).map(x => x.id)).toEqual(['old']);
    expect(buildHomepageSpotlight([], [], 8)).toEqual([]);
  });
});
