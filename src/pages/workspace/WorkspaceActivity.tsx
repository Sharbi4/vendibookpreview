import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, Image as ImageIcon, Receipt } from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { useAuth } from '@/contexts/AuthContext';
import { useUserTransactions } from '@/hooks/useUserTransactions';
import { useShopperBookings } from '@/hooks/useShopperBookings';
import { useHostBookings } from '@/hooks/useHostBookings';
import { Button } from '@/components/ui/button';

type Filter = 'all' | 'purchases' | 'sales' | 'rentals' | 'requests' | 'disputes';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'purchases', label: 'Purchases' },
  { key: 'sales', label: 'Sales' },
  { key: 'rentals', label: 'Rentals' },
  { key: 'requests', label: 'Booking requests' },
  { key: 'disputes', label: 'Disputes' },
];

const money = (cents: number | null | undefined) =>
  cents == null
    ? null
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

type Item = {
  id: string;
  kind: Exclude<Filter, 'all'>;
  title: string;
  counterparty: string | null;
  state: string;
  nextAction: string | null;
  date: string;
  amount: string | null;
  reference: string | null;
  image: string | null;
  href: string;
};

export default function WorkspaceActivity() {
  const { user } = useAuth();
  const { transactions } = useUserTransactions(user?.id);
  const { bookings: buyerBookings } = useShopperBookings();
  const { bookings: sellerBookings } = useHostBookings();
  const [searchParams] = useSearchParams();
  const initial = (searchParams.get('filter') as Filter) || 'all';
  const [filter, setFilter] = useState<Filter>(
    FILTERS.some((f) => f.key === initial) ? initial : 'all',
  );

  const items = useMemo<Item[]>(() => {
    const payments: Item[] = transactions.map((t) => {
      const disputed = !!t.dispute_status && t.dispute_status !== 'none';
      return {
        id: `payment-${t.id}`,
        kind: disputed ? 'disputes' : t.role === 'buyer' ? 'purchases' : 'sales',
        title: t.listing?.title || 'Vendibook payment',
        counterparty: t.role === 'buyer' ? 'Paid to seller' : 'Received from buyer',
        state: disputed ? `Dispute: ${t.dispute_status}` : t.payment_status || 'recorded',
        nextAction: disputed ? 'Respond with evidence' : null,
        date: t.captured_at || t.created_at,
        amount: money(t.gross_amount_cents),
        reference: t.reference,
        image: t.listing?.cover_image_url ?? null,
        href: `/orders/${t.id}`,
      };
    });

    const buyer: Item[] = buyerBookings.map((b) => ({
      id: `buyer-${b.id}`,
      kind: b.status === 'pending' ? 'requests' : 'rentals',
      title: b.listing?.title || 'Rental request',
      counterparty: 'You requested',
      state: b.status,
      nextAction:
        b.status === 'pending'
          ? 'Waiting on the host'
          : b.status === 'approved'
            ? 'Confirmed — check your dates'
            : null,
      date: b.created_at,
      amount: null,
      reference: null,
      image: b.listing?.cover_image_url ?? null,
      href: '/dashboard/inbox',
    }));

    const seller: Item[] = sellerBookings.map((b) => ({
      id: `seller-${b.id}`,
      kind: b.status === 'pending' ? 'requests' : 'rentals',
      title: b.listing?.title || 'Booking request',
      counterparty: b.shopper?.full_name || 'Renter',
      state: b.status,
      nextAction: b.status === 'pending' ? 'Approve, decline, or message' : null,
      date: b.created_at,
      amount: null,
      reference: null,
      image: b.listing?.cover_image_url ?? null,
      href: `/host/bookings?id=${b.id}`,
    }));

    return [...payments, ...buyer, ...seller].sort(
      (a, b) => +new Date(b.date) - +new Date(a.date),
    );
  }, [transactions, buyerBookings, sellerBookings]);

  const available = FILTERS.filter(
    (f) => f.key === 'all' || items.some((item) => item.kind === f.key),
  );
  const shown = filter === 'all' ? items : items.filter((item) => item.kind === filter);

  return (
    <WorkspaceShell>
      <div className="v2-page-stack">
        <header className="v2-page-heading">
          <p className="v2-eyebrow">Marketplace timeline</p>
          <h1>Activity</h1>
          <p>Purchases, sales, rentals, booking requests, and disputes in one place.</p>
        </header>

        <div className="v2-filter-row">
          {available.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? 'secondary' : 'outline'}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        <div className="v2-card divide-y">
          {shown.length ? (
            shown.map((item) => (
              <Link className="v2-activity-row" to={item.href} key={item.id}>
                <span className="v2-activity-icon overflow-hidden">
                  {item.image ? (
                    <img src={item.image} alt="" className="h-full w-full object-cover" />
                  ) : item.kind === 'rentals' || item.kind === 'requests' ? (
                    <CalendarDays />
                  ) : (
                    <Receipt />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="truncate">{item.title}</strong>
                  <small className="truncate">
                    {item.counterparty} · {item.state} ·{' '}
                    {new Date(item.date).toLocaleDateString()}
                    {item.reference ? ` · ${item.reference}` : ''}
                  </small>
                  {item.nextAction && <small className="font-semibold">{item.nextAction}</small>}
                </span>
                {item.amount && <strong>{item.amount}</strong>}
              </Link>
            ))
          ) : (
            <div className="v2-empty">
              <ImageIcon className="opacity-40" />
              <p>No {filter === 'all' ? 'activity' : FILTERS.find((f) => f.key === filter)?.label.toLowerCase()} yet.</p>
              <Link to="/search">Browse the marketplace</Link>
            </div>
          )}
        </div>
      </div>
    </WorkspaceShell>
  );
}
