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
import RentalPaymentPanel from '@/components/booking/RentalPaymentPanel';

const mount = () => render(
  <MemoryRouter>
    <RentalPaymentPanel bookingId="b1" listingId="l1" hostId="h1" listingHref="/listing/l1" totalUsd={112.9}
      flow="instant" onPaid={() => {}} />
  </MemoryRouter>,
);

describe('RentalPaymentPanel', () => {
  beforeEach(() => { cleanup(); state.calls = []; });

  it('asks the server for the Square setup, sending only the booking id', async () => {
    state.config = { provider: 'unavailable', reason: 'square_not_configured' };
    mount();
    expect(await screen.findByText(/Card payment is temporarily unavailable/)).toBeTruthy();
    expect(state.calls[0]).toEqual({ name: 'square-rental-payment', body: { action: 'config', booking_id: 'b1' } });
  });

  it('shows Square card checkout with the server amount when the host is connected', async () => {
    state.config = { provider: 'square', environment: 'sandbox', application_id: 'app', location_id: 'loc',
      amount_cents: 12_345, currency: 'USD', host_business_name: 'Taco Trailers LLC' };
    mount();
    expect(await screen.findByText(/Paid to Taco Trailers LLC through Square/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pay $123.45' })).toBeTruthy();
    expect(screen.queryByText(/PayPal/i)).toBeNull();
  });

  it('never charges when card payments are unavailable for the host', async () => {
    state.config = { provider: 'unavailable', reason: 'host_not_connected' };
    mount();
    expect(await screen.findByText(/Card payment is temporarily unavailable/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Pay/ })).toBeNull();
  });

  it('itemizes rental, service fee, sales tax and refundable deposit before the renter pays', async () => {
    state.config = { provider: 'square', environment: 'production', application_id: 'app', location_id: 'loc',
      amount_cents: 364_735, currency: 'USD', host_business_name: null, tax_cents: 3_769,
      breakdown: [
        { label: 'Rental subtotal', amountCents: 54_000 },
        { label: 'Service fee', amountCents: 6_966, kind: 'fee' },
        { label: 'Refundable deposit', amountCents: 300_000 },
        { label: 'Florida sales tax', amountCents: 3_769, kind: 'tax' },
      ] };
    mount();
    const amountDue = await screen.findByLabelText('Amount due');
    const text = amountDue.textContent ?? '';
    expect(text).toContain('Rental subtotal$540.00');
    expect(text).toContain('Service fee$69.66');
    expect(text).toContain('Florida sales tax$37.69');
    expect(text).toContain('Refundable deposit$3,000.00');
    expect(text).toContain('Total due today$3,647.35');
    expect(text).toMatch(/refundable deposit is returned after the rental is completed/);
    expect(screen.getByRole('button', { name: 'Pay $3,647.35' })).toBeTruthy();
  });
});
