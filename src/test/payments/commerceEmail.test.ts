import { beforeEach, describe, expect, it, vi } from 'vitest';
const send = vi.hoisted(() => vi.fn());
vi.mock('../../../supabase/functions/_shared/invokeTransactionalEmail.ts', () => ({ invokeTransactionalEmail: send }));
import { dispatchCommerceEmails } from '../../../supabase/functions/_shared/commerceEmail';
const request = '11111111-1111-4111-8111-111111111111';
const buyerEvent = { id: 'event-buyer', event_key: 'request:' + request + ':buyer', event_type: 'purchase_requested', sale_id: 'sale-1', recipient_id: 'buyer-1', link: '/dashboard/invoices?request=' + request, title: 'Request Pending', message: 'No payment collected.' };
function client(events: unknown[], optedOut = false) {
  return {
    rpc: vi.fn(async (name: string) => ({ data: name === 'claim_commerce_emails' ? events : null, error: null })),
    from: vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { sale_email: !optedOut }, error: null }) }) }) })),
    auth: { admin: { getUserById: vi.fn(async () => ({ data: { user: { email: 'buyer@example.test' } }, error: null })) } },
  };
}
beforeEach(() => { send.mockReset(); send.mockResolvedValue({ data: { success: true }, error: null }); });
describe('manual invoice admin alerts', () => {
  it('alerts support even when the buyer opts out, without sending the buyer email', async () => {
    const admin = client([buyerEvent], true);
    expect(await dispatchCommerceEmails(admin)).toEqual({ processed: 1, failures: 0 });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toMatchObject({ recipientEmail: 'support@vendibook.com', idempotencyKey: 'manual-invoice-request:' + request });
    expect(send.mock.calls[0][0].templateData.paragraphs.join(' ')).toContain('Payment is pending');
  });
  it('does not duplicate the admin alert for the seller event', async () => {
    await dispatchCommerceEmails(client([{ ...buyerEvent, id: 'event-seller', event_key: 'request:' + request + ':seller' }], true));
    expect(send).not.toHaveBeenCalled();
  });
  it('retains failed alerts for retry and reuses the same idempotency key', async () => {
    send.mockResolvedValueOnce({ data: null, error: { message: 'temporary failure' } });
    const admin = client([buyerEvent], true);
    expect((await dispatchCommerceEmails(admin)).failures).toBe(1);
    expect(admin.rpc).toHaveBeenCalledWith('finish_commerce_email', expect.objectContaining({ _event: buyerEvent.id, _error: expect.stringContaining('retry scheduled') }));
    await dispatchCommerceEmails(admin);
    expect(send.mock.calls[0][0].idempotencyKey).toBe(send.mock.calls[1][0].idempotencyKey);
  });
  it('preserves the existing buyer notification and does not alert on other event types', async () => {
    await dispatchCommerceEmails(client([{ ...buyerEvent, event_type: 'invoice_issued' }]));
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].recipientEmail).toBe('buyer@example.test');
  });
});
