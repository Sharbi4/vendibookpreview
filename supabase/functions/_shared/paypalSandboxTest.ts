/** PayPal Standard Checkout negative test, restricted to one sandbox order. */
export function sandboxCaptureTestHeaders(environment: string, method: string, path: string, orderId?: string | null): Record<string, string> {
  if (environment !== 'sandbox' || method !== 'POST' || !orderId || !/^[A-Z0-9]{17}$/.test(orderId)) return {};
  if (path !== `/v2/checkout/orders/${orderId}/capture`) return {};
  return { 'PayPal-Mock-Response': JSON.stringify({ mock_application_codes: 'INSTRUMENT_DECLINED' }) };
}
