import { describe, expect, it } from 'vitest';
import { sandboxCaptureTestHeaders } from '../../../supabase/functions/_shared/paypalSandboxTest';
const id = '14B55178L6621730G';
const path = `/v2/checkout/orders/${id}/capture`;
describe('scoped sandbox decline test', () => {
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


describe('sandbox-wide decline sentinel', () => {
  it('declines any sandbox capture when the sentinel is configured', () => {
    expect(JSON.parse(sandboxCaptureTestHeaders('sandbox', 'POST', '/v2/checkout/orders/OTHERORDER0000001/capture', 'ALL_SANDBOX_ORDERS')['PayPal-Mock-Response'])).toEqual({ mock_application_codes: 'INSTRUMENT_DECLINED' });
  });
  it('never applies the sentinel in live', () => {
    expect(sandboxCaptureTestHeaders('live', 'POST', path, 'ALL_SANDBOX_ORDERS')).toEqual({});
  });
  it('leaves non-capture calls alone', () => {
    expect(sandboxCaptureTestHeaders('sandbox', 'POST', '/v2/checkout/orders', 'ALL_SANDBOX_ORDERS')).toEqual({});
  });
});
