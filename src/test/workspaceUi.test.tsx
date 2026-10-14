import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StatTile, StatGrid, ActionList, formatCents, formatCount, metric } from '@/components/workspace/ui';
import { summarizePayables, proceedsSince } from '@/lib/payouts/payableTotals';

const wrap = (ui: JSX.Element) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('workspace UI primitives', () => {
  it('shows an em dash for an unknown value, never a fake zero', () => {
    wrap(<StatGrid label="Money"><StatTile label="Ready to request" format="cents" value={null} /></StatGrid>);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('$0')).not.toBeInTheDocument();
  });
  it('shows a skeleton while loading and a real zero once loaded', () => {
    const { rerender } = wrap(<StatTile label="Offers" value={undefined} />);
    expect(screen.getByText('Loading')).toBeInTheDocument();
    rerender(<MemoryRouter><StatTile label="Offers" value={0} /></MemoryRouter>);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
  it('formats counts and cents, and maps query state to values', () => {
    expect(formatCount(1234)).toBe('1,234');
    expect(formatCount(null)).toBe('—');
    expect(formatCents(273900)).toBe('$2,739');
    expect(formatCents(64215, { cents: true })).toBe('$642.15');
    expect(metric(3, { loading: true })).toBeUndefined();
    expect(metric(3, { error: true })).toBeNull();
    expect(metric(3, {})).toBe(3);
  });
  it('lists urgent actions first with working links', () => {
    wrap(<ActionList items={[{ id: 'a', title: 'Unread messages', to: '/dashboard/messages' }, { id: 'b', title: 'Offer waiting', to: '/dashboard/offers', urgent: true }]} />);
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/dashboard/offers');
    expect(links[1]).toHaveAttribute('href', '/dashboard/messages');
  });
});

describe('payable totals', () => {
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  const rows = [
    { status: 'eligible_for_review', net_payout_cents: 100, created_at: iso(now) },
    { status: 'pending_release', net_payout_cents: 200, created_at: iso(now), payout_eligible_at: '2099-01-02T00:00:00Z' },
    { status: 'awaiting_payment_confirmation', net_payout_cents: 50, created_at: iso(now), release_due_at: '2099-01-01T00:00:00Z' },
    { status: 'payout_processing', net_payout_cents: 25, created_at: iso(now) },
    { status: 'payout_completed', net_payout_cents: 1000, created_at: '2000-01-01T00:00:00Z', payout_completed_at: '2000-02-01T00:00:00Z' },
    { status: 'fully_refunded', net_payout_cents: 999, created_at: iso(now) },
  ];
  it('matches the Money center buckets', () => {
    const t = summarizePayables(rows);
    expect(t).toMatchObject({ available: 100, upcoming: 250, inReview: 25, paid: 1000 });
    expect(t.nextExpectedAt).toBe('2099-01-01T00:00:00.000Z');
    expect(t.lastPaidAt).toBe('2000-02-01T00:00:00.000Z');
  });
  it('counts this month’s proceeds and skips refunded or reversed payables', () => {
    expect(proceedsSince(rows)).toMatchObject({ cents: 375, count: 4 });
  });
});
