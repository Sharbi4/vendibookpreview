import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Receipt, Loader2 } from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useUserTransactions } from '@/hooks/useUserTransactions';
import { useShopperBookings } from '@/hooks/useShopperBookings';
import { useHostBookings } from '@/hooks/useHostBookings';
import { useBuyerSaleTransactions, useSellerSaleTransactions } from '@/hooks/useSaleTransactions';

type Row = { id: string; kind: string; title: string; image?: string | null; date: string; amount: number; currency: string; payment: string; fulfillment: string; counterpart: string; href: string; reference?: string | null; orderId?: string };
const readable = (s: string) => s.replace(/_/g, ' ');

export default function WorkspaceTransactions() {
  const { user } = useAuth();
  const { transactions, isLoading } = useUserTransactions(user?.id);
  const buyer = useBuyerSaleTransactions(user?.id);
  const seller = useSellerSaleTransactions(user?.id);
  const rentals = useShopperBookings();
  const hosted = useHostBookings();
  const [filter, setFilter] = useState('All');
  const sales = [...buyer.transactions, ...seller.transactions];
  const bookings = [...rentals.bookings, ...hosted.bookings];
  // One row per transaction, with its latest payment attempt attached. A
  // completed payment takes precedence over failed or abandoned retries.
  const payments = [...transactions].sort((a, b) => Number(b.payment_status === 'completed') - Number(a.payment_status === 'completed'));
  const rows: Row[] = sales.map(s => {
    const p = payments.find(p => p.sale_transaction_id === s.id);
    return { id: `sale-${s.id}`, kind: s.buyer_id === user?.id ? 'Purchases' : 'Sales', title: s.listing?.title || 'Equipment purchase', image: s.listing?.cover_image_url, date: s.created_at,
      amount: p ? (p.gross_amount_cents ?? 0) / 100 : s.amount, currency: p?.currency || 'USD', payment: p?.payment_status || (s.status === 'pending_cash' ? 'Pay in person' : s.status),
      fulfillment: [s.fulfillment_type, s.shipping_status].filter(Boolean).map(readable).join(' · ') || 'Details to confirm', counterpart: (s.buyer_id === user?.id ? s.seller?.full_name : s.buyer?.full_name) || (s.buyer_id === user?.id ? 'Seller' : 'Buyer'),
      href: p ? `/dashboard/transactions/${p.id}` : `/transaction/${s.id}`, orderId: p?.id, reference: p?.reference };
  });
  for (const b of bookings) {
    if (rows.some(r => r.id === `booking-${b.id}`)) continue;
    const p = payments.find(p => p.booking_request_id === b.id);
    const payNow = b.shopper_id === user?.id && b.status === 'approved' && !['paid', 'pending'].includes(b.payment_status ?? '');
    rows.push({ id: `booking-${b.id}`, kind: 'Rentals', title: b.listing?.title || 'Rental booking', image: b.listing?.cover_image_url, date: b.created_at, amount: Number(b.total_price), currency: 'USD',
      payment: payNow ? 'Approved — Pay now' : b.payment_status || 'unpaid', fulfillment: `${readable(b.status)} · ${readable(b.fulfillment_selected || 'Details to confirm')}`, counterpart: b.shopper_id === user?.id ? 'Host' : 'Renter',
      href: payNow ? `/dashboard/bookings/${b.id}?step=payment` : p ? `/dashboard/transactions/${p.id}` : `/dashboard/bookings/${b.id}`, orderId: p?.id, reference: p?.reference });
  }
  for (const p of transactions) {
    if (p.sale_transaction_id && sales.some(s => s.id === p.sale_transaction_id) || p.booking_request_id && bookings.some(b => b.id === p.booking_request_id)) continue;
    rows.push({ id: p.id, kind: p.booking_request_id ? 'Rentals' : p.sale_transaction_id ? p.role === 'buyer' ? 'Purchases' : 'Sales' : 'Other', title: p.listing?.title || 'Marketplace transaction', image: p.listing?.cover_image_url, date: p.created_at, amount: (p.gross_amount_cents ?? 0) / 100, currency: p.currency || 'USD', payment: p.payment_status || 'recorded', fulfillment: p.internal_status || 'View transaction', counterpart: p.role === 'buyer' ? 'Seller' : 'Buyer', href: `/dashboard/transactions/${p.id}`, orderId: p.id, reference: p.reference });
  }
  const visible = rows.filter(r => filter === 'All' || r.kind === filter).sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const loading = isLoading || buyer.isLoading || seller.isLoading || rentals.isLoading || hosted.isLoading;
  return <WorkspaceShell><div className="v2-page-stack">
    <header className="v2-page-heading"><p className="v2-eyebrow">Your deals, together</p><h1>Transactions</h1><p>Follow payments, handoffs, and paperwork from one place.</p>
      <div className="flex flex-wrap gap-3 mt-4"><Link className="v2-btn-outline" to="/dashboard/cases">Support cases</Link><Link className="v2-btn-quiet" to="/dashboard/activity">Walkthroughs & activity</Link></div>
    </header>
    <div className="v2-filter-row">{['All', 'Purchases', 'Sales', 'Rentals', 'Other'].map(f => <button key={f} className={`v2-filter${filter === f ? ' is-active' : ''}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>)}</div>
    {loading ? <div role="status" aria-label="Loading transactions"><Loader2 className="animate-spin" /></div> : !visible.length ? <section className="v2-panel p-8"><h2>No transactions here yet</h2><p className="text-muted-foreground mt-2">Your purchases, sales, and rental requests will appear here.</p><Button asChild variant="cta" className="mt-5"><Link to="/browse">Browse now</Link></Button></section> : visible.map(r => <article className="v2-panel p-5 sm:p-6" key={r.id}>
      <div className="flex gap-4"><div className="h-16 w-20 shrink-0 rounded-xl overflow-hidden bg-muted">{r.image ? <img src={r.image} alt="" className="h-full w-full object-cover" /> : <Receipt className="m-5 h-6 w-6" />}</div><div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">{r.kind} · {r.counterpart} · {new Date(r.date).toLocaleDateString()}</p><h2 className="font-semibold mt-1"><Link to={r.href}>{r.title}</Link></h2><p className="text-sm text-muted-foreground mt-1">Payment: {readable(r.payment)}<br />Fulfillment: {r.fulfillment}</p>{r.reference && <p className="text-xs text-muted-foreground mt-2">{r.reference}</p>}</div><strong className="text-sm sm:text-base">{new Intl.NumberFormat('en-US', { style: 'currency', currency: r.currency }).format(r.amount)}</strong></div>
      <div className="flex flex-wrap gap-2 mt-5">
        <Button asChild variant="cta" size="sm"><Link to={r.href}>{r.payment.includes('Pay now') ? 'Pay now' : 'View transaction'}<ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button>
        {r.orderId && <>
          <Button asChild variant="outline" size="sm"><Link to={`/dashboard/transactions/${r.orderId}?tab=documents`}>Documents</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link to={`/dashboard/transactions/${r.orderId}#report-issue`}>Report an issue</Link></Button>
          {r.reference && <Button asChild variant="ghost" size="sm"><Link to={`/receipt/${encodeURIComponent(r.reference)}`}>Receipt / payment status</Link></Button>}
        </>}
      </div>
    </article>)}
  </div></WorkspaceShell>;
}
