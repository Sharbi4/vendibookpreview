import { expect, it } from 'vitest';
import { confirmedRefundId } from '../../../supabase/functions/_shared/confirmedRefund';
const completed = { success: true, provider: 'paypal' as const, status: 'COMPLETED', id: 'refund', amountCents: 10000 };
it('accepts a completed refund for the whole deposit', () => {
  expect(confirmedRefundId(completed, 10000)).toBe('refund');
});
it.each([
  { success: false }, { manual: true }, { status: 'PENDING' }, { status: 'FAILED' }, { id: undefined }, { amountCents: 5000 },
])('does not claim the deposit was refunded for %j', change => {
  expect(() => confirmedRefundId({ ...completed, ...change }, 10000)).toThrow();
});
