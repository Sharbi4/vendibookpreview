import { describe, expect, it, vi } from 'vitest';
import {
  applyPublicListingFilter,
  canBoostListing,
  isListingPubliclyVisible,
  isListingPurchasable,
  UNAVAILABLE_LISTING_STATUSES,
} from '@/lib/listings/publicVisibility';

const live = {
  status: 'published',
  published_at: '2026-01-01T00:00:00Z',
  deleted_at: null,
  moderation_status: 'clear',
};

describe('public listing visibility', () => {
  it('allows a fully eligible published listing', () => {
    expect(isListingPubliclyVisible(live)).toBe(true);
    expect(isListingPurchasable(live)).toBe(true);
    expect(canBoostListing(live)).toBe(true);
  });

  it.each(UNAVAILABLE_LISTING_STATUSES)('excludes status %s everywhere', (status) => {
    const listing = { ...live, status };
    expect(isListingPubliclyVisible(listing)).toBe(false);
    expect(isListingPurchasable(listing)).toBe(false);
    expect(canBoostListing(listing)).toBe(false);
  });

  it('excludes listings without a publish timestamp', () => {
    expect(isListingPubliclyVisible({ ...live, published_at: null })).toBe(false);
  });

  it('excludes soft-deleted listings', () => {
    expect(isListingPubliclyVisible({ ...live, deleted_at: '2026-02-02T00:00:00Z' })).toBe(false);
  });

  it('excludes moderated listings', () => {
    expect(isListingPubliclyVisible({ ...live, moderation_status: 'restricted' })).toBe(false);
  });

  it('excludes null/undefined listings', () => {
    expect(isListingPubliclyVisible(null)).toBe(false);
    expect(isListingPurchasable(undefined)).toBe(false);
  });

  it('applies the full eligibility predicate to a query', () => {
    const calls: unknown[][] = [];
    const query = {
      eq: vi.fn((...args: unknown[]) => (calls.push(['eq', ...args]), query)),
      is: vi.fn((...args: unknown[]) => (calls.push(['is', ...args]), query)),
      not: vi.fn((...args: unknown[]) => (calls.push(['not', ...args]), query)),
    };

    applyPublicListingFilter(query);

    expect(calls).toEqual([
      ['eq', 'status', 'published'],
      ['not', 'published_at', 'is', null],
      ['is', 'deleted_at', null],
      ['eq', 'moderation_status', 'clear'],
    ]);
  });
});
