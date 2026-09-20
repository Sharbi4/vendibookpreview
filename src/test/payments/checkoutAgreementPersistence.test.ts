import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), record: vi.fn(), current: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getUser: mocks.getUser }, rpc: mocks.rpc } }));
vi.mock('@/lib/legal/recordAcceptance', () => ({ recordLegalAcceptance: mocks.record, hasCurrentAcceptance: mocks.current }));
vi.mock('@/components/checkout/TransactionAgreementStep', () => ({ SALE_AGREEMENT_ACCEPTANCE_TEXT: 'sale', RENTAL_AGREEMENT_ACCEPTANCE_TEXT: 'rental', CHECKOUT_PRIVACY_ACCEPTANCE_TEXT: 'privacy' }));
import { recordCheckoutAgreements } from '@/lib/legal/recordCheckoutAgreements';
const input = { mode: 'sale' as const, trigger: 'purchase_review', relatedIds: { listing_id: 'listing' } };
beforeEach(() => { vi.resetAllMocks(); mocks.getUser.mockResolvedValue({ data: { user: { id: 'buyer' } }, error: null }); mocks.current.mockResolvedValue(false); mocks.record.mockResolvedValue({ error: null }); mocks.rpc.mockResolvedValue({ error: null }); });
describe('checkout acceptance persistence', () => {
  it('writes the platform acceptance checked by PayPal before completing checkout consent', async () => {
    await recordCheckoutAgreements(input);
    expect(mocks.record).toHaveBeenCalledWith(expect.objectContaining({ userId: 'buyer', slugs: ['terms-of-service', 'payments-terms', 'privacy-policy'], relatedEntityType: 'listing' }));
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });
  it('does not report acceptance success while sign-in is unavailable', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(recordCheckoutAgreements(input)).rejects.toThrow('sign in again');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('does not unlock payment when the platform acceptance write fails', async () => {
    mocks.record.mockResolvedValue({ error: new Error('write failed') });
    await expect(recordCheckoutAgreements(input)).rejects.toThrow('write failed');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});

