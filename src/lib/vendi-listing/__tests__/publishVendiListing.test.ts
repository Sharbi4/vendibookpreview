import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Vendi may only report "you're live" — and only discard the seller's local
 * recovery state — when the server row proves the listing really published.
 */

const publishMock = vi.fn();
vi.mock('@/lib/listings/publishListing', () => ({
  publishListingIdempotent: (...args: unknown[]) => publishMock(...args),
}));

let verifyRow: Record<string, unknown> | null = null;
let verifyError: unknown = null;

vi.mock('@/integrations/supabase/client', () => {
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: async () => ({ data: verifyRow, error: verifyError }),
  };
  return { supabase: { from: () => builder } };
});

import {
  publishVendiListing,
  publicListingPath,
  VendiPublishVerificationError,
} from '../publishVendiListing';

const LISTING_ID = 'listing-1';
const USER_ID = 'user-1';

const liveRentalRow = (over: Record<string, unknown> = {}) => ({
  id: LISTING_ID,
  host_id: USER_ID,
  status: 'published',
  published_at: '2026-08-26T00:00:00Z',
  deleted_at: null,
  moderation_status: 'clear',
  mode: 'rent',
  category: 'food_trailer',
  title: 'Like new turnkey food trailer for lease',
  description: 'Turnkey trailer available for monthly lease in Spring Hill.',
  city: 'Spring Hill',
  state: 'TN',
  price_sale: null,
  price_monthly: 1000,
  price_weekly: null,
  price_daily: null,
  price_hourly: null,
  image_urls: ['https://cdn.test/a.jpg'],
  ...over,
});

const run = (over: Record<string, unknown> = {}, expectedImages = ['https://cdn.test/a.jpg']) =>
  publishVendiListing({ listingId: LISTING_ID, userId: USER_ID, fields: over, expectedImages });

beforeEach(() => {
  publishMock.mockReset();
  publishMock.mockResolvedValue({ firstPublish: true, publishedAt: '2026-08-26T00:00:00Z' });
  verifyError = null;
});

describe('publishVendiListing', () => {
  it('uses the canonical wizard publisher rather than a direct status update', async () => {
    verifyRow = liveRentalRow();
    await run({ title: 'x' });
    expect(publishMock).toHaveBeenCalledWith(LISTING_ID, { title: 'x' });
  });

  it('verifies a monthly rental ($1,000/month, Spring Hill) and returns the public route', async () => {
    verifyRow = liveRentalRow();
    const result = await run();
    expect(result.publicPath).toBe(publicListingPath(LISTING_ID));
    expect(result.publicPath).toBe(`/listing/${LISTING_ID}`);
    expect(result.firstPublish).toBe(true);
  });

  it('verifies a sale listing with a sale price', async () => {
    verifyRow = liveRentalRow({ mode: 'sale', price_monthly: null, price_sale: 48000 });
    await expect(run()).resolves.toMatchObject({ listingId: LISTING_ID });
  });

  it('fails when the row is not actually published', async () => {
    verifyRow = liveRentalRow({ status: 'draft' });
    await expect(run()).rejects.toBeInstanceOf(VendiPublishVerificationError);
  });

  it('fails when published_at is missing', async () => {
    verifyRow = liveRentalRow({ published_at: null });
    await expect(run()).rejects.toBeInstanceOf(VendiPublishVerificationError);
  });

  it('fails on paused, archived, deleted or moderated rows', async () => {
    for (const over of [
      { status: 'paused' },
      { status: 'archived' },
      { deleted_at: '2026-08-26T00:00:00Z' },
      { moderation_status: 'flagged' },
    ]) {
      verifyRow = liveRentalRow(over);
      await expect(run()).rejects.toBeInstanceOf(VendiPublishVerificationError);
    }
  });

  it('fails when the listing is owned by someone else', async () => {
    verifyRow = liveRentalRow({ host_id: 'someone-else' });
    await expect(run()).rejects.toBeInstanceOf(VendiPublishVerificationError);
  });

  it('fails when a core field did not persist', async () => {
    for (const over of [{ title: null }, { description: null }, { city: null }, { category: null }, { price_monthly: null }]) {
      verifyRow = liveRentalRow(over);
      await expect(run()).rejects.toBeInstanceOf(VendiPublishVerificationError);
    }
  });

  it('fails when uploaded media did not persist', async () => {
    verifyRow = liveRentalRow({ image_urls: [] });
    await expect(run()).rejects.toBeInstanceOf(VendiPublishVerificationError);

    verifyRow = liveRentalRow({ image_urls: ['https://cdn.test/other.jpg'] });
    await expect(run()).rejects.toBeInstanceOf(VendiPublishVerificationError);
  });

  it('propagates a blocked/failed canonical publish instead of reporting success', async () => {
    publishMock.mockRejectedValue(new Error('This listing is on hold with our team.'));
    verifyRow = liveRentalRow();
    await expect(run()).rejects.toThrow('on hold');
  });
});
