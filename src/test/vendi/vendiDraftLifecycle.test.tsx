import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

/**
 * Draft lifecycle regressions for List with Vendi.
 *
 * One intentional listing == one row. Navigating away, returning, editing in
 * the full editor, opening a second tab, deleting or publishing the draft must
 * never duplicate a listing, resurrect a removed one, or lose server edits.
 */

const { navigate, USER, db } = vi.hoisted(() => ({
  navigate: vi.fn(),
  USER: { id: 'user-1', email: 'seller@example.com' },
  db: {
    rows: [] as Array<Record<string, unknown>>,
    inserts: 0,
    updates: [] as Array<{ id: unknown; payload: Record<string, unknown> }>,
  },
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), message: vi.fn() }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: USER, isLoading: false }) }));
vi.mock('@/hooks/useLegalDocument', () => ({ useLegalDocument: () => ({ data: null }) }));
vi.mock('@/hooks/useRecordConsent', () => ({
  useRecordConsent: () => ({ mutateAsync: vi.fn(async () => 'consent-1'), isPending: false }),
}));
vi.mock('@/components/ai-listing/LivePreviewPanel', () => ({ default: () => null }));
vi.mock('@/components/vendi-listing/VendiAuthGate', () => ({ default: () => null }));

vi.mock('@/integrations/supabase/client', () => {
  type Filter = { op: string; col: string; value?: unknown };

  const matches = (row: Record<string, unknown>, filters: Filter[]) =>
    filters.every((f) => {
      const v = row[f.col];
      if (f.op === 'eq') return v === f.value;
      if (f.op === 'is') return v === null || v === undefined;
      if (f.op === 'not_is') return v !== null && v !== undefined;
      return true;
    });

  const makeBuilder = (table: string) => {
    const filters: Filter[] = [];
    let pendingUpdate: Record<string, unknown> | null = null;

    const rowsFor = () => (table === 'listings' ? db.rows : []).filter((r) => matches(r, filters));

    const run = () => {
      if (pendingUpdate) {
        const targets = rowsFor();
        targets.forEach((row) => {
          db.updates.push({ id: row.id, payload: pendingUpdate as Record<string, unknown> });
          Object.assign(row, pendingUpdate);
        });
        return { data: null, error: null };
      }
      return { data: rowsFor(), error: null };
    };

    const builder: Record<string, unknown> = {
      select: () => builder,
      update: (payload: Record<string, unknown>) => { pendingUpdate = payload; return builder; },
      delete: () => builder,
      insert: async () => ({ error: null }),
      eq: (col: string, value: unknown) => { filters.push({ op: 'eq', col, value }); return builder; },
      is: (col: string) => { filters.push({ op: 'is', col }); return builder; },
      not: (col: string) => { filters.push({ op: 'not_is', col }); return builder; },
      order: () => builder,
      limit: () => builder,
      maybeSingle: async () => {
        const { data } = run() as { data: Array<Record<string, unknown>> | null };
        return { data: data?.[0] ?? null, error: null };
      },
      then: (resolve: (v: unknown) => unknown) => Promise.resolve(run()).then(resolve),
    };
    return builder;
  };

  return {
    supabase: {
      from: (table: string) => makeBuilder(table),
      auth: { getSession: async () => ({ data: { session: { access_token: 'token' } } }) },
      functions: {
        invoke: async (_name: string, opts: { body: Record<string, unknown> }) => {
          const key = opts.body.sessionKey as string;
          const existing = db.rows.find(
            (r) => r.vendi_session_key === key && r.status === 'draft' && !r.deleted_at,
          );
          if (existing) return { data: { id: existing.id }, error: null };
          db.inserts += 1;
          const row = {
            id: `listing-${db.inserts}`,
            host_id: USER.id,
            vendi_session_key: key,
            status: 'draft',
            deleted_at: null,
            title: null,
            description: null,
            mode: opts.body.mode === 'sale' ? 'sale' : 'rent',
            category: opts.body.category,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          db.rows.push(row);
          return { data: { id: row.id }, error: null };
        },
      },
      storage: {
        from: () => ({
          upload: async () => ({ error: null }),
          getPublicUrl: () => ({ data: { publicUrl: 'https://cdn.test/a.jpg' } }),
        }),
      },
    },
  };
});

import VendiListingBuilder from '@/components/vendi-listing/VendiListingBuilder';
import type { VendiDraft } from '@/lib/vendi-listing/script';

const STORAGE_KEY = `vendibook_list_with_vendi_v1:${USER.id}`;
const SESSION_KEY = `vendibook_vendi_session_v1:${USER.id}`;

const seedRow = (over: Record<string, unknown> = {}) => {
  const row = {
    id: 'listing-server',
    host_id: USER.id,
    vendi_session_key: 'key-1',
    status: 'draft',
    deleted_at: null,
    title: 'Server title',
    description: null,
    mode: 'sale',
    category: 'food_truck',
    image_urls: ['https://cdn.test/server.jpg'],
    video_urls: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    ...over,
  };
  db.rows.push(row);
  return row;
};

const cacheLocalSession = (draft: Partial<VendiDraft>, draftId: string) => {
  localStorage.setItem(SESSION_KEY, 'key-1');
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    draft: { title: 'Stale local title', description: null, category: 'food_truck', mode: 'sale', ...draft },
    answered: ['import_choice', 'category', 'mode'],
    asked: ['import_choice', 'category', 'mode'],
    messages: [{ id: 'a', role: 'vendi', content: 'hi' }],
    draftId,
  }));
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  db.rows = [];
  db.inserts = 0;
  db.updates = [];
  window.history.replaceState({}, '', '/list-with-vendi');
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => localStorage.clear());

describe('Vendi draft lifecycle', () => {
  it('verifies a cached draft id against the server and lets server edits win', async () => {
    seedRow({ title: 'Edited in the full editor' });
    cacheLocalSession({}, 'listing-server');

    render(<VendiListingBuilder />);

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(saved.draft.title).toBe('Edited in the full editor');
    });
    // Continuing an existing row never inserts another listing.
    expect(db.inserts).toBe(0);
  });

  it('restores server media on a device with no local media cache', async () => {
    seedRow({ image_urls: ['https://cdn.test/one.jpg'], video_urls: ['https://cdn.test/clip.mp4'] });
    cacheLocalSession({}, 'listing-server');

    render(<VendiListingBuilder />);

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(saved.uploadedUrls).toEqual(['https://cdn.test/one.jpg']);
      expect(saved.uploadedVideoUrls).toEqual(['https://cdn.test/clip.mp4']);
    });
  });

  it('never resurrects a deleted draft and stops saving to it', async () => {
    cacheLocalSession({}, 'listing-deleted'); // row absent from the database

    render(<VendiListingBuilder />);

    await screen.findByText('That draft was deleted');
    expect(db.updates).toHaveLength(0);
    expect(db.inserts).toBe(0);
  });

  it('detaches from a draft that was published elsewhere', async () => {
    seedRow({ status: 'published' });
    cacheLocalSession({}, 'listing-server');

    render(<VendiListingBuilder />);

    await screen.findByText('That listing is no longer a draft');
    expect(db.updates).toHaveLength(0);
  });

  it('detaches from an archived draft', async () => {
    seedRow({ status: 'archived' });
    cacheLocalSession({}, 'listing-server');

    render(<VendiListingBuilder />);

    await screen.findByText('That listing is no longer a draft');
  });

  it('continues the same row from a dashboard "Continue with Vendi" deep link', async () => {
    seedRow({ id: 'listing-dash', vendi_session_key: 'key-dash', title: 'Dashboard draft' });
    window.history.replaceState({}, '', '/list-with-vendi?listing=listing-dash');

    render(<VendiListingBuilder />);

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(saved.draftId).toBe('listing-dash');
      expect(saved.draft.title).toBe('Dashboard draft');
    });
    expect(db.inserts).toBe(0);
    // The chosen draft's session becomes this browser's session, so a later
    // create call resolves to the same row instead of inserting a new one.
    expect(localStorage.getItem(SESSION_KEY)).toBe('key-dash');
    expect(window.location.search).toBe('');
  });

  it('claims a manual-wizard draft into the Vendi session instead of duplicating it', async () => {
    seedRow({ id: 'listing-manual', vendi_session_key: null, title: 'Wizard draft' });
    window.history.replaceState({}, '', '/list-with-vendi?listing=listing-manual');

    render(<VendiListingBuilder />);

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(saved.draftId).toBe('listing-manual');
    });
    const claimed = db.rows.find((r) => r.id === 'listing-manual');
    expect(claimed?.vendi_session_key).toBeTruthy();
    expect(db.inserts).toBe(0);
  });

  it('offers a chooser instead of auto-selecting when several drafts exist', async () => {
    seedRow({ id: 'listing-a', vendi_session_key: 'key-a', title: 'Coffee trailer' });
    seedRow({ id: 'listing-b', vendi_session_key: 'key-b', title: 'Taco truck' });

    render(<VendiListingBuilder />);

    await screen.findByText('Welcome back — which listing should we finish?');
    expect(screen.getByText('Coffee trailer')).toBeInTheDocument();
    expect(screen.getByText('Taco truck')).toBeInTheDocument();
    expect(db.inserts).toBe(0);
  });
});
