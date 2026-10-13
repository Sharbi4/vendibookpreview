import { beforeEach, describe, expect, it, vi } from 'vitest';
const send = vi.hoisted(() => vi.fn());
vi.mock('../../../supabase/functions/_shared/invokeTransactionalEmail.ts', () => ({ invokeTransactionalEmail: send }));
import { dispatchCommerceEmails, supportAlert } from '../../../supabase/functions/_shared/commerceEmail';
const request = '11111111-1111-4111-8111-111111111111';
const invoice = '22222222-2222-4222-8222-222222222222';
const buyerEvent = { id: 'event-buyer', event_key: 'request:' + request + ':buyer', event_type: 'purchase_requested', sale_id: 'sale-1', recipient_id: 'buyer-1', link: '/dashboard/invoices?request=' + request, title: 'Request Pending', message: 'No payment collected.' };
const adminEvent = { id: 'event-admin', event_key: 'invoice-requested:' + request + ':admin:admin-1', event_type: 'invoice_requested', sale_id: 'sale-1', recipient_id: 'admin-1', link: '/admin/invoices?request=' + request, title: 'Send invoice', message: 'The seller approved this sale.' };
const releaseEvent = { ...adminEvent, id: 'event-release', event_key: 'release-ready:' + invoice + ':admin:admin-1', event_type: 'payout_ready', link: '/admin/invoices?invoice=' + invoice, title: 'Release seller payment' };
function client(events: unknown[], optedOut = false) {
  return {
    rpc: vi.fn(async (name: string) => ({ data: name === 'claim_commerce_emails' ? events : null, error: null })),
    from: vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { sale_email: !optedOut }, error: null }) }) }) })),
    auth: { admin: { getUserById: vi.fn(async () => ({ data: { user: { email: 'person@example.test' } }, error: null })) } },
  };
}
const supportCalls = () => send.mock.calls.filter(([arg]) => arg.recipientEmail === 'support@vendibook.com');
beforeEach(() => { send.mockReset(); send.mockResolvedValue({ data: { success: true }, error: null }); });
describe('manual invoice admin alerts', () => {
  it('alerts support once when a seller approves, keyed by the request', async () => {
    expect(await dispatchCommerceEmails(client([adminEvent], true))).toEqual({ processed: 1, failures: 0 });
    expect(supportCalls()).toHaveLength(1);
    expect(supportCalls()[0][0]).toMatchObject({ idempotencyKey: 'manual-invoice-request:' + request });
    expect(supportCalls()[0][0].templateData.ctaUrl).toBe('https://vendibook.com/admin/invoices?request=' + request);
  });
  it('alerts support when a paid sale is ready for a manual payout', async () => {
    await dispatchCommerceEmails(client([releaseEvent], true));
    expect(supportCalls()).toHaveLength(1);
    expect(supportCalls()[0][0].idempotencyKey).toBe('manual-payout-release:' + invoice);
  });
  it('uses the same support key for every admin recipient so it is sent once', () => {
    const second = { ...adminEvent, event_key: 'invoice-requested:' + request + ':admin:admin-2' };
    expect(supportAlert(second)?.key).toBe(supportAlert(adminEvent)?.key);
  });
  it('no longer alerts support when a buyer submits a request', async () => {
    await dispatchCommerceEmails(client([buyerEvent], true));
    expect(send).not.toHaveBeenCalled();
    expect(supportAlert(buyerEvent)).toBeNull();
  });
  it('retains failed alerts for retry and reuses the same idempotency key', async () => {
    send.mockResolvedValueOnce({ data: null, error: { message: 'temporary failure' } });
    const admin = client([adminEvent], true);
    expect((await dispatchCommerceEmails(admin)).failures).toBe(1);
    expect(admin.rpc).toHaveBeenCalledWith('finish_commerce_email', expect.objectContaining({ _event: adminEvent.id, _error: expect.stringContaining('retry scheduled') }));
    await dispatchCommerceEmails(admin);
    expect(send.mock.calls[0][0].idempotencyKey).toBe(send.mock.calls[1][0].idempotencyKey);
  });
  it('sends the buyer a Pay Invoice email that links to the invoice', async () => {
    await dispatchCommerceEmails(client([{ ...buyerEvent, event_type: 'invoice_issued', title: 'Pay Invoice', link: '/invoices/' + invoice }]));
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toMatchObject({ recipientEmail: 'person@example.test', templateData: { ctaLabel: 'Pay Invoice', ctaUrl: 'https://vendibook.com/invoices/' + invoice } });
  });
  it('refuses links outside the purchase and admin invoice pages', async () => {
    const admin = client([{ ...buyerEvent, link: 'https://evil.example/pay' }]);
    expect((await dispatchCommerceEmails(admin)).failures).toBe(1);
    expect(send).not.toHaveBeenCalled();
  });
});
