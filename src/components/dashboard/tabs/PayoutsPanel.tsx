import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Wallet, Clock, ShieldCheck } from 'lucide-react';
import { useManualPayout, MANUAL_PAYOUT_SETTINGS_PATH } from '@/hooks/useManualPayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import EmptyState from '../shared/EmptyState';

/** Human labels for the internal payable states admins work through. */
const PAYABLE_STATUS_LABEL: Record<string, string> = {
  awaiting_payment_confirmation: 'Awaiting payment confirmation',
  pending_release: 'Pending release',
  eligible_for_review: 'In review',
  payout_on_hold: 'On hold',
  payout_approved: 'Approved',
  payout_processing: 'Processing',
  payout_completed: 'Paid',
  payout_failed: 'Failed — support notified',
  partially_refunded: 'Partially refunded',
  fully_refunded: 'Refunded',
  disputed: 'Disputed',
  reversed: 'Reversed',
  cancelled: 'Cancelled',
};

const money = (cents: number | null | undefined) =>
  `$${(((cents ?? 0) as number) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const PayoutsPanel = () => {
  const { user } = useAuth();
  const { payoutEmail, hasPayoutInstructions, isLoading } = useManualPayout();

  const { data: payables = [], isLoading: payablesLoading } = useQuery({
    queryKey: ['seller-payables', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('seller_payables')
        .select('id, status, seller_amount_cents, gross_amount_cents, created_at')
        .eq('seller_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  return (
    <div className="max-w-[840px] mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Earnings &amp; payouts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Payments are collected securely through PayPal. Seller earnings are reviewed and paid
          manually by Vendibook according to the transaction timeline.
        </p>
      </header>

      <div className="rounded-md border border-border bg-card p-6">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your payout details…
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {hasPayoutInstructions ? 'Manual payout details on file' : 'Add your payout details'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {hasPayoutInstructions
                  ? `We'll send your reviewed earnings to ${payoutEmail}. Update it any time — this is payout instruction info for Vendibook operations, not a connected payment account.`
                  : 'Tell us where to send your earnings. You can list, take bookings and get paid by buyers before adding this.'}
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link to={MANUAL_PAYOUT_SETTINGS_PATH}>
                  {hasPayoutInstructions ? 'Update payout details' : 'Add payout details'}
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-md border border-border bg-card">
        <header className="px-6 py-4 border-b border-border flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-foreground">Your earnings</h2>
        </header>
        {payablesLoading ? (
          <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading earnings…
          </div>
        ) : payables.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Clock}
              title="No earnings yet"
              description="Once a buyer pays, your proceeds appear here while our team reviews the payout."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {payables.map((p: any) => (
              <li key={p.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {money(p.seller_amount_cents ?? p.gross_amount_cents)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {PAYABLE_STATUS_LABEL[p.status] ?? p.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PayoutsPanel;
