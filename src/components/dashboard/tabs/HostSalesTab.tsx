import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSellerSaleTransactions } from '@/hooks/useSaleTransactions';
import PhotoListingCard from '../shared/PhotoListingCard';
import EmptyState from '../shared/EmptyState';
import StatusChipPopover from '../shared/StatusChipPopover';
import { Loader2, DollarSign } from 'lucide-react';
import { getCounterpartyName } from '@/lib/displayName';

type FilterId = 'all' | 'action' | 'completed' | 'cancelled';

const STATUS_MAP: Record<string, { label: string; tone: 'success' | 'warning' | 'muted' | 'info'; body: string; next?: string }> = {
  pending: { label: 'Pending', tone: 'warning', body: 'Buyer started checkout but hasn\'t paid yet.', next: "We'll notify you the moment payment clears." },
  pending_cash: { label: 'Cash pending', tone: 'warning', body: 'Buyer chose Pay in Person — this is your signal to arrange the handoff.', next: 'Mark the order paid on your end once you receive the cash.' },
  paid: { label: 'Paid — action needed', tone: 'info', body: 'The buyer paid and funds are in payment protection.', next: 'Coordinate delivery and mark the order shipped/handed off. Payout runs after buyer confirmation.' },
  buyer_confirmed: { label: 'Buyer confirmed', tone: 'info', body: 'Buyer confirmed receipt.', next: 'Your payout is queued on Vendibook\'s standard schedule.' },
  seller_confirmed: { label: 'You confirmed', tone: 'success', body: 'You marked this order delivered. Waiting on the buyer to confirm.', next: 'Once buyer confirms, payout is queued.' },
  completed: { label: 'Completed', tone: 'success', body: 'Order fully closed.' },
  disputed: { label: 'Disputed', tone: 'warning', body: 'The buyer opened a dispute.', next: 'Respond from the order page — our team mediates.' },
  refunded: { label: 'Refunded', tone: 'muted', body: 'Funds were returned to the buyer.' },
  cancelled: { label: 'Cancelled', tone: 'muted', body: 'This order was cancelled.' },
};

const FILTERS: { id: FilterId; label: string; match: (s: string) => boolean }[] = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'action', label: 'Action needed', match: (s) => ['paid', 'pending_cash', 'disputed', 'seller_confirmed'].includes(s) },
  { id: 'completed', label: 'Completed', match: (s) => s === 'completed' || s === 'buyer_confirmed' },
  { id: 'cancelled', label: 'Cancelled', match: (s) => ['cancelled', 'refunded'].includes(s) },
];

const HostSalesTab = () => {
  const { user } = useAuth();
  const { transactions, isLoading } = useSellerSaleTransactions(user?.id);
  const [filter, setFilter] = useState<FilterId>('all');

  const filtered = useMemo(() => {
    const fn = FILTERS.find((f) => f.id === filter)?.match ?? (() => true);
    return transactions.filter((tx) => fn(tx.status));
  }, [transactions, filter]);

  return (
    <div className="max-w-[1080px] mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Sales & Transactions</h1>
        <p className="text-sm text-muted-foreground mt-1">Every sale, its status, and payout timing at a glance.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={
              'text-xs font-medium px-3 py-1.5 rounded-full border transition ' +
              (filter === f.id
                ? 'bg-foreground text-background border-foreground'
                : 'bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground/40')
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title={filter === 'all' ? 'No sales yet' : 'Nothing here'}
          description="Once a buyer completes a purchase, the transaction lands here with buyer info, payout timing, and dispute controls."
          ctaLabel="Manage listings"
          ctaHref="/host/listings"
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((tx) => {
            const s = STATUS_MAP[tx.status] ?? { label: tx.status, tone: 'muted' as const, body: 'Status unknown.' };
            const amount = typeof tx.amount === 'number' ? `$${(tx.amount / 100).toLocaleString()}` : '';
            return (
              <li key={tx.id}>
                <PhotoListingCard
                  href={`/transactions/${tx.id}`}
                  title={tx.listing?.title ?? 'Listing'}
                  imageUrl={tx.listing?.cover_image_url}
                  subtitle={tx.buyer ? `Buyer · ${getCounterpartyName(tx.buyer, 'Buyer')}` : tx.listing?.category ?? undefined}
                  meta={`Order ${tx.id.slice(0, 8).toUpperCase()} · ${new Date(tx.created_at).toLocaleDateString()} · ${amount}`}
                  statusNode={
                    <StatusChipPopover label={s.label} tone={s.tone} title={s.label} body={s.body} nextStep={s.next} />
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default HostSalesTab;
