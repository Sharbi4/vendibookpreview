import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../../../supabase/functions/_shared/paypalApiLog.ts', () => ({ logPayPalApiCall: vi.fn() }));
const modulePath = '../../../supabase/functions/_shared/paypal.ts';
let fetcher: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('Deno', { env: { get: (key: string) => ({
    PAYPAL_ENVIRONMENT: 'sandbox', PAYPAL_SANDBOX_CLIENT_ID: 'test-client',
    PAYPAL_SANDBOX_CLIENT_SECRET: 'test-secret',
    PAYPAL_SANDBOX_DECLINE_ORDER_ID: 'ALL_SANDBOX_ORDERS',
    PAYPAL_SANDBOX_CAPTURE_ERROR: 'INSTRUMENT_DECLINED',
  } as Record<string, string>)[key] } });
  fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'test-token', expires_in: 3600 }), { status: 200 }));
  vi.stubGlobal('fetch', fetcher);
});
afterEach(() => vi.unstubAllGlobals());
it('uses regular sandbox capture despite leftover forced-decline secrets', async () => {
  const response = { id: 'ORDER', purchase_units: [{ payments: { captures: [{ id: 'CAPTURE', status: 'COMPLETED' }] } }] };
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify(response), { status: 201 }));
  const paypal = await import(modulePath);
  expect(await paypal.capturePayPalOrder('ORDER', 'capture:reference')).toEqual(response);
  const [url, options] = fetcher.mock.calls[1];
  expect(url).toBe('https://api-m.sandbox.paypal.com/v2/checkout/orders/ORDER/capture');
  expect(Object.keys(options.headers).some(key => key.toLowerCase() === 'paypal-mock-response')).toBe(false);
  expect(options.headers['PayPal-Request-Id']).toBe('capture:reference');
  expect(options.headers['PayPal-Partner-Attribution-Id']).toBe('VENDIBOOK_SP_PPCP');
});
it('strips explicit mock headers regardless of capitalization', async () => {
  fetcher.mockResolvedValueOnce(new Response('{}', { status: 200 }));
  const paypal = await import(modulePath);
  await paypal.paypalRequest('/v2/checkout/orders/ORDER/capture', { method: 'POST', extraHeaders: {
    'PayPal-Mock-Response': 'forced', 'paypal-mock-response': 'forced', 'X-Test': 'preserved',
  } });
  expect(fetcher.mock.calls[1][1].headers).toMatchObject({ 'X-Test': 'preserved' });
  expect(Object.keys(fetcher.mock.calls[1][1].headers).some(key => key.toLowerCase() === 'paypal-mock-response')).toBe(false);
});
it('preserves a genuine provider decline rather than manufacturing success', async () => {
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ name: 'UNPROCESSABLE_ENTITY', details: [{ issue: 'INSTRUMENT_DECLINED', description: 'Provider declined the instrument.' }] }), { status: 422 }));
  const paypal = await import(modulePath);
  await expect(paypal.capturePayPalOrder('ORDER', 'capture:reference')).rejects.toMatchObject({ status: 422, issue: 'INSTRUMENT_DECLINED' });
  expect(fetcher).toHaveBeenCalledTimes(2);
});
