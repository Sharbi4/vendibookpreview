import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    expect(await screen.findByText(destination)).toBeInTheDocument();
    expect(eq).toHaveBeenCalledWith('status', 'published');
    expect(eq).toHaveBeenCalledWith('moderation_status', 'clear');
    expect(not).toHaveBeenCalledWith('published_at', 'is', null);
    expect(is).toHaveBeenCalledWith('deleted_at', null);
  });
  it('shows multiple listings in requested order with separate destinations', async () => {
    lookup.mockResolvedValue({ data: [item(b, 'rent', 'Kitchen'), item()], error: null });
    mount(`${a}:1,${b}:1`);
    const links = await screen.findAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([`/checkout/${a}`, `/book/${b}`]);
    expect(screen.getAllByRole('img').map((image) => image.getAttribute('alt'))).toEqual(['Food truck', 'Kitchen']);
  });
  it('explains excess quantity before continuing with one asset', async () => {
    lookup.mockResolvedValue({ data: [item()], error: null });
    mount(`${a}:3`);
    expect(await screen.findByText(/You requested 3/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Checkout' })).toHaveAttribute('href', `/checkout/${a}`);
  });
  it('reports unavailable items in a partially available selection', async () => {
    lookup.mockResolvedValue({ data: [item()], error: null });
    mount(`${a}:1,${b}:1`);
    expect(await screen.findByRole('status')).toHaveTextContent('Some selected items are no longer available');
  });
  it('excludes test listings', async () => {
    lookup.mockResolvedValue({ data: [item(a, 'sale', 'QA test truck')], error: null });
    mount(`${a}:1`);
    expect(await screen.findByRole('link', { name: 'Browse listings' })).toBeInTheDocument();
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
});
