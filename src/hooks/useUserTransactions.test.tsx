import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';

const db = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), or: vi.fn(), not: vi.fn(), order: vi.fn(), limit: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: db.from } }));
import { useUserTransactions } from './useUserTransactions';

beforeEach(() => {
  vi.resetAllMocks();
  for (const key of ['from', 'select', 'or', 'not', 'order'] as const) db[key].mockReturnValue(db);
});
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, ...renderHook(() => useUserTransactions('buyer-1'), { wrapper }) };
}
it('surfaces an unavailable payment history instead of reporting a successful empty result', async () => {
  db.limit.mockResolvedValue({ data: null, error: new Error('offline') });
  const { result, unmount, client } = setup();
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(db.or).toHaveBeenCalledWith('buyer_id.eq.buyer-1,seller_id.eq.buyer-1');
  unmount(); client.clear();
});
it('updates a pending payment to confirmed without remounting the dashboard', async () => {
  const payment = { id: 'record-1', buyer_id: 'buyer-1', listing_id: null };
  db.limit.mockResolvedValueOnce({ data: [{ ...payment, payment_status: 'pending' }] })
    .mockResolvedValue({ data: [{ ...payment, payment_status: 'completed' }] });
  const { result, unmount, client } = setup();
  await waitFor(() => expect(result.current.transactions[0]?.payment_status).toBe('pending'));
  await act(async () => { await result.current.refresh(); });
  await waitFor(() => expect(result.current.transactions[0].payment_status).toBe('completed'));
  expect(result.current.transactions[0].role).toBe('buyer');
  unmount(); client.clear();
});
