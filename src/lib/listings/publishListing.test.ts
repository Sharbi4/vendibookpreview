import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Publish success must be based on the authoritative database row — never on
 * "we sent an update and it didn't throw".
 */

type Row = Record<string, unknown> | null;

const state: {
  current: Row;
  claimRows: Row[];
  updateRows: Row[];
  verify: Row;
  updateError: unknown;
} = {
  current: null,
  claimRows: [],
  updateRows: [],
  verify: null,
  updateError: null,
};

vi.mock('@/integrations/supabase/client', () => {
  const from = () => {
    let isFirstClaim = false;
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      is: () => {
        isFirstClaim = true;
        return builder;
      },
      maybeSingle: async () => ({ data: state.pendingSelect(), error: null }),
      update: () => {
        const upd: any = {
          eq: () => upd,
          is: () => {
            isFirstClaim = true;
            return upd;
          },
          select: async () => ({
            data: isFirstClaim ? state.claimRows : state.updateRows,
            error: state.updateError,
          }),
        };
        return upd;
      },
    };
    return builder;
  };
  return { supabase: { from } };
});

// Two `maybeSingle()` reads happen: the pre-check, then the verification.
let readCount = 0;
(state as any).pendingSelect = () => {
  readCount += 1;
  return readCount === 1 ? state.current : state.verify;
};

const load = async () => await import('./publishListing');

beforeEach(() => {
  readCount = 0;
  state.current = { id: 'l1', status: 'draft', published_at: null, deleted_at: null, moderation_status: 'clear' };
  state.claimRows = [];
  state.updateRows = [];
  state.verify = null;
  state.updateError = null;
});

describe('publishListingIdempotent', () => {
  it('reports firstPublish only when the row is verified published', async () => {
    state.claimRows = [{ published_at: '2026-01-01T00:00:00.000Z' }];
    state.verify = { status: 'published', published_at: '2026-01-01T00:00:00.000Z' };
    const { publishListingIdempotent } = await load();
    const result = await publishListingIdempotent('l1');
    expect(result.firstPublish).toBe(true);
    expect(result.publishedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('throws when the update touched zero rows (RLS/trigger rejection)', async () => {
    state.claimRows = [];
    state.updateRows = [];
    const { publishListingIdempotent } = await load();
    await expect(publishListingIdempotent('l1')).rejects.toThrow(/could not publish/i);
  });

  it('throws when the verification read shows the row is still a draft', async () => {
    state.claimRows = [{ published_at: '2026-01-01T00:00:00.000Z' }];
    state.verify = { status: 'draft', published_at: null };
    const { publishListingIdempotent } = await load();
    await expect(publishListingIdempotent('l1')).rejects.toThrow(/did not complete/i);
  });

  it('refuses to republish a moderation-blocked listing', async () => {
    state.current = { id: 'l1', status: 'suspended', published_at: null, deleted_at: null, moderation_status: 'clear' };
    const { publishListingIdempotent, ListingPublishBlockedError } = await load();
    await expect(publishListingIdempotent('l1')).rejects.toBeInstanceOf(ListingPublishBlockedError);
  });
});
