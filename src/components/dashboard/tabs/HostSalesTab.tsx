import { useAuth } from '@/contexts/AuthContext';
import { useSellerSaleTransactions } from '@/hooks/useSaleTransactions';
import PhotoListingCard from '../shared/PhotoListingCard';
import EmptyState from '../shared/EmptyState';
import { Loader2, DollarSign } from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; tone: 'success' | 'warning' | 'muted' | 'info' }> = {
  pending: { label: 'Pending', tone: 'warning' },
  pending_cash: { label: 'Cash pending', tone: 'warning' },
  paid: { label: 'Paid — action needed', tone: 'info' },
  buyer_confirmed: { label: 'Buyer confirmed', tone: 'info' },
  seller_confirmed: { label: 'You confirmed', tone: 'success' },
  completed: { label: 'Completed', tone: 'success' },
  disputed: { label: 'Disputed', tone: 'warning' },
  refunded: { label: 'Refunded', tone: 'muted' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
};

const HostSalesTab = () => {
  const { user } = useAuth();
  const { transactions, isLoading } = useSellerSaleTransactions(user?.id);

  return (
    <div className="max-w-[1080px] mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Sales & Transactions</h1>
        <p className="text-sm text-muted-foreground mt-1">Every sale, its status, and payout timing at a glance.</p>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No sales yet"
          description="Once a buyer completes a purchase, the transaction lands here with buyer info, payout timing, and dispute controls."
          ctaLabel="Manage listings"
          ctaHref="/host/listings"
        />
      ) : (
        <ul className="space-y-3">
          {transactions.map((tx) => {
            const status = STATUS_MAP[tx.status] ?? { label: tx.status, tone: 'muted' as const };
            const amount = typeof tx.amount === 'number' ? `$${(tx.amount / 100).toLocaleString()}` : '';
            return (
              <li key={tx.id}>
                <PhotoListingCard
                  href={`/transactions/${tx.id}`}
                  title={tx.listing?.title ?? 'Listing'}
                  imageUrl={tx.listing?.cover_image_url}
                  subtitle={tx.buyer?.full_name ? `Buyer · ${tx.buyer.full_name}` : tx.listing?.category ?? undefined}
                  meta={`Order ${tx.id.slice(0, 8).toUpperCase()} · ${new Date(tx.created_at).toLocaleDateString()} · ${amount}`}
                  status={status}
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
