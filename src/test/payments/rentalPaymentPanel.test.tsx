import { describe, expect, it, vi, beforeEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const state = vi.hoisted(() => ({ config: {} as any, calls: [] as any[] }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: async (name: string, { body }: any) => {
        state.calls.push({ name, body });
        return { data: body.action === 'config' ? state.config : {}, error: null };
      },
    },
  },
}));
vi.mock('@/lib/rentalCheckoutAnalytics', () => ({ trackRentalCheckout: vi.fn() }));
vi.mock('@/lib/squareWebSdk', () => ({ loadSquareWebSdk: vi.fn(() => new Promise(() => {})) }));
vi.mock('@/components/transaction/checkout/PayPalEmbeddedPayment', () => ({
  default: ({ target }: any) => <div data-testid="paypal">{target.kind}:{target.id}</div>,
}));
import RentalPaymentPanel from '@/components/booking/RentalPaymentPanel';

const mount = () => render(
  <MemoryRouter>
    <RentalPaymentPanel bookingId="b1" listingId="l1" hostId="h1" listingHref="/listing/l1" totalUsd={112.9}
      flow="instant" paypalReturnUrl="/dashboard/bookings/b1?step=payment" onPaid={() => {}} />
  </MemoryRouter>,
);

describe('RentalPaymentPanel', () => {
  beforeEach(() => { cleanup(); state.calls = []; });

  it('asks the server which processor to use, sending only the booking id', async () => {
    state.config = { provider: 'paypal', reason: 'square_not_configured' };
    mount();
    expect((await screen.findByTestId('paypal')).textContent).toBe('booking:b1');
    expect(state.calls[0]).toEqual({ name: 'square-rental-payment', body: { action: 'config', booking_id: 'b1' } });
  });

  it('shows Square card checkout with the server amount when the host is connected', async () => {
    state.config = { provider: 'square', environment: 'sandbox', application_id: 'app', location_id: 'loc',
      amount_cents: 12_345, currency: 'USD', host_business_name: 'Taco Trailers LLC' };
    mount();
    expect(await screen.findByText(/Paid to Taco Trailers LLC through Square/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pay $123.45' })).toBeTruthy();
    expect(screen.queryByTestId('paypal')).toBeNull();
  });

  it('never charges when card payments are unavailable for the host', async () => {
    state.config = { provider: 'unavailable', reason: 'host_not_connected' };
    mount();
    expect(await screen.findByText(/aren't ready for this host yet/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Pay/ })).toBeNull();
  });
});
