/**
 * PayPal Standard Checkout negative test.
 *
 * PAYPAL_SANDBOX_DECLINE_ORDER_ID accepts either:
 *   - a single 17-character sandbox order id (that capture declines), or
 *   - the sentinel ALL_SANDBOX_ORDERS (every sandbox capture declines).
 * It is ignored entirely in live.
 */
const SENTINEL = 'ALL_SANDBOX_ORDERS';

export function sandboxCaptureTestHeaders(environment: string, method: string, path: string, orderId?: string | null): Record<string, string> {
  if (environment !== 'sandbox' || method !== 'POST' || !orderId) return {};
  const decline = { 'PayPal-Mock-Response': JSON.stringify({ mock_application_codes: 'INSTRUMENT_DECLINED' }) };
  const captureMatch = /^\/v2\/checkout\/orders\/([A-Z0-9]{17})\/capture$/.exec(path);
  if (!captureMatch) return {};
  if (orderId === SENTINEL) return decline;
  if (!/^[A-Z0-9]{17}$/.test(orderId)) return {};
  return captureMatch[1] === orderId ? decline : {};
}
