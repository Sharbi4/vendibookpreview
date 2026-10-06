import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();
const refreshSession = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) }, auth: { refreshSession: () => refreshSession() } },
}));

import { invokeEdge } from './invokeFunction';

const httpError = (status: number, body: unknown) => ({
  context: new Response(JSON.stringify(body), { status }),
});

describe('invokeEdge', () => {
  beforeEach(() => { invoke.mockReset(); refreshSession.mockReset(); });

  it('refreshes an expired session once and retries', async () => {
    invoke
      .mockResolvedValueOnce({ data: null, error: httpError(401, { error: 'Your session expired.', code: 'unauthenticated' }) })
      .mockResolvedValueOnce({ data: { tax_cents: 1400 }, error: null });
    refreshSession.mockResolvedValue({ data: { session: { access_token: 't' } } });
    const res = await invokeEdge<{ tax_cents: number }>('tax-quote', { body: {} });
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(res).toEqual({ data: { tax_cents: 1400 }, error: null, status: 200 });
  });

  it('gives up after one refresh when the session cannot be renewed', async () => {
    invoke.mockResolvedValue({ data: null, error: httpError(401, { error: 'unauthenticated' }) });
    refreshSession.mockResolvedValue({ data: { session: null } });
    const res = await invokeEdge('tax-quote', { body: {} });
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(401);
    expect(res.error).toMatch(/session expired/i);
  });

  it('resolves as an error when the call never settles', async () => {
    vi.useFakeTimers();
    invoke.mockReturnValue(new Promise(() => {}));
    const pending = invokeEdge('tax-quote', { body: {} }, { timeoutMs: 8000 });
    await vi.advanceTimersByTimeAsync(8000);
    const res = await pending;
    vi.useRealTimers();
    expect(res.data).toBeNull();
    expect(res.error).toMatch(/longer than expected/);
  });
});
