/**
 * Immediate, idempotent listing publish.
 *
 * There is no review period, hold, countdown or pending_review state in the
 * ordinary flow: a valid draft owned by the seller goes straight to the live
 * `published` status. Repeated clicks, payment returns, refreshes and auth
 * callbacks all funnel through here, and only the very first successful call
 * claims `published_at` — so first-publish notifications can never be sent
 * twice.
 *
 * Genuine moderation states (flagged / restricted / suspended / removed) are
 * preserved: the publish is refused rather than overwriting them.
 */
import { supabase } from '@/integrations/supabase/client';

export const LISTING_MODERATION_BLOCKED_MESSAGE =
  'This listing is on hold with our team and cannot be published right now.';

export class ListingPublishBlockedError extends Error {
  constructor(message = LISTING_MODERATION_BLOCKED_MESSAGE) {
    super(message);
    this.name = 'ListingPublishBlockedError';
  }
}

export interface PublishListingResult {
  /** True only for the call that actually flipped the listing live. */
  firstPublish: boolean;
  publishedAt: string;
}

/** Statuses that must never be silently converted back to `published`. */
const BLOCKED_STATUSES = new Set([
  'removed',
  'deleted',
  'rejected',
  'suspended',
  'sold',
  'rented',
]);

export async function publishListingIdempotent(
  listingId: string,
  extraFields: Record<string, unknown> = {},
): Promise<PublishListingResult> {
  const { data: current, error: readError } = await supabase
    .from('listings')
    .select('id, status, published_at, deleted_at, moderation_status')
    .eq('id', listingId)
    .maybeSingle();

  if (readError) throw readError;
  if (!current) throw new Error('Listing not found');

  const moderation = (current as { moderation_status?: string | null }).moderation_status;
  if (
    (current as { deleted_at?: string | null }).deleted_at ||
    BLOCKED_STATUSES.has(String(current.status)) ||
    (moderation && moderation !== 'clear')
  ) {
    throw new ListingPublishBlockedError();
  }

  const nowIso = new Date().toISOString();

  // Claim first publish atomically: only one concurrent call can match the
  // `published_at is null` predicate.
  const { data: claimed, error: claimError } = await supabase
    .from('listings')
    .update({ ...extraFields, status: 'published', published_at: nowIso } as never)
    .eq('id', listingId)
    .is('published_at', null)
    .select('published_at');

  if (claimError) throw claimError;

  let firstPublish = false;
  let publishedAt = current.published_at ?? nowIso;

  if (claimed && claimed.length > 0) {
    firstPublish = true;
    publishedAt = claimed[0].published_at ?? nowIso;
  } else {
    // Already published once before (or by a parallel click): re-save fields
    // and keep the original published_at.
    const { data: rows, error: updateError } = await supabase
      .from('listings')
      .update({ ...extraFields, status: 'published' } as never)
      .eq('id', listingId)
      .select('published_at');

    if (updateError) throw updateError;
    if (!rows || rows.length === 0) {
      // A zero-row update means RLS or a trigger silently rejected the write.
      // It is NOT a publish — never report success from it.
      throw new Error(
        'We could not publish this listing. Please refresh and try again — your draft is saved.',
      );
    }
    publishedAt = rows[0].published_at ?? current.published_at ?? nowIso;
  }

  // Authoritative proof: re-read the row and confirm the database really has
  // it live. Anything else is reported as a failure, never as "published".
  const { data: verified, error: verifyError } = await supabase
    .from('listings')
    .select('status, published_at')
    .eq('id', listingId)
    .maybeSingle();

  if (verifyError) throw verifyError;
  if (!verified || verified.status !== 'published' || !verified.published_at) {
    throw new Error(
      'Publishing did not complete. Your listing is still a draft — please try again.',
    );
  }

  return {
    firstPublish,
    publishedAt: verified.published_at ?? publishedAt,

  };
}
