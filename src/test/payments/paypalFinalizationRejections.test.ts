import { describe, expect, it, vi } from 'vitest';
const metrics = vi.hoisted(() => ({ ledger: vi.fn(), payable: vi.fn(), receipt: vi.fn() }));
vi.mock('../../../supabase/functions/_shared/paypal.ts', () => ({ centsFromPayPalAmount: (v: string) => Math.round(Number(v) * 100), safeLog: vi.fn() }));
vi.mock('../../../supabase/functions/_shared/paypalAccounting.ts', () => ({ appendLedgerEntry: metrics.ledger, ensureSellerPayable: metrics.payable }));
vi.mock('../../../supabase/functions/_shared/orders/orderEvents.ts', () => ({ recordOrderEvent: vi.fn() }));
vi.mock('../../../supabase/functions/_shared/orders/deliverOrderReceipt.ts', () => ({ deliverOrderReceipt: metrics.receipt }));
vi.mock('../../../supabase/functions/_shared/notify.ts', () => ({ notifyOrderParties: vi.fn(), notifyUser: vi.fn() }));
vi.mock('../../../supabase/functions/_shared/notifySellerPayment.ts', () => ({ notifySellerPaymentOutcome: vi.fn() }));
vi.mock('../../../supabase/functions/_shared/fulfillMonetizationPurchase.ts', () => ({ fulfillMonetizationPurchase: vi.fn() }));
vi.mock('../../../supabase/functions/_shared/concierge.ts', () => ({ fulfillConciergeOrder: vi.fn() }));
vi.mock('../../../supabase/functions/_shared/listingGuard.ts', () => ({ getListingPurchaseState: vi.fn(), LISTING_UNAVAILABLE_MESSAGE: 'unavailable' }));
// This is a Deno module. Load at runtime under the mocks rather than pulling
// its npm:/https: dependency graph into the browser TypeScript project.
const modulePath = '../../../supabase/functions/_shared/paypalFinalize.ts';
const { finalizeCapture } = await import(modulePath);
describe('rejected capture finalization', () => {
  it.each(['DECLINED', 'PENDING'])('does not downgrade a completed capture after late %s webhook', async status => {
    const db = { from: vi.fn() };
    const record = { id: 'payment', payment_status: 'completed', paypal_capture_id: 'capture' };
    expect(await finalizeCapture(db, record, { captureId: 'capture', status, amountCents: 100, currency: 'USD' }, 'webhook')).toBe(record);
    expect(db.from).not.toHaveBeenCalled();
  });
  it.each(['DECLINED', 'FAILED', 'PENDING'])('does not create paid ledger, payable or receipt for %s', async status => {
    vi.clearAllMocks();
    const record = { id: 'payment', reference: 'reference', payment_status: 'created' };
    let update: any;
    const q: any = { update: (v: any) => { update = v; return q; }, eq: () => q, neq: () => q, not: () => q, select: () => q, maybeSingle: async () => ({ data: { ...record, ...update }, error: null }) };
    const db = { from: () => q };
    const result = await finalizeCapture(db, record, { captureId: 'capture', status, amountCents: 100, currency: 'USD' }, 'capture_endpoint');
    expect(result.payment_status).toBe(status.toLowerCase());
    expect(metrics.ledger).not.toHaveBeenCalled();
    expect(metrics.payable).not.toHaveBeenCalled();
    expect(metrics.receipt).not.toHaveBeenCalled();
  });
});
