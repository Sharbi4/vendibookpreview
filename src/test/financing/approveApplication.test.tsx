import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { approveApplicationUrl } from '@/lib/financing/approveApplication';
import { ApproveApplicationButton } from '@/components/financing/ApproveApplicationButton';
vi.mock('@/lib/analytics', () => ({ trackFinancingApplyClick: vi.fn() }));
const listing = { id: 'listing1', title: 'Café & taco truck', price_sale: 70000, condition: 'new' };
describe('APPROVE hosted application', () => {
  it('encodes public equipment into the documented application URL', () => {
    const url = new URL(approveApplicationUrl(listing));
    expect(url.origin + url.pathname).toBe('https://www.kwipped.com/approve/finance');
    expect(url.searchParams.get('link_version')).toBe('2.0');
    const bytes = Uint8Array.from(atob(url.searchParams.get('items')!), c => c.charCodeAt(0));
    expect(JSON.parse(new TextDecoder().decode(bytes))).toEqual([{ model: listing.title, price: 70000, subtotal: 70000, quantity: 1, type: 'new_product' }]);
    expect(url.searchParams.has('customer')).toBe(false);
  });
  it('does not invent equipment condition', () => {
    expect(new URL(approveApplicationUrl({ ...listing, condition: null })).searchParams.has('items')).toBe(false);
  });
  it('renders a real application link with the official logo, no handoff form', () => {
    render(<ApproveApplicationButton listing={listing} />);
    expect(screen.getByRole('link', { name: /Apply with APPROVE/ })).toHaveAttribute('href', approveApplicationUrl(listing));
    expect(within(screen.getByRole('link', { name: /Apply with APPROVE/ })).getByRole('img', { name: 'APPROVE' })).toHaveAttribute('src', '/brand/approve-logo-primary.svg');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
