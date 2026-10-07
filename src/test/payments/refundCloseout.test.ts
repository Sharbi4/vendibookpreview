import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../supabase/functions/_shared/paypal.ts', () => ({ newPaymentReference: () => 'ref' }));

// Deno module, loaded at runtime (same pattern as paypalFinalizationRejections).
const modulePath = '../../../supabase/functions/_shared/paypalAccounting.ts';
const { closeSaleAfterFullRefund, refundedCentsFromLedger } = await import(modulePath);

type Call = { table: string; op: string; value?: unknown; filters: unknown[] };

/** Minimal chainable Supabase stand-in that records every write. */
function fakeDb(opts: { saleStatus?: string | null; ledger?: number[]; failSaleUpdate?: boolean }) {
  const calls: Call[] = [];
  let saleStatus = opts.saleStatus ?? null;
  const from = (table: string) => {
    const call: Call = { table, op: 'select', filters: [] };
    const q: any = {
      select: () => q,
      update: (value: any) => { call.op = 'update'; call.value = value; calls.push(call); return q; },
      eq: (...f: unknown[]) => { call.filters.push(['eq', ...f]); return q; },
      in: (...f: unknown[]) => { call.filters.push(['in', ...f]); return q; },
      not: (...f: unknown[]) => { call.filters.push(['not', ...f]); return q; },
      maybeSingle: async () => ({ data: saleStatus ? { id: 'sale', status: saleStatus } : null, error: null }),
      then: (resolve: (v: unknown) => void) => {
        if (table === 'payment_ledger_entries') {
          return resolve({ data: (opts.ledger ?? []).map((amount_cents) => ({ amount_cents })), error: null });
        }
        if (table === 'sale_transactions' && call.op === 'update') {
          if (opts.failSaleUpdate) return resolve({ error: { message: 'Illegal sale transition' } });
          saleStatus = (call.value as { status: string }).status;
        }
        return resolve({ error: null });
      },
    };
    return q;
  };
  return { db: { from }, calls, status: () => saleStatus };
}

const record = { id: 'payment', sale_transaction_id: 'sale' };

describe('refund totals come from the deduplicated ledger', () => {
  it('sums refund and reversal entries once', async () => {
    const { db } = fakeDb({ ledger: [1500, 2500] });
    expect(await refundedCentsFromLedger(db, 'payment')).toBe(4000);
  });
});

describe('closeSaleAfterFullRefund', () => {
  it('moves a paid sale to refunded and closes documents, handoffs and deliveries', async () => {
    const f = fakeDb({ saleStatus: 'paid' });
    const res = await closeSaleAfterFullRefund(f.db, record, 'Refunded in full');
    expect(res).toEqual({ ok: true, saleStatus: 'refunded' });
    const tables = f.calls.map((c) => `${c.table}:${JSON.stringify(c.value)}`);
    expect(tables.some((t) => t.startsWith('documents:') && t.includes('voided'))).toBe(true);
    expect(tables.some((t) => t.startsWith('handoff_sessions:') && t.includes('cancelled'))).toBe(true);
    expect(tables.some((t) => t.startsWith('fulfillment_sessions:') && t.includes('"tracking_active":false'))).toBe(true);
  });

  it('routes a completed sale through disputed to reach refunded', async () => {
    const f = fakeDb({ saleStatus: 'completed' });
    const res = await closeSaleAfterFullRefund(f.db, record, 'Refund after delivery');
    expect(res.saleStatus).toBe('refunded');
    const saleUpdates = f.calls.filter((c) => c.table === 'sale_transactions').map((c) => (c.value as any).status);
    expect(saleUpdates).toEqual(['disputed', 'refunded']);
  });

  it('cancels a sale that never reached paid', async () => {
    const f = fakeDb({ saleStatus: 'pending' });
    expect((await closeSaleAfterFullRefund(f.db, record, 'x')).saleStatus).toBe('cancelled');
  });

  it('leaves an already refunded sale alone', async () => {
    const f = fakeDb({ saleStatus: 'refunded' });
    await closeSaleAfterFullRefund(f.db, record, 'x');
    expect(f.calls.filter((c) => c.table === 'sale_transactions')).toHaveLength(0);
  });

  it('flags the payment for review instead of swallowing a failed update', async () => {
    const f = fakeDb({ saleStatus: 'paid', failSaleUpdate: true });
    const res = await closeSaleAfterFullRefund(f.db, record, 'x');
    expect(res.ok).toBe(false);
    const flag = f.calls.find((c) => c.table === 'payment_records');
    expect((flag?.value as any).internal_status).toBe('needs_review');
  });
});
