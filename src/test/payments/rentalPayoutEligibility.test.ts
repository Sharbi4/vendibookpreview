import { expect, it } from 'vitest';
import { queueCompletedRentalPayouts } from '../../../supabase/functions/_shared/rentalPayoutEligibility';

const booking = { id: 'booking-a', status: 'completed', payment_status: 'paid' };
const row = { id: 'payable-a', status: 'pending_release', net_payout_cents: 8200, payment: { transaction_type: 'rental', booking_request_id: 'booking-a', payment_status: 'completed' } };
function fakeDb(rows = [row], error: any = null, alreadyQueued = false) {
  const calls: { table: string; patch?: any; filters: unknown[][] }[] = [];
  const db = { from(table: string) {
    const call: typeof calls[number] = { table, filters: [] }; calls.push(call);
    const q: any = {
      select: () => q,
      eq: (...args: unknown[]) => { call.filters.push(args); return q; },
      update: (patch: any) => { call.patch = patch; return q; },
      then: (resolve: any) => resolve({ error, data: call.patch ? (alreadyQueued ? [] : [{ id: row.id, net_payout_cents: row.net_payout_cents }]) : rows }),
    };
    return q;
  } };
  return { db, calls };
}
it('queues only the specific booking and reports actual proceeds without recording a transfer', async () => {
  const { db, calls } = fakeDb();
  expect(await queueCompletedRentalPayouts(db, booking)).toEqual({ count: 1, amountCents: 8200 });
  expect(calls[0].filters).toContainEqual(['payment.booking_request_id', 'booking-a']);
  expect(calls[0].filters).toContainEqual(['payment.transaction_type', 'rental']);
  expect(calls[1].patch.status).toBe('eligible_for_review');
  expect(calls[1].filters).toContainEqual(['status', 'pending_release']);
  expect(calls.some(call => call.table === 'booking_requests' || call.patch?.payout_completed_at)).toBe(false);
});
it('does not queue unfinished, disputed or frozen rentals', async () => {
  for (const [r, b] of [[row, { ...booking, status: 'approved' }], [row, { ...booking, dispute_status: 'open' }], [{ ...row, dispute_frozen_at: '2026-10-09' }, booking]] as const) {
    const { db, calls } = fakeDb([r]);
    expect(await queueCompletedRentalPayouts(db, b)).toEqual({ count: 0, amountCents: 0 });
    expect(calls).toHaveLength(1);
  }
});
it('does not count a payout already queued by another run', async () => {
  const { db } = fakeDb([row], null, true);
  expect(await queueCompletedRentalPayouts(db, booking)).toEqual({ count: 0, amountCents: 0 });
});
it('reports query failures instead of pretending review succeeded', async () => {
  const { db } = fakeDb([], { message: 'unavailable' });
  await expect(queueCompletedRentalPayouts(db, booking)).rejects.toThrow('unavailable');
});
