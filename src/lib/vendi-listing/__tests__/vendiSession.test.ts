import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Regression suite modelled on Earl Wigger's production case: one signed-in
 * owner produced THREE near-identical Vendi drafts in ~20 minutes because
 * listing identity lived in localStorage. Identity is now server-authoritative
 * (a durable session key + an owner-scoped active-draft lookup), so leaving,
 * reloading, racing tabs and switching devices must all land on ONE row.
 */

const USER = '8d2c3d54-98a9-4e05-aaf4-17e47b9d4cec';

/** In-memory stand-in for the idempotent create-listing-draft edge function. */
const server = {
  rows: [] as Array<Record<string, unknown>>,
  inserts: 0,
  reset() { this.rows = []; this.inserts = 0; },
  create(body: any) {
    const existing = this.rows.find(
      (r) => r.host_id === USER && r.vendi_session_key === body.sessionKey,
    );
    if (existing) {
      if (existing.status !== 'draft') return { error: 'session_retired', retired: true };
      return { id: existing.id as string, resumed: true };
    }
    this.inserts += 1;
    const row = {
      id: `listing-${this.inserts}`,
      host_id: USER,
      status: 'draft',
      deleted_at: null,
      vendi_session_key: body.sessionKey,
      title: 'Turn key custom soft serve business',
      description: '$125,000 custom soft serve truck',
      category: body.category,
      mode: body.mode,
      city: body.city,
      state: body.state,
      postal_code: body.zipCode,
      address: body.location,
      image_urls: [],
      created_at: new Date(Date.now() + this.inserts * 1000).toISOString(),
      updated_at: new Date(Date.now() + this.inserts * 1000).toISOString(),
    };
    this.rows.push(row);
    return { id: row.id, resumed: false };
  },
};

vi.mock('@/integrations/supabase/client', () => {
  const makeQuery = (table: string) => {
    const filters: Record<string, unknown> = {};
    let notNullCol: string | null = null;
    const q: any = {
      select: () => q,
      eq: (col: string, val: unknown) => { filters[col] = val; return q; },
      is: (col: string, val: unknown) => { if (val === null) filters[col] = null; return q; },
      not: (col: string) => { notNullCol = col; return q; },
      order: () => q,
      limit: async (n: number) => ({ data: run().slice(0, n), error: null }),
      maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
      then: undefined,
    };
    const run = () =>
      (table === 'listings' ? server.rows : []).filter((r) =>
        Object.entries(filters).every(([k, v]) => (r[k] ?? null) === v) &&
        (!notNullCol || r[notNullCol] != null),
      ).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    return q;
  };
  return {
    supabase: {
      from: (table: string) => makeQuery(table),
      auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) },
      functions: {
        invoke: async (_name: string, opts: any) => ({ data: server.create(opts.body), error: null }),
      },
    },
  };
});

import {
  createOrResumeVendiDraft, findActiveVendiDraft, resolveVendiResume,
  getVendiSessionKey, rotateVendiSessionKey, VendiSessionRetiredError,
} from '../session';

const create = (sessionKey: string) =>
  createOrResumeVendiDraft({
    sessionKey, mode: 'sale', category: 'food_truck',
    city: 'Summerville', state: 'SC', zipCode: '29483', location: 'Summerville, SC',
  });

describe('Vendi session identity', () => {
  beforeEach(() => { server.reset(); localStorage.clear(); });

  it('reuses one session key per owner across remounts', () => {
    const a = getVendiSessionKey(USER);
    const b = getVendiSessionKey(USER);
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(8);
  });

  it("Earl's case: leave/re-enter/reload repeatedly creates exactly ONE listing", async () => {
    const key = getVendiSessionKey(USER);
    const ids: string[] = [];
    for (let visit = 0; visit < 5; visit += 1) {
      ids.push(await create(getVendiSessionKey(USER)));
    }
    expect(new Set(ids).size).toBe(1);
    expect(server.inserts).toBe(1);
    expect(server.rows[0].vendi_session_key).toBe(key);
  });

  it('missing/corrupt localStorage resumes the server draft instead of duplicating', async () => {
    const id = await create(getVendiSessionKey(USER));
    const key = getVendiSessionKey(USER);
    localStorage.clear(); // browser cache wiped — identity must survive
    localStorage.setItem(`vendibook_vendi_session_v1:${USER}`, key);

    const found = await findActiveVendiDraft(USER, getVendiSessionKey(USER));
    expect(found?.id).toBe(id);
    expect(server.inserts).toBe(1);
  });

  it('two tabs racing the same session key resolve to the same id', async () => {
    const key = getVendiSessionKey(USER);
    const [a, b] = await Promise.all([create(key), create(key)]);
    expect(a).toBe(b);
    expect(server.inserts).toBe(1);
  });

  it('a second signed-in device is OFFERED the draft rather than adopting it silently', async () => {
    const id = await create(getVendiSessionKey(USER));
    localStorage.clear(); // new browser: different session key, same account
    const otherKey = getVendiSessionKey(USER);
    expect(otherKey).not.toBe(server.rows[0].vendi_session_key);

    const { session, others } = await resolveVendiResume(USER, otherKey);
    expect(session).toBeNull();
    expect(others.map((o) => o.id)).toEqual([id]);
    expect(others[0].session_key).toBe(server.rows[0].vendi_session_key);
  });

  it('published/archived drafts are not offered for resume', async () => {
    await create(getVendiSessionKey(USER));
    server.rows[0].status = 'published';
    expect(await findActiveVendiDraft(USER, getVendiSessionKey(USER))).toBeNull();
  });

  it('a retired session key is reported, never resumed or written to', async () => {
    await create(getVendiSessionKey(USER));
    server.rows[0].status = 'published';
    const { session, retired } = await resolveVendiResume(USER, getVendiSessionKey(USER));
    expect(session).toBeNull();
    expect(retired).toBe(true);
    await expect(create(getVendiSessionKey(USER))).rejects.toBeInstanceOf(VendiSessionRetiredError);
    expect(server.inserts).toBe(1); // the live listing is untouched
  });

  it('soft-deleted drafts are excluded from resume', async () => {
    await create(getVendiSessionKey(USER));
    server.rows[0].deleted_at = new Date().toISOString();
    const { session, others } = await resolveVendiResume(USER, getVendiSessionKey(USER));
    expect(session).toBeNull();
    expect(others).toHaveLength(0);
  });

  it('explicit Start over creates a distinct draft and preserves the old one', async () => {
    const first = await create(getVendiSessionKey(USER));
    const fresh = rotateVendiSessionKey(USER);
    const second = await create(fresh);

    expect(second).not.toBe(first);
    expect(server.inserts).toBe(2);
    expect(server.rows.some((r) => r.id === first && r.status === 'draft')).toBe(true);
  });

  it('multiple unfinished drafts are all offered, newest first', async () => {
    await create(getVendiSessionKey(USER));
    await create(rotateVendiSessionKey(USER));
    localStorage.clear();
    const { session, others } = await resolveVendiResume(USER, getVendiSessionKey(USER));
    expect(session).toBeNull();
    expect(others).toHaveLength(2);
  });
});
