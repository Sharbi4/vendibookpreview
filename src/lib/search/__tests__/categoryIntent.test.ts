import { describe, expect, it } from 'vitest';
import {
  expandCategory,
  inferCategoryFromQuery,
} from '../../../../supabase/functions/_shared/categoryIntent';

describe('category intent mapping', () => {
  it('maps food truck phrasing and typos to food_truck', () => {
    for (const q of ['food truck', 'Food Trucks', 'truck', 'trucks', 'food truc', 'foodtruck', 'food truck for sale']) {
      expect(inferCategoryFromQuery(q), q).toBe('food_truck');
    }
  });

  it('maps trailer phrasing to food_trailer', () => {
    for (const q of ['food trailer', 'food trailers', 'trailer', 'trailers', 'concession trailer']) {
      expect(inferCategoryFromQuery(q), q).toBe('food_trailer');
    }
  });

  it('maps kitchen phrasing to ghost_kitchen', () => {
    for (const q of ['shared kitchen', 'commercial kitchen', 'commissary kitchen', 'ghost kitchen', 'kitchen rental', 'kitchens']) {
      expect(inferCategoryFromQuery(q), q).toBe('ghost_kitchen');
    }
  });

  it('leaves non-category keywords alone', () => {
    for (const q of ['burger', 'Houston, TX', '85719', 'workhorse', '']) {
      expect(inferCategoryFromQuery(q), q).toBeNull();
    }
  });

  it('expands vendor space to include the legacy vendor_lot twin', () => {
    expect(expandCategory('vendor_space').sort()).toEqual(['vendor_lot', 'vendor_space']);
    expect(expandCategory('food_truck')).toEqual(['food_truck']);
  });
});
