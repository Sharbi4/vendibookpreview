import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ user: null as any, row: null as any, complete: false, fail: false }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: () => { let id = ''; const q: any = { select: () => q, eq: (_: string, value: string) => { id = value; return q; }, is: () => q, maybeSingle: async () => ({ data: id === 'seller' ? structuredClone(state.row) : null, error: null }) }; return q; },
  functions: { invoke: async () => {
    if (state.fail) return { error: new Error('PayPal unavailable') };
    if (state.complete) state.row = { ...state.row, onboarding_status: 'ready', merchant_id: 'merchant', primary_email_confirmed: true, payments_receivable: true, consent_granted: true, oauth_scopes: ['capture'] };
    state.row.last_status_check_at = new Date().toISOString();
    return { data: { status: state.row.onboarding_status }, error: null };
  } },
} }));
import { useMyPayPalConnection } from '@/hooks/useMyPayPalConnection';
let client: QueryClient;
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  state.user = null; state.complete = false; state.fail = false;
  state.row = { id: 'account', onboarding_status: 'link_sent', oauth_scopes: [], last_status_check_at: null };
});
afterEach(() => { cleanup(); client.clear(); vi.restoreAllMocks(); });
const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
describe('seller connection refresh', () => {
  it('loads granted permissions when auth becomes available after sign-in', async () => {
    const hook = renderHook(useMyPayPalConnection, { wrapper });
    expect(hook.result.current.connection).toBeNull();
    state.user = { id: 'seller' }; state.complete = true; hook.rerender();
    await waitFor(() => expect(hook.result.current.isReady).toBe(true));
    expect(hook.result.current.connection?.oauth_scopes).toEqual(['capture']);
  });
  it('does not show another signed-in account the prior seller connection', async () => {
    state.user = { id: 'seller' }; state.complete = true;
    const hook = renderHook(useMyPayPalConnection, { wrapper });
    await waitFor(() => expect(hook.result.current.isReady).toBe(true));
    state.user = { id: 'other' }; hook.rerender();
    expect(hook.result.current.connection).toBeNull();
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
    expect(hook.result.current.isReady).toBe(false);
  });
  it.each(['focus', 'pageshow'])('refreshes when the seller returns through %s', async (event) => {
    state.user = { id: 'seller' };
    const hook = renderHook(useMyPayPalConnection, { wrapper });
    await waitFor(() => expect(hook.result.current.connection?.onboarding_status).toBe('link_sent'));
    state.complete = true; state.row.last_status_check_at = null;
    act(() => { window.dispatchEvent(new Event(event)); });
    await waitFor(() => expect(hook.result.current.isReady).toBe(true));
  });
  it('keeps the existing connection and surfaces a provider refresh error', async () => {
    state.user = { id: 'seller' }; state.fail = true;
    const hook = renderHook(useMyPayPalConnection, { wrapper });
    await waitFor(() => expect(hook.result.current.lastRefreshError).toBe('PayPal unavailable'));
    expect(hook.result.current.connection?.id).toBe('account');
    expect(hook.result.current.isReady).toBe(false);
  });
});
