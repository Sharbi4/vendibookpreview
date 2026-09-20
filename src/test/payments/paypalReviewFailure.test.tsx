import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const invoke = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));
import PayPalReviewAuthorize, { type ReviewData } from '@/components/checkout/PayPalReviewAuthorize';
const review = { reference: 'payment', order_id: 'order', record_status: 'created', payment_intent: 'CAPTURE', currency: 'USD', amount_cents: 10000, lines: [], funding: { method: 'paypal', label: 'PayPal', email: null, brand: null, last4: null }, fulfillment: { method: null, address: null }, listing: null } as ReviewData;
afterEach(cleanup);
beforeEach(() => invoke.mockReset());
function submit() {
  const success = vi.fn();
  render(<PayPalReviewAuthorize orderId="order" initialData={review} onAuthorized={success} onChangeMethod={vi.fn()} />);
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Submit payment' }));
  return success;
}
describe('final payment outcome messages', () => {
  it('shows a confirmed decline and retains the change-method action', async () => {
    invoke.mockResolvedValue({ data: { status: 'declined', error: 'INSTRUMENT_DECLINED', message: 'Your bank declined this payment.' }, error: null });
    const success = submit();
    expect(await screen.findByText('Payment declined')).toBeInTheDocument();
    expect(screen.getByText('Your bank declined this payment.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use a different payment method' })).toBeEnabled();
    expect(success).not.toHaveBeenCalled();
  });
  it('passes a pending status to the status experience without calling it completed', async () => {
    invoke.mockResolvedValue({ data: { status: 'pending', reference: 'payment' }, error: null });
    const success = submit();
    await waitFor(() => expect(success).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' })));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('shows an interrupted connection without claiming payment was declined or uncharged', async () => {
    invoke.mockRejectedValue(new Error('Network error'));
    const success = submit();
    expect(await screen.findByText('Unable to confirm payment')).toBeInTheDocument();
    expect(screen.getByText(/payment may still be processing/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit payment' })).toBeEnabled();
    expect(success).not.toHaveBeenCalled();
  });
});

