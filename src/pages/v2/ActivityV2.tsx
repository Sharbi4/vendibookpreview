import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Receipt } from 'lucide-react';
import WorkspaceShell from '@/components/v2/WorkspaceShell';
import { useAuth } from '@/contexts/AuthContext';
import { useUserTransactions } from '@/hooks/useUserTransactions';
import { useShopperBookings } from '@/hooks/useShopperBookings';
import { useHostBookings } from '@/hooks/useHostBookings';
import { Button } from '@/components/ui/button';

type Filter = 'all' | 'purchases' | 'rentals' | 'sales' | 'disputes';
export default function ActivityV2() {
  const { user } = useAuth();
  const { transactions } = useUserTransactions(user?.id);
  const { bookings: buyerBookings } = useShopperBookings();
  const { bookings: sellerBookings } = useHostBookings();
  const [filter, setFilter] = useState<Filter>('all');
  const items = useMemo(() => [
    ...transactions.map((t) => ({ id: `payment-${t.id}`, kind: (t.dispute_status && t.dispute_status !== 'none' ? 'disputes' : t.role === 'buyer' ? 'purchases' : 'sales') as Filter, title: t.listing?.title || 'Vendibook payment', detail: `${t.role === 'buyer' ? 'Payment' : 'Sale'} · ${t.payment_status || 'recorded'}`, date: t.captured_at || t.created_at, href: `/orders/${t.id}`, amount: t.gross_amount_cents == null ? null : t.gross_amount_cents / 100 })),
    ...buyerBookings.map((b) => ({ id: `buyer-${b.id}`, kind: 'rentals' as Filter, title: b.listing?.title || 'Rental request', detail: `You requested · ${b.status}`, date: b.created_at, href: '/dashboard?view=shopper&tab=bookings', amount: null })),
    ...sellerBookings.map((b) => ({ id: `seller-${b.id}`, kind: 'rentals' as Filter, title: b.listing?.title || 'Rental request', detail: `Guest request · ${b.status}`, date: b.created_at, href: `/host/bookings?id=${b.id}`, amount: null })),
  ].sort((a,b) => +new Date(b.date) - +new Date(a.date)), [transactions, buyerBookings, sellerBookings]);
  const available = (['purchases','rentals','sales','disputes'] as Filter[]).filter((kind) => items.some((item) => item.kind === kind));
  const shown = filter === 'all' ? items : items.filter((item) => item.kind === filter);
  return <WorkspaceShell><div className="v2-page-stack"><header className="v2-page-heading"><p className="v2-eyebrow">Marketplace timeline</p><h1>Activity</h1><p>Purchases, rentals, sales, and disputes in one chronological view.</p></header>
    <div className="v2-filter-row"><Button variant={filter === 'all' ? 'secondary' : 'outline'} size="sm" onClick={() => setFilter('all')}>All</Button>{available.map((kind) => <Button key={kind} variant={filter === kind ? 'secondary' : 'outline'} size="sm" onClick={() => setFilter(kind)} className="capitalize">{kind}</Button>)}</div>
    <div className="v2-card">{shown.length ? shown.map((item) => <Link className="v2-activity-row" to={item.href} key={item.id}><span className="v2-activity-icon">{item.kind === 'rentals' ? <CalendarDays /> : <Receipt />}</span><span className="min-w-0 flex-1"><strong>{item.title}</strong><small>{item.detail} · {new Date(item.date).toLocaleDateString()}</small></span>{item.amount != null && <strong>${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>}</Link>) : <div className="v2-empty"><p>No {filter === 'all' ? 'activity' : filter} yet.</p><Link to="/search">Browse the marketplace</Link></div>}</div>
  </div></WorkspaceShell>;
}