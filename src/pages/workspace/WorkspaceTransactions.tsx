import { Link, useSearchParams } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { useAuth } from '@/contexts/AuthContext';
import { useUserTransactions } from '@/hooks/useUserTransactions';
import { useShopperBookings } from '@/hooks/useShopperBookings';
import { useHostBookings } from '@/hooks/useHostBookings';
import { useBuyerSaleTransactions, useSellerSaleTransactions } from '@/hooks/useSaleTransactions';
import { EmptyState, PageHeader, Panel, StatusPill, formatDay, ws } from '@/components/workspace/ui';
import { FilterPills } from '@/components/workspace/money/FilterPills';
import { paymentTone, rowBtn } from '@/components/workspace/money/moneyUi';

type Row = { id: string; kind: string; title: string; image?: string | null; date: string; amount: number; currency: string; payment: string; fulfillment: string; counterpart: string; href: string; reference?: string | null; orderId?: string; payNow?: boolean };
const readable = (s: string) => s.replace(/_/g, ' ');
const quietLink = rowBtn.quiet + ' !px-0';
const FILTERS = ['All', 'Purchases', 'Sales', 'Rentals', 'Other'] as const;
type Filter = (typeof FILTERS)[number];

/** Group a standalone payment record: rentals, equipment purchases/sales, or Other (upgrades, memberships). */
const RENTAL_TYPES = new Set(['rental', 'booking']);
const SALE_TYPES = new Set(['sale', 'deposit', 'sale_deposit', 'sale_balance']);
function paymentKind(p: { booking_request_id?: string | null; sale_transaction_id?: string | null; transaction_type?: string | null; role: 'buyer' | 'seller' }): Filter {
  const type = p.transaction_type ?? '';
  if (p.booking_request_id || RENTAL_TYPES.has(type)) return 'Rentals';
  if (p.sale_transaction_id || SALE_TYPES.has(type)) return p.role === 'buyer' ? 'Purchases' : 'Sales';
  return 'Other';
}

export default function WorkspaceTransactions() {
  const { user } = useAuth();
  const { transactions, isLoading, isError, refresh } = useUserTransactions(user?.id);
  const buyer = useBuyerSaleTransactions(user?.id);
  const seller = useSellerSaleTransactions(user?.id);
  const rentals = useShopperBookings();
  const hosted = useHostBookings();
  const [params, setParams] = useSearchParams();
  const requestedFilter = params.get('filter') || 'All';
  const filter: Filter = (FILTERS as readonly string[]).includes(requestedFilter) ? (requestedFilter as Filter) : 'All';
  const setFilter = (value: string) => setParams(previous => {
    const next = new URLSearchParams(previous);
    if (value === 'All') next.delete('filter'); else next.set('filter', value);
    return next;
  });
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
      href: payNow ? `/dashboard/bookings/${b.id}?step=payment` : p ? `/dashboard/transactions/${p.id}` : `/dashboard/bookings/${b.id}`, orderId: p?.id, reference: p?.reference, payNow });
  }
  for (const p of transactions) {
    if (p.sale_transaction_id && sales.some(s => s.id === p.sale_transaction_id) || p.booking_request_id && bookings.some(b => b.id === p.booking_request_id)) continue;
    rows.push({ id: p.id, kind: paymentKind(p), title: p.listing?.title || 'Marketplace transaction', image: p.listing?.cover_image_url, date: p.created_at, amount: (p.gross_amount_cents ?? 0) / 100, currency: p.currency || 'USD', payment: p.payment_status || 'recorded', fulfillment: p.internal_status || 'View transaction', counterpart: p.role === 'buyer' ? 'Seller' : 'Buyer', href: `/dashboard/transactions/${p.id}`, orderId: p.id, reference: p.reference });
  }
  const visible = rows.filter(r => filter === 'All' || r.kind === filter).sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const loading = isLoading || buyer.isLoading || seller.isLoading || rentals.isLoading || hosted.isLoading;
  const count = (f: Filter) => (f === 'All' ? rows.length : rows.filter(r => r.kind === f).length);
  const dueCount = rows.filter(r => r.payNow).length;

  return <WorkspaceShell><div className={ws.page}><div className={ws.stack}>
    <PageHeader
      eyebrow="Money"
      title="Transactions"
      description="Every purchase, sale and rental in one place: payment status, handoff and paperwork."
      actions={<>
        <Link className={ws.secondary} to="/dashboard/cases">Support cases</Link>
        <Link className={ws.secondary} to="/dashboard/activity">Walkthroughs & activity</Link>
      </>}
    />

    <section aria-label="Transactions" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterPills
          label="Filter transactions"
          value={filter}
          onChange={setFilter}
          options={FILTERS.map(f => ({ id: f, label: f, count: loading ? undefined : count(f) }))}
        />
        {dueCount > 0 && <StatusPill tone="accent">{dueCount === 1 ? '1 rental to pay' : `${dueCount} rentals to pay`}</StatusPill>}
      </div>

      {isError ? (
        <Panel label="Payment records">
          <div role="alert" className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-[14px] text-[#1C1B1A]">Payment records could not be refreshed. Retry to see current payment status.</p>
            <button type="button" className={ws.secondary} onClick={() => void refresh()}>Retry payments</button>
          </div>
        </Panel>
      ) : loading ? (
        <Panel label="Loading transactions" flush>
          <ul role="status" aria-label="Loading transactions" className="divide-y divide-[#F1ECE5]">
            {[0, 1, 2].map(i => (
              <li key={i} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                <span className={ws.skeleton + ' h-12 w-16 shrink-0 rounded-lg'} />
                <span className="flex-1 space-y-2"><span className={ws.skeleton + ' block h-4 w-56 max-w-full'} /><span className={ws.skeleton + ' block h-3 w-40 max-w-full'} /></span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : !visible.length ? (
        <Panel label="No transactions" flush>
          <EmptyState
            title={filter === 'All' ? 'No transactions yet.' : `No ${filter.toLowerCase()} yet.`}
            body="Your purchases, sales and rental requests will appear here with their payment status and paperwork."
            action={{ label: 'Browse listings', to: '/browse' }}
            secondary={filter === 'All' ? undefined : { label: 'Show all transactions', to: '/dashboard/transactions' }}
          />
        </Panel>
      ) : (
        <Panel label="Transactions" flush>
          <ul className="divide-y divide-[#F1ECE5]">
            {visible.map(r => (
              <li key={r.id} className="px-5 py-4 sm:px-6 sm:py-5">
                <div className="flex gap-4">
                  <Link to={r.href} aria-hidden="true" tabIndex={-1} className="grid h-14 w-[72px] shrink-0 place-items-center overflow-hidden rounded-lg bg-[#F3EEE7]">
                    {r.image ? <img src={r.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Receipt className="h-5 w-5 text-[#8A847B]" />}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-[#1C1B1A]"><Link to={r.href} className="hover:underline">{r.title}</Link></h2>
                        <p className="mt-0.5 truncate text-[12.5px] text-[#8A847B]">{r.kind} · {r.counterpart} · {formatDay(r.date)}</p>
                      </div>
                      <strong className="shrink-0 text-[15px] font-semibold tabular-nums text-[#1C1B1A]">{new Intl.NumberFormat('en-US', { style: 'currency', currency: r.currency }).format(r.amount)}</strong>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <StatusPill tone={r.payNow ? 'accent' : paymentTone(r.payment)}>{r.payNow ? 'Approved, payment due' : `Payment: ${readable(r.payment)}`}</StatusPill>
                      {r.fulfillment !== 'View transaction' && <span className="text-[12.5px] text-[#5E5953] first-letter:uppercase">{r.fulfillment}</span>}
                    </div>
                    {r.reference && <p className="mt-1.5 font-mono text-[11.5px] text-[#8A847B]">{r.reference}</p>}
                    <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <Link to={r.href} className={r.payNow ? rowBtn.ink : rowBtn.outline}>{r.payNow ? 'Pay now' : 'View transaction'}</Link>
                      {r.orderId && <>
                        <Link to={`/dashboard/transactions/${r.orderId}?tab=documents`} className={quietLink}>Documents</Link>
                        {r.reference && <Link to={`/receipt/${encodeURIComponent(r.reference)}`} className={quietLink}>Receipt</Link>}
                        <Link to={`/dashboard/transactions/${r.orderId}#report-issue`} className={quietLink}>Report an issue</Link>
                      </>}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </section>
  </div></div></WorkspaceShell>;
}
