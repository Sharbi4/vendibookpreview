import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import MetaCheckout from '@/pages/MetaCheckout';
import { parseMetaProducts } from '@/lib/metaCheckout';

const { lookup, eq, not, is } = vi.hoisted(() => ({
  lookup: vi.fn(), eq: vi.fn(), not: vi.fn(), is: vi.fn(),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select: () => {
    const query = { eq, not, is, in: lookup };
    eq.mockReturnValue(query); not.mockReturnValue(query); is.mockReturnValue(query);
    return query;
  } }) },
}));
vi.mock('@/components/layout/Header', () => ({ default: () => null }));
vi.mock('@/components/layout/Footer', () => ({ default: () => null }));
vi.mock('@/components/SEO', () => ({ default: () => null }));

const a = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const b = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const item = (id = a, mode = 'sale', title = 'Food truck') => ({
  id, mode, title, price_sale: 12000, price_daily: 200,
  price_weekly: null, price_monthly: null, price_hourly: null,
  cover_image_url: 'https://example.com/truck.jpg', image_urls: [],
});
let navigate: ReturnType<typeof useNavigate>;
function Harness() {
  navigate = useNavigate();
  return <Routes>
    <Route path="/meta-checkout" element={<MetaCheckout />} />
    <Route path="/checkout/:id" element={<p>Sale checkout destination</p>} />
    <Route path="/book/:id" element={<p>Booking destination</p>} />
  </Routes>;
}
function mount(products: string, extra = '') {
  return render(<MemoryRouter initialEntries={[`/meta-checkout?products=${encodeURIComponent(products)}${extra}`]}><Harness /></MemoryRouter>);
}
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('Meta product parameters', () => {
  it('normalizes IDs, sums duplicates, and supports ID-only links', () => {
    expect(parseMetaProducts(`${a.toUpperCase()}:2,${a}:3,${b}`)).toEqual([
      { id: a, quantity: 5 }, { id: b, quantity: 1 },
    ]);
  });
  it('rejects malformed IDs and invalid quantities without throwing', () => {
    expect(parseMetaProducts(`%ZZ,other:1,${a}:0,${a}:-1,${a}:1.5,${a}:2junk,${a}:,${a}:1:2,${a}:9007199254740992`)).toEqual([]);
    expect(parseMetaProducts(null)).toEqual([]);
  });
  it('uses the decoding already performed by URLSearchParams', () => {
    expect(parseMetaProducts(new URLSearchParams(`products=${a}%3A2%2C${b}%3A1`).get('products'))).toEqual([
      { id: a, quantity: 2 }, { id: b, quantity: 1 },
    ]);
  });
});

describe('Meta checkout handoff', () => {
  it.each([['sale', 'Sale checkout destination'], ['rent', 'Booking destination']])('routes one %s listing', async (mode, destination) => {
    lookup.mockResolvedValue({ data: [item(a, mode)], error: null });
    mount(`${a}:1`, '&coupon=TEST');
    expect(await screen.findByRole('heading', { name: 'Your cart' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: /Continue to/ }));
    expect(await screen.findByText(destination)).toBeInTheDocument();
    expect(eq).toHaveBeenCalledWith('status', 'published');
    expect(eq).toHaveBeenCalledWith('moderation_status', 'clear');
    expect(not).toHaveBeenCalledWith('published_at', 'is', null);
    expect(is).toHaveBeenCalledWith('deleted_at', null);
  });
  it('shows multiple listings in requested order with separate destinations', async () => {
    lookup.mockResolvedValue({ data: [item(b, 'rent', 'Kitchen'), item()], error: null });
    mount(`${a}:1,${b}:1`);
    fireEvent.click(await screen.findByRole('button', { name: 'Continue to checkout' }));
    const links = await screen.findAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([`/checkout/${a}`, `/book/${b}`]);
    expect(screen.getAllByRole('img').map((image) => image.getAttribute('alt'))).toEqual(['Food truck', 'Kitchen']);
  });
  it('normalizes Meta quantities above 1 and allows checkout', async () => {
    lookup.mockResolvedValue({ data: [item()], error: null });
    mount(`${a}:3`);
    expect(await screen.findByText('Quantity: 1')).toBeInTheDocument();
    expect(screen.getByText(/quantity is set to 1/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue to checkout' })).toHaveAttribute('href', `/checkout/${a}`);
    expect(screen.getByText('Line total: $12,000.00')).toBeInTheDocument();
  });
  it('reports unavailable items in a partially available selection', async () => {
    lookup.mockResolvedValue({ data: [item()], error: null });
    mount(`${a}:1,${b}:1`);
    expect(await screen.findByRole('status')).toHaveTextContent('Some selected items are no longer available');
    expect(within(screen.getByRole('list', { name: 'Cart items' })).getAllByRole('listitem')).toHaveLength(2);
    expect(within(screen.getByRole('region', { name: 'Order summary' })).getByText('Unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue to checkout' })).toBeDisabled();
  });
  it('excludes test listings', async () => {
    lookup.mockResolvedValue({ data: [item(a, 'sale', 'QA test truck')], error: null });
    mount(`${a}:1`);
    expect(await screen.findByText('Unavailable item')).toBeInTheDocument();
    expect(screen.queryByText('QA test truck')).not.toBeInTheDocument();
  });
  it('does not query for invalid input', () => {
    mount('%ZZ');
    expect(screen.getByText('This item is no longer available')).toBeInTheDocument();
    expect(lookup).not.toHaveBeenCalled();
  });
  it.each(['returned', 'thrown'])('shows retry for a %s error and recovers', async (kind) => {
    if (kind === 'returned') lookup.mockResolvedValueOnce({ data: null, error: { message: 'offline' } });
    else lookup.mockRejectedValueOnce(new Error('offline'));
    lookup.mockResolvedValueOnce({ data: [item()], error: null });
    mount(`${a}:1`);
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    fireEvent.click(await screen.findByRole('link', { name: 'Continue to checkout' }));
    expect(await screen.findByText('Sale checkout destination')).toBeInTheDocument();
  });
  it('clears stale selections and ignores a late response after URL changes', async () => {
    let resolve: (value: unknown) => void;
    lookup.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    mount(`${a}:1`);
    await waitFor(() => expect(lookup).toHaveBeenCalled());
    act(() => navigate('/meta-checkout'));
    await act(async () => resolve({ data: [item()], error: null }));
    expect(screen.getByText('This item is no longer available')).toBeInTheDocument();
    expect(screen.queryByText('Sale checkout destination')).not.toBeInTheDocument();
  });
  it('matches the supplied Meta URL summary and ignores blank coupon and tracking', async () => {
    lookup.mockResolvedValue({ data: [{ ...item(a), price_sale: 59999 }, { ...item(b, 'sale', 'Tap Trailer'), price_sale: 11000 }], error: null });
    mount(`${a}:1,${b}:1`, '&coupon&cart_origin=meta_shops&fbclid=tracking-only');
    expect(await screen.findByText('Line total: $59,999.00')).toBeInTheDocument();
    expect(screen.getByText('Line total: $11,000.00')).toBeInTheDocument();
    expect(screen.getAllByText('Quantity: 1')).toHaveLength(2);
    expect(within(screen.getByRole('region', { name: 'Order summary' })).getByText('$70,999.00')).toBeInTheDocument();
    expect(screen.queryByText(/Coupon not applied/)).not.toBeInTheDocument();
  });
  it('uses cent arithmetic and never applies an unsupported offer', async () => {
    lookup.mockResolvedValue({ data: [{ ...item(a), price_sale: 0.1 }, { ...item(b), price_sale: 0.2 }], error: null });
    mount(`${a}:1,${b}:1`, '&coupon=SAVE50');
    expect(await screen.findByText('Coupon not applied. Listing purchases and rentals do not support coupon codes.')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Order summary' })).getByText('$0.30')).toBeInTheDocument();
  });
  it('uses the feed rental price precedence and labels the billing period', async () => {
    lookup.mockResolvedValue({ data: [{ ...item(a, 'rent'), price_daily: 0, price_weekly: 500 }], error: null });
    mount(`${a}:1`);
    expect(await screen.findByText('Unit price: $500.00/week')).toBeInTheDocument();
    expect(screen.getByText(/Rental lines use one listed billing period/)).toBeInTheDocument();
  });
  it('does not invent a subtotal for missing prices', async () => {
    lookup.mockResolvedValue({ data: [{ ...item(), price_sale: null }], error: null });
    mount(`${a}:1`);
    expect(await screen.findByText('Price unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue to checkout' })).toBeDisabled();
    expect(within(screen.getByRole('region', { name: 'Order summary' })).getByText('Unavailable')).toBeInTheDocument();
  });
});
