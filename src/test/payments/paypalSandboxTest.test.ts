import { describe, expect, it } from 'vitest';
import { sandboxCaptureTestHeaders } from '../../../supabase/functions/_shared/paypalSandboxTest';
const id = '14B55178L6621730G';
const path = `/v2/checkout/orders/${id}/capture`;
describe('scoped sandbox decline test', () => {
  it('preserves the explicit all-sandbox test setting without enabling live tests', () => {
    expect(sandboxCaptureTestHeaders('sandbox', 'POST', path, 'ALL_SANDBOX_ORDERS')['PayPal-Mock-Response']).toBeTruthy();
    expect(sandboxCaptureTestHeaders('live', 'POST', path, 'ALL_SANDBOX_ORDERS')).toEqual({});
  });
  it.each(['INSTRUMENT_DECLINED', 'TRANSACTION_REFUSED', 'INTERNAL_SERVER_ERROR'])('sends supported scenario %s to PayPal', code => {
    expect(JSON.parse(sandboxCaptureTestHeaders('sandbox', 'POST', path, id, code)['PayPal-Mock-Response']).mock_application_codes).toBe(code);
  });
  it('rejects unsupported test names rather than silently making a normal capture', () => {
    expect(() => sandboxCaptureTestHeaders('sandbox', 'POST', path, id, 'FAKE_SUCCESS')).toThrow('Unsupported');
  });
  it('asks PayPal to decline only the selected sandbox capture', () => {
    expect(JSON.parse(sandboxCaptureTestHeaders('sandbox', 'POST', path, id)['PayPal-Mock-Response'])).toEqual({ mock_application_codes: 'INSTRUMENT_DECLINED' });
  });
  it('never enables the test in live', () => { expect(sandboxCaptureTestHeaders('live', 'POST', path, id)).toEqual({}); });
  it('does not affect another order or an unconfigured checkout', () => {
    expect(sandboxCaptureTestHeaders('sandbox', 'POST', path, 'OTHERORDER00000000')).toEqual({});
    expect(sandboxCaptureTestHeaders('sandbox', 'POST', path)).toEqual({});
  });
  it('does not alter status lookups', () => { expect(sandboxCaptureTestHeaders('sandbox', 'GET', path, id)).toEqual({}); });
});
