import { describe, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ rows: [] as any[], error: null as any, writes: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => {
  const query: any = { select: () => query, eq: () => query, order: () => query,
    limit: async () => ({ data: db.rows, error: db.error }),
    upsert: (rows: any, opts: any) => { db.writes(rows, opts); return Promise.resolve({ error: db.error }); } };
  return query;
} } }));
import { loadConversation, mergeMessages, saveConversation } from '../conversation';
describe('private Vendi history', () => {
  it('merges restored history with pending local answers without duplicates', () => {
    const a = { id: 'a', role: 'user' as const, content: 'Food truck' };
    const b = { id: 'b', role: 'vendi' as const, content: 'Where?' };
    expect(mergeMessages([a], [a, b])).toEqual([a, b]);
  });
  it('uses an idempotent append scoped to the owner and listing', async () => {
    db.error = null;
    await saveConversation('listing-a', 'owner-a', [{ id: 'a', role: 'user', content: 'Food truck' }]);
    expect(db.writes).toHaveBeenLastCalledWith([expect.objectContaining({ listing_id: 'listing-a', user_id: 'owner-a', id: 'a' })],
      { onConflict: 'listing_id,id', ignoreDuplicates: true });
  });
  it('surfaces backend retention failures rather than claiming history was saved', async () => {
    db.error = new Error('offline');
    await expect(loadConversation('listing-a')).rejects.toThrow('offline');
    await expect(saveConversation('listing-a', 'owner-a', [{ id: 'a', role: 'user', content: 'Truck' }])).rejects.toThrow('offline');
    db.error = null;
  });
});
