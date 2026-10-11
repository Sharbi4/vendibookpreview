import { describe, expect, it } from 'vitest';
import { captureFailure, captureFromOrder } from '../../../supabase/functions/_shared/paypalCaptureOutcome';
describe('PayPal capture truth', () => {
  it('does not confuse completed order with a declined capture', () => {
    const result = captureFromOrder({ status: 'COMPLETED', purchase_units: [{ payments: { captures: [{ id: 'capture', status: 'DECLINED' }] } }] });
    expect(result?.status).toBe('DECLINED');
  });
  it('does not turn approval or an outer completed status into capture proof', () => {
    expect(captureFromOrder({ status: 'APPROVED' })).toBeNull();
    expect(captureFromOrder({ status: 'COMPLETED' })).toBeNull();
  });
  it.each(['INSTRUMENT_DECLINED', 'TRANSACTION_REFUSED', 'PAYER_CANNOT_PAY'])('classifies provider refusal %s as declined', issue => {
    expect(captureFailure(issue, 422).status).toBe('declined');
  });
  it.each(['PAYER_ACTION_REQUIRED', 'ORDER_NOT_APPROVED'])('does not call missing approval %s a decline', issue => {
    expect(captureFailure(issue, 422).status).toBe('created');
  });
  it.each([401, 403, 404])('does not call API setup error %s a funding decline', code => {
    expect(captureFailure(undefined, code).status).toBe('failed');
  });
  it.each([429, 500, 503])('keeps ambiguous response %s unconfirmed', code => {
    expect(captureFailure(undefined, code).status).toBe('pending');
  });
});
