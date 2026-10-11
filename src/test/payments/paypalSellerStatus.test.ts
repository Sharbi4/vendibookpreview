import { describe, expect, it } from 'vitest';
import { deriveStatus } from '../../../supabase/functions/_shared/paypalSellerStatus';
const scope = 'https://uri.paypal.com/services/payments/payment/authcapture';
const sample = () => ({ merchant_id: 'SELLER', payments_receivable: true, primary_email_confirmed: true,
  products: [{ name: 'PPCP_STANDARD', vetting_status: 'SUBSCRIBED' }, { name: 'PPCP_CUSTOM', vetting_status: 'IN_REVIEW' }],
  oauth_integrations: [{ integration_type: 'OAUTH_THIRD_PARTY', oauth_third_party: [{ partner_client_id: 'PLATFORM', scopes: [scope] }] }] });
describe('PayPal seller status', () => {
  it('reads nested permissions without requiring an undocumented ACTIVE field', () => {
    const result = deriveStatus(sample(), 'PLATFORM');
    expect(result.status).toBe('ready'); expect(result.scopes).toEqual([scope]);
    expect(result.acdcVetting).toBe('IN_REVIEW');
  });
  it('does not accept permission granted to another platform', () => {
    expect(deriveStatus(sample(), 'OTHER').status).toBe('action_required');
  });
  it('keeps granted permissions visible when email remains unconfirmed', () => {
    const result = deriveStatus({ ...sample(), primary_email_confirmed: false }, 'PLATFORM');
    expect(result.activeOauth).toBe(true); expect(result.status).toBe('action_required');
    expect(result.reasons).toEqual(['primary_email_unconfirmed']);
  });
  it('rejects inactive consent and incomplete permissions', () => {
    expect(deriveStatus({ ...sample(), oauth_integrations: [{ ...sample().oauth_integrations[0], status: 'I' }] }, 'PLATFORM').activeOauth).toBe(false);
    expect(deriveStatus({ ...sample(), oauth_integrations: [] }, 'PLATFORM').activeOauth).toBe(false);
  });
  it('does not block wallet readiness on a missing optional card vetting status', () => {
    expect(deriveStatus({ ...sample(), products: [{ name: 'PPCP_CUSTOM' }] }, 'PLATFORM').status).toBe('ready');
  });
  it('preserves explicit wallet restrictions', () => {
    expect(deriveStatus({ ...sample(), products: [{ name: 'PPCP', vetting_status: 'DENIED' }] }, 'PLATFORM').status).toBe('action_required');
  });
});
