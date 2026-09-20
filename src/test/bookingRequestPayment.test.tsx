import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const state = vi.hoisted(() => ({ booking: {} as any, payment: null as any }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  const q: any = { select: () => q, eq: () => q, in: () => q, order: () => q, limit: () => q,
    maybeSingle: async () => ({ data: table === 'booking_requests' ? state.booking : state.payment, error: null }) };
  return q;
} } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'renter' } }) }));
vi.mock('@/hooks/useRequiredDocuments', () => ({ useListingRequiredDocuments: () => ({ data: [] }) }));
vi.mock('@/components/layout/Header', () => ({ default: () => null }));
vi.mock('@/components/layout/Footer', () => ({ default: () => null }));
vi.mock('@/components/SEO', () => ({ default: () => null }));
vi.mock('@/components/booking/AddToCalendarButton', () => ({ AddToCalendarButton: () => null }));
vi.mock('@/components/documents/DocumentUploadSection', () => ({ DocumentUploadSection: () => null }));
vi.mock('@/components/transaction/checkout/PayPalEmbeddedPayment', () => ({ default: ({ target }: any) => <div data-testid="paypal">{target.kind}:{target.id}</div> }));
import BookingConfirmation from '@/pages/BookingConfirmation';
import OrderReceipt from '@/pages/OrderReceipt';
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
beforeEach(() => {
  cleanup(); state.payment = null;
  state.booking = { id: 'b1', shopper_id: 'renter', host_id: 'host', listing_id: 'l1', status: 'pending', payment_status: 'unpaid',
    is_instant_book: false, start_date: '2026-09-22', end_date: '2026-09-23', total_price: 100, listings: { title: 'Rental trailer' } };
});
const mount = (query = '') => render(<MemoryRouter initialEntries={[`/dashboard/bookings/b1${query}`]}><BookingConfirmation embedded bookingId="b1" /></MemoryRouter>);
describe('booking status payment entry', () => {
  it('request stays waiting, never mounts PayPal before host approval', async () => {
    mount('?step=payment'); await screen.findByText(/Request sent.*waiting for host/);
    expect(screen.queryByTestId('paypal')).toBeNull();
    expect(screen.queryByText('Pay now')).toBeNull();
  });
  it('approved request exposes Pay now and uses the canonical booking payment target', async () => {
    state.booking.status = 'approved'; mount();
    fireEvent.click(await screen.findByText('Pay now'));
    expect(screen.getByTestId('paypal').textContent).toBe('booking:b1');
  });
  it('recovery URL returns directly to approved booking payment', async () => {
    state.booking.status = 'approved'; mount('?step=payment');
    expect((await screen.findByTestId('paypal')).textContent).toBe('booking:b1');
  });
  it('pending capture stays unpaid and links to its real transaction', async () => {
    state.booking.status = 'approved'; state.booking.payment_status = 'pending';
    state.payment = { reference: 'VB-123', payment_status: 'pending' }; mount('?step=payment');
    expect((await screen.findByText('View payment status and receipt')).getAttribute('href')).toBe('/receipt/VB-123');
    expect(screen.queryByTestId('paypal')).toBeNull();
    expect(screen.queryByText('Charged today')).toBeNull();
  });
});

it('pending receipt remains a status page and never calls it paid or redirects to return', async () => {
  state.payment = { reference: 'VB-123', payment_status: 'pending', gross_amount_cents: 10000 };
  render(<MemoryRouter initialEntries={['/receipt?ref=VB-123']}><OrderReceipt /></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Payment pending' })).toBeTruthy();
  expect(screen.queryByText('Paid', { exact: true })).toBeNull();
  expect(screen.queryByText('Total paid')).toBeNull();
  expect(screen.getByText('Refresh status')).toBeTruthy();
});
