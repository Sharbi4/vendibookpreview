import { describe, expect, it } from 'vitest';
import { categoryPhotos, type CategoryPhotoListing } from '@/lib/listings/homeCategoryPhotos';

const listing: CategoryPhotoListing = { id: 'kitchen', title: 'Shared prep kitchen', category: 'ghost_kitchen', mode: 'rent', status: 'published', published_at: '2026-10-22', moderation_status: 'clear', deleted_at: null, unlisted: false, cover_image_url: 'https://example.com/kitchen.jpg' };
describe('real homepage category photos', () => {
  it('uses matching real kitchens rather than vehicle images', () => {
    expect(categoryPhotos([listing, { ...listing, category: 'food_truck', cover_image_url: 'https://example.com/truck.jpg' }], 'kitchens').map((p) => p.url)).toEqual(['https://example.com/kitchen.jpg']);
  });
  it('keeps sale and rental photos separate', () => {
    expect(categoryPhotos([{ ...listing, category: 'food_truck' }], 'truck-sale')).toEqual([]);
    expect(categoryPhotos([{ ...listing, category: 'food_truck' }], 'truck-rent')).toHaveLength(1);
  });
  it('excludes hidden, paused and test listings', () => {
    expect(categoryPhotos([{ ...listing, unlisted: true }, { ...listing, status: 'paused' }, { ...listing, title: 'QA kitchen' }], 'kitchens')).toEqual([]);
  });
  it('never substitutes an unrelated photo when inventory is missing', () => {
    expect(categoryPhotos([listing], 'coffee')).toEqual([]);
  });
});