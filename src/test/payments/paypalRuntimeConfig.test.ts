import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const invoke = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));
const config = (environment = 'live') => ({ enabled: true, client_id: `${environment}-public`, environment, intent: 'CAPTURE', user_action: 'CONTINUE' });
beforeEach(() => { vi.resetModules(); invoke.mockReset(); vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); sessionStorage.clear(); });
it('does not revive an old sandbox configuration after a page load', async () => {
  sessionStorage.setItem('vb:paypal-config:v2', JSON.stringify({ at: Date.now(), config: config('sandbox') }));
  invoke.mockResolvedValue({ data: config(), error: null });
  const { getPayPalConfig } = await import('@/lib/paypalClient');
  expect((await getPayPalConfig()).environment).toBe('live');
});
it('refreshes an open tab after the cache expires', async () => {
  invoke.mockResolvedValueOnce({ data: config('sandbox') }).mockResolvedValueOnce({ data: config() });
  const { getPayPalConfig } = await import('@/lib/paypalClient');
  await getPayPalConfig();
  vi.advanceTimersByTime(60_001);
  expect((await getPayPalConfig()).environment).toBe('live');
  expect(invoke).toHaveBeenCalledTimes(2);
});
it('retries disabled configuration instead of caching it for the tab lifetime', async () => {
  invoke.mockResolvedValueOnce({ data: { enabled: false } }).mockResolvedValueOnce({ data: config() });
  const { getPayPalConfig } = await import('@/lib/paypalClient');
  await getPayPalConfig();
  expect((await getPayPalConfig()).enabled).toBe(true);
});
