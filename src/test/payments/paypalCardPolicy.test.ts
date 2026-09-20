import { describe, expect, it } from 'vitest';
import { advancedCardsReady, cardAuthenticationReady, cardPaymentSource, sameCheckoutSource } from '../../../supabase/functions/_shared/paypalCardPolicy';
const ready = { payments_receivable: true, primary_email_confirmed: true,
  products: [{ name: 'PPCP_CUSTOM', vetting_status: 'SUBSCRIBED' }],
  capabilities: [{ name: 'CUSTOM_CARD_PROCESSING', status: 'ACTIVE', limits: [] }] };
describe('Advanced Card policy', () => {
  it('requires subscribed card processing with no limits, not just wallet eligibility', () => {
    expect(advancedCardsReady(ready)).toBe(true);
    expect(advancedCardsReady({ ...ready, products: [{ name: 'PPCP_STANDARD', vetting_status: 'SUBSCRIBED' }] })).toBe(false);
    expect(advancedCardsReady({ ...ready, capabilities: [{ name: 'CUSTOM_CARD_PROCESSING', status: 'ACTIVE', limits: ['LIMIT'] }] })).toBe(false);
    expect(advancedCardsReady({ ...ready, capabilities: [{ name: 'CUSTOM_CARD_PROCESSING', status: 'INACTIVE' }] })).toBe(false);
    expect(advancedCardsReady({ ...ready, payments_receivable: false })).toBe(false);
    expect(advancedCardsReady({ ...ready, products: [] })).toBe(false);
  });
  it('creates a card-specific SCA payload without a PayPal wallet source or card data', () => {
    expect(cardPaymentSource('/return', '/cancel')).toEqual({ card: {
      attributes: { verification: { method: 'SCA_WHEN_REQUIRED' } },
      experience_context: { shipping_preference: 'NO_SHIPPING', return_url: '/return', cancel_url: '/cancel' },
    } });
    expect(cardPaymentSource(null, null, true).card.experience_context.shipping_preference).toBe('SET_PROVIDED_ADDRESS');
  });
  it('does not reuse wallet orders for card entry, while unchanged retries stay idempotent', () => {
    expect(sameCheckoutSource({}, false)).toBe(true);
    expect(sameCheckoutSource({}, true)).toBe(false);
    expect(sameCheckoutSource({ checkout_source: 'card_fields' }, true)).toBe(true);
    expect(sameCheckoutSource({ checkout_source: 'card_fields' }, false)).toBe(false);
  });
  it.each(['N', 'R', 'U', 'C', 'D'])('blocks failed or incomplete card authentication %s', authentication_status => {
    expect(cardAuthenticationReady({ authentication_result: { liability_shift: 'NO', three_d_secure: { enrollment_status: 'Y', authentication_status } } })).toBe(false);
  });
  it('allows verified authentication and non-required SCA, but blocks unknown results', () => {
    expect(cardAuthenticationReady({})).toBe(true);
    expect(cardAuthenticationReady({ authentication_result: { liability_shift: 'POSSIBLE', three_d_secure: { enrollment_status: 'Y', authentication_status: 'Y' } } })).toBe(true);
    expect(cardAuthenticationReady({ authentication_result: { liability_shift: 'NO', three_d_secure: { enrollment_status: 'B' } } })).toBe(true);
    expect(cardAuthenticationReady({ authentication_result: { liability_shift: 'UNKNOWN' } })).toBe(false);
  });
});
