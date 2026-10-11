import { beforeEach, expect, it, vi } from 'vitest';
const query = vi.hoisted(() => ({
  select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn(), from: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'signed-in-seller' } }) }));
vi.mock('@tanstack/react-query', () => ({ useQuery: (options: unknown) => options }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: query.from } }));
import { useSellerPayables } from './useSellerPayables';
beforeEach(() => {
  vi.resetAllMocks();
  for (const key of ['from', 'select', 'eq', 'order'] as const) query[key].mockReturnValue(query);
});
it('explicitly scopes every page to the signed-in seller, even with admin access', async () => {
  query.range.mockResolvedValueOnce({ data: Array.from({ length: 500 }, (_, id) => ({ id })) })
    .mockResolvedValueOnce({ data: [{ id: 501 }] });
  const options = useSellerPayables() as unknown as { queryFn: () => Promise<unknown[]> };
  expect(await options.queryFn()).toHaveLength(501);
  expect(query.eq).toHaveBeenNthCalledWith(1, 'seller_id', 'signed-in-seller');
  expect(query.eq).toHaveBeenNthCalledWith(2, 'seller_id', 'signed-in-seller');
  expect(query.range).toHaveBeenNthCalledWith(2, 500, 999);
});
it('does not report zero proceeds when the query fails', async () => {
  query.range.mockResolvedValue({ error: new Error('unavailable') });
  const options = useSellerPayables() as unknown as { queryFn: () => Promise<unknown[]> };
  await expect(options.queryFn()).rejects.toThrow('unavailable');
});
