import { describe, expect, it } from 'vitest';
import { CATEGORY_INDEX_CONFIGS } from '@/data/categoryIndexConfigs';
import { CITY_CATEGORY_CONFIGS } from '@/data/cityCategoryConfigs';

describe('rental inventory scope remains unchanged during SEO improvements', () => {
  it('keeps the national truck rental hub open to trucks and trailers, rentals only', () => {
    const hub = CATEGORY_INDEX_CONFIGS.find(c => c.path === '/food-trucks-for-rent');
    expect(hub?.categories).toEqual(['food_truck', 'food_trailer']);
    expect(hub?.mode).toBe('rent');
    expect(hub?.conditions).toBeUndefined();
  });

  it.each([['texas', 'TX'], ['florida', 'FL'], ['california', 'CA']])('preserves the existing %s statewide rental scope', (state, code) => {
    const hub = CITY_CATEGORY_CONFIGS.find(c => c.path === `/food-trucks-for-rent/${state}`);
    expect(hub?.state?.code).toBe(code);
    expect(hub?.categories).toEqual(['food_truck', 'food_trailer']);
    expect(hub?.mode).toBe('rent');
    expect(hub?.city).toBeUndefined();
  });
});