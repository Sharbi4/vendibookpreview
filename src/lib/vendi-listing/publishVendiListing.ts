/**
 * Publish verification for the List with Vendi builder.
 *
 * Vendi does NOT get its own publish implementation: it calls the same
 * canonical `publishListingIdempotent` the step-by-step wizard uses, so
 * moderation states, first-publish claiming and RLS/trigger rejections behave
 * identically. This module adds the extra proof Vendi needs before it is
 * allowed to tell a seller "you're live" and throw away their local recovery
 * state: the row is re-read from the server and every field the seller was
 * promised is confirmed to have persisted.
 */
import { supabase } from '@/integrations/supabase/client';
import { publishListingIdempotent } from '@/lib/listings/publishListing';

export class VendiPublishVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VendiPublishVerificationError';
  }
}

/** Statuses that must never be treated as publicly visible. */
const NOT_PUBLIC_STATUSES = new Set(['draft', 'paused', 'archived', 'removed', 'deleted', 'rejected', 'suspended']);

export interface VerifiedPublish {
  listingId: string;
  firstPublish: boolean;
  publishedAt: string;
  /** Canonical public route for the live listing. */
  publicPath: string;
}

export interface PublishVendiListingArgs {
  listingId: string;
  /** Authenticated owner — must match the persisted host_id. */
  userId: string;
  /** Field payload built by `buildListingPayload`. */
  fields: Record<string, unknown>;
  /** Media URLs the seller expects to see on the live listing. */
  expectedImages: string[];
}

/** The public route the app serves a live listing on. */
export const publicListingPath = (listingId: string) => `/listing/${listingId}`;

const fail = (message: string): never => {
  throw new VendiPublishVerificationError(message);
};

export async function publishVendiListing({
  listingId,
  userId,
  fields,
  expectedImages,
}: PublishVendiListingArgs): Promise<VerifiedPublish> {
  const result = await publishListingIdempotent(listingId, fields);

  // Authoritative re-read. Success is only ever reported from this row.
  const { data: row, error } = await supabase
    .from('listings')
    .select(
      'id, host_id, status, published_at, deleted_at, moderation_status, mode, category, title, description, city, state, price_sale, price_monthly, price_weekly, price_daily, price_hourly, image_urls',
    )
    .eq('id', listingId)
    .maybeSingle();

  if (error) throw error;
  if (!row) fail('We could not confirm your listing published. Your draft is safe — please try again.');

  const listing = row as Record<string, unknown>;

  if (listing.id !== listingId || listing.host_id !== userId) {
    fail('We could not confirm ownership of this listing, so we did not publish it.');
  }
  if (listing.status !== 'published' || NOT_PUBLIC_STATUSES.has(String(listing.status))) {
    fail('Publishing did not complete. Your listing is still a draft — please try again.');
  }
  if (!listing.published_at) {
    fail('Publishing did not complete. Your listing is still a draft — please try again.');
  }
  if (listing.deleted_at) {
    fail('This listing is no longer available to publish.');
  }
  // Same rule public listing queries use: only "clear" moderation is visible.
  const moderation = listing.moderation_status as string | null | undefined;
  if (moderation && moderation !== 'clear') {
    fail('This listing is on hold with our team and is not publicly visible yet.');
  }

  // Core fields the seller answered must actually be on the live row.
  const missing: string[] = [];
  if (!listing.mode) missing.push('listing type');
  if (!listing.category) missing.push('category');
  if (!listing.title) missing.push('title');
  if (!listing.description) missing.push('description');
  if (!listing.city || !listing.state) missing.push('location');

  const hasPrice =
    listing.mode === 'sale'
      ? Number(listing.price_sale) > 0
      : Number(listing.price_monthly) > 0 ||
        Number(listing.price_weekly) > 0 ||
        Number(listing.price_daily) > 0 ||
        Number(listing.price_hourly) > 0;
  if (!hasPrice) missing.push('price');

  if (missing.length) {
    fail(`Some details did not save (${missing.join(', ')}). We kept your draft — please try again.`);
  }

  const savedImages = Array.isArray(listing.image_urls) ? (listing.image_urls as string[]) : [];
  if (expectedImages.length && expectedImages.some((url) => !savedImages.includes(url))) {
    fail('Your photos did not finish saving. We kept your draft — please try again.');
  }
  if (!savedImages.length) {
    fail('Your photos did not finish saving. We kept your draft — please try again.');
  }

  return {
    listingId,
    firstPublish: result.firstPublish,
    publishedAt: String(listing.published_at),
    publicPath: publicListingPath(listingId),
  };
}
