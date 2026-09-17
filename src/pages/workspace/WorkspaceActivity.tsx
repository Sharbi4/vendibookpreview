import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, Image as ImageIcon, Receipt } from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { useAuth } from '@/contexts/AuthContext';
import { useUserTransactions } from '@/hooks/useUserTransactions';
import { useShopperBookings } from '@/hooks/useShopperBookings';
import { useHostBookings } from '@/hooks/useHostBookings';
import WorkspaceHostBookings from '@/components/workspace/WorkspaceHostBookings';

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

    const bookingMoney = (value: number | null | undefined) =>
      value == null
        ? null
        : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
            Number(value),
          );

    const buyer: Item[] = buyerBookings.map((b) => ({
      id: `buyer-${b.id}`,
      kind: b.status === 'pending' ? 'requests' : 'rentals',
      title: b.listing?.title || 'Rental request',
      counterparty: 'You requested',
      state:
        b.payment_status && b.payment_status !== 'paid'
          ? `${b.status} · payment ${b.payment_status}`
          : b.status,
      nextAction:
        b.status === 'pending'
          ? 'Waiting on the host'
          : b.status === 'approved'
            ? 'Confirmed — check your dates'
            : null,
      date: b.created_at,
      amount: bookingMoney(b.total_price),
      reference: null,
      image: b.listing?.cover_image_url ?? null,
      href: `/dashboard/bookings/${b.id}`,
    }));

    // Pending host requests are handled in the booking manager panel above,
    // so they are not repeated as timeline rows.
    const seller: Item[] = sellerBookings
      .filter((b) => b.status !== 'pending')
      .map((b) => ({
        id: `seller-${b.id}`,
        kind: 'rentals' as const,
        title: b.listing?.title || 'Booking',
        counterparty: b.shopper?.full_name || 'Renter',
        state:
          b.payment_status && b.payment_status !== 'paid'
            ? `${b.status} · payment ${b.payment_status}`
            : b.status,
        nextAction: null,
        date: b.created_at,
        amount: bookingMoney(b.total_price),
        reference: null,
        image: b.listing?.cover_image_url ?? null,
        href: `/dashboard/bookings/${b.id}`,
      }));

    return [...payments, ...buyer, ...seller].sort(
      (a, b) => +new Date(b.date) - +new Date(a.date),
    );
  }, [transactions, buyerBookings, sellerBookings]);

  const hasHostBookings = sellerBookings.length > 0;
  const available = FILTERS.filter(
    (f) =>
      f.key === 'all' ||
      (f.key === 'requests' && hasHostBookings) ||
      items.some((item) => item.kind === f.key),
  );
  const shown = filter === 'all' ? items : items.filter((item) => item.kind === filter);

  // Group real items into time/state buckets so the page reads as a timeline.
  const groups = useMemo(() => {
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const needsAction = shown.filter((i) => i.nextAction || i.kind === 'disputes');
    const rest = shown.filter((i) => !needsAction.includes(i));
    const recent = rest.filter((i) => +new Date(i.date) >= monthAgo);
    const earlier = rest.filter((i) => +new Date(i.date) < monthAgo);
    return [
      { label: 'Needs action', hint: 'Waiting on you or on the other party.', items: needsAction },
      { label: 'Recent', hint: 'The last 30 days.', items: recent },
      { label: 'Earlier', hint: 'Completed and older records.', items: earlier },
    ].filter((g) => g.items.length);
  }, [shown]);

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
            <button
              key={f.key}
              type="button"
              className={`v2-filter${filter === f.key ? ' is-active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {(filter === 'all' || filter === 'requests') && <WorkspaceHostBookings />}

        {(filter === 'all' || filter === 'sales' || filter === 'listings') && (
          <WorkspaceListingActivity />
        )}

        {groups.length ? (
          groups.map((group) => (
            <section className="v2-panel" key={group.label}>
              <div className="v2-panel-head">
                <div>
                  <h2>{group.label}</h2>
                  <p>{group.hint}</p>
                </div>
              </div>
              {group.items.map((item) => (
                <Link className="v2-activity-row" to={item.href} key={item.id}>
                  <span className="v2-activity-thumb">
                    {item.image ? (
                      <img src={item.image} alt="" loading="lazy" />
                    ) : item.kind === 'rentals' || item.kind === 'requests' ? (
                      <CalendarDays />
                    ) : (
                      <Receipt />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="truncate">{item.title}</strong>
                    <small className="truncate">
                      {item.counterparty} · {new Date(item.date).toLocaleDateString()}
                      {item.reference ? ` · ${item.reference}` : ''}
                    </small>
                    <span className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span
                        className={`v2-status${
                          item.kind === 'disputes'
                            ? ' is-alert'
                            : item.nextAction
                              ? ' is-warn'
                              : ' is-ok'
                        }`}
                      >
                        {item.state}
                      </span>
                      {item.nextAction && <small>{item.nextAction}</small>}
                    </span>
                  </span>
                  {item.amount && <strong>{item.amount}</strong>}
                </Link>
              ))}
            </section>
          ))
        ) : hasHostBookings && (filter === 'all' || filter === 'requests') ? null : (
          <div className="v2-panel v2-empty">
            <ImageIcon className="opacity-40" />
            <p>
              No{' '}
              {filter === 'all'
                ? 'activity'
                : FILTERS.find((f) => f.key === filter)?.label.toLowerCase()}{' '}
              yet.
            </p>
            <Link to="/search" className="v2-btn-quiet">
              Browse the marketplace
            </Link>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
