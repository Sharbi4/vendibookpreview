import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBuyerSaleTransactions } from '@/hooks/useSaleTransactions';
import PhotoListingCard from '../shared/PhotoListingCard';
import EmptyState from '../shared/EmptyState';
import StatusChipPopover from '../shared/StatusChipPopover';
import { Loader2, ShoppingBag } from 'lucide-react';

type FilterId = 'all' | 'in_progress' | 'completed' | 'cancelled';

const STATUS_MAP: Record<string, { label: string; tone: 'success' | 'warning' | 'muted' | 'info'; body: string; next?: string }> = {
  pending: { label: 'Awaiting payment', tone: 'warning', body: 'Your checkout is not yet complete.', next: 'Finish payment to reserve the item.' },
  pending_cash: { label: 'Cash pending', tone: 'warning', body: 'Cash / Pay-in-Person hold — the seller has been notified.', next: "Meet the seller to hand over payment. We'll mark it paid on confirmation." },
  paid: { label: 'Paid — awaiting delivery', tone: 'info', body: 'Payment is safe with payment protection.', next: 'Confirm delivery once you receive the item — funds release to the seller after that.' },
  buyer_confirmed: { label: 'You confirmed', tone: 'success', body: 'Thanks — you confirmed delivery.', next: 'Payout to the seller runs on Vendibook\'s schedule.' },
  seller_confirmed: { label: 'Seller confirmed', tone: 'info', body: 'The seller has marked the item delivered.', next: 'Tap the order to confirm you received it.' },
  completed: { label: 'Completed', tone: 'success', body: 'This order is fully closed.', next: 'You can still open a dispute or request a refund from the order page.' },
  disputed: { label: 'Disputed', tone: 'warning', body: 'A dispute is open on this order.', next: 'Our team is mediating — check the order for next steps.' },
  refunded: { label: 'Refunded', tone: 'muted', body: 'Funds have been returned.', next: 'The refund lands on your original payment method within 5–10 business days.' },
  cancelled: { label: 'Cancelled', tone: 'muted', body: 'This order was cancelled.' },
};

const FILTERS: { id: FilterId; label: string; match: (s: string) => boolean }[] = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'in_progress', label: 'In progress', match: (s) => ['pending', 'pending_cash', 'paid', 'buyer_confirmed', 'seller_confirmed', 'disputed'].includes(s) },
  { id: 'completed', label: 'Completed', match: (s) => s === 'completed' },
  { id: 'cancelled', label: 'Cancelled', match: (s) => ['cancelled', 'refunded'].includes(s) },
];

const BuyerOrdersTab = () => {
  const { user } = useAuth();
  const { transactions, isLoading } = useBuyerSaleTransactions(user?.id);
  const [filter, setFilter] = useState<FilterId>('all');

  const filtered = useMemo(() => {
    const fn = FILTERS.find((f) => f.id === filter)?.match ?? (() => true);
    return transactions.filter((tx) => fn(tx.status));
  }, [transactions, filter]);

  return (
    <div className="max-w-[1080px] mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Orders & Transactions</h1>
        <p className="text-sm text-muted-foreground mt-1">Every purchase you've made, with tracking and confirmations.</p>
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
          icon={ShoppingBag}
          title={filter === 'all' ? 'No orders yet' : 'Nothing here'}
          description="When you buy a truck or trailer, it'll show up here with tracking, receipts, and buyer-protection status."
          ctaLabel="Browse listings"
          ctaHref="/search?mode=sale"
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
                  subtitle={tx.listing?.category ?? undefined}
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

export default BuyerOrdersTab;
