import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Duplicate-draft regression suite for the MANUAL creation flows (quick-start
 * wizard, import wizard, AI creator). Production incident: Earl Wigger and
 * Samantha Van each produced multiple rows for one asset because every call
 * inserted a new listing. Identity now lives server-side under
 * listings.creation_session_key (partial-unique per host).
 */

const USER = '8d2c3d54-98a9-4e05-aaf4-17e47b9d4cec';

const server = {
  rows: [] as Array<{ id: string; host_id: string; key: string; status: string }>,
  inserts: 0,
  reset() { this.rows = []; this.inserts = 0; },
  create(body: any) {
    const existing = this.rows.find(
      (r) => r.host_id === USER && r.key === body.creationSessionKey,
    );
    if (existing) {
      if (existing.status !== 'draft') return { error: 'session_retired', retired: true };
      return { id: existing.id, resumed: true };
    }
    this.inserts += 1;
    const row = { id: `listing-${this.inserts}`, host_id: USER, key: body.creationSessionKey, status: 'draft' };
    this.rows.push(row);
    return { id: row.id, resumed: false };
  },
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) },
    functions: {
      invoke: async (_n: string, opts: any) => ({ data: server.create(opts.body), error: null }),
    },
  },
}));

import {
  createOrResumeListingDraft, getCreationSessionKey, rotateCreationSessionKey,
  CreationSessionRetiredError,
} from '../creationSession';

const create = (flow: 'manual' | 'import' | 'ai' = 'manual', key?: string) =>
  createOrResumeListingDraft({
    userId: USER, flow, mode: 'sale', category: 'food_truck',
    city: 'Summerville', state: 'SC', creationSessionKey: key,
  });

describe('manual listing creation idempotency', () => {
  beforeEach(() => { server.reset(); localStorage.clear(); });

  it('reuses one creation key per owner and flow', () => {
    expect(getCreationSessionKey(USER, 'manual')).toBe(getCreationSessionKey(USER, 'manual'));
    expect(getCreationSessionKey(USER, 'manual')).not.toBe(getCreationSessionKey(USER, 'import'));
  });

  it('a new user opening the builder once creates exactly one row', async () => {
    await create();
    expect(server.inserts).toBe(1);
  });

  it('remounts / StrictMode double effects still yield ONE row', async () => {
    const ids = [await create(), await create(), await create()];
    expect(new Set(ids).size).toBe(1);
    expect(server.inserts).toBe(1);
  });

  it('double-clicked create resolves to the same row', async () => {
    const [a, b] = await Promise.all([create(), create()]);
    expect(a).toBe(b);
    expect(server.inserts).toBe(1);
  });

  it('retry after a failure reuses the same row', async () => {
    const first = await create();
    const retry = await create();
    expect(retry).toBe(first);
    expect(server.inserts).toBe(1);
  });

  it('explicit Start New Listing creates exactly one additional row', async () => {
    const first = await create();
    const second = await create('manual', rotateCreationSessionKey(USER, 'manual'));
    expect(second).not.toBe(first);
    expect(server.inserts).toBe(2);
  });

  it('two genuinely separate listings by the same seller => 2 rows', async () => {
    await create('manual');
    await create('import');
    expect(server.inserts).toBe(2);
  });

  it('a retired (published) session key is reported, never silently duplicated', async () => {
    await create();
    server.rows[0].status = 'published';
    await expect(create()).rejects.toBeInstanceOf(CreationSessionRetiredError);
    expect(server.inserts).toBe(1);
  });
});
