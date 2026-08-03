import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Wallet, Clock, ShieldCheck } from 'lucide-react';
import { usePayoutPreference } from '@/hooks/usePayoutPreference';
import { PAYOUT_METHOD_LABEL, PAYOUT_STATUS_LABEL } from '@/lib/payouts/methods';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import EmptyState from '../shared/EmptyState';

/** Where sellers manage their manual payout preference. */
const PAYOUT_SETTINGS_PATH = '/account#section-payments';

/** Truthful labels for the internal payable states admins work through. */
const PAYABLE_STATUS_LABEL: Record<string, string> = {
  awaiting_payment_confirmation: 'Awaiting confirmation',
  pending_release: 'Pending release',
  eligible_for_review: 'Eligible for review',
  payout_on_hold: 'Held',
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

/** States where no release date should be presented as a promise. */
const NO_TIMING_PROMISE = new Set([
  'payout_on_hold',
  'disputed',
  'reversed',
  'payout_failed',
  'partially_refunded',
  'fully_refunded',
  'cancelled',
]);

const money = (cents: number | null | undefined) =>
  `$${(((cents ?? 0) as number) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const PayoutsPanel = () => {
  const { user } = useAuth();
  const { preference, isLoading } = usePayoutPreference();

  const { data: payables = [], isLoading: payablesLoading } = useQuery({
    queryKey: ['seller-payables', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('seller_payables')
        .select(
          'id, status, transaction_type, gross_collected_cents, platform_fee_cents, adjustments_cents, refunded_cents, net_payout_cents, release_due_at, payout_eligible_at, hold_reason, created_at',
        )
        .eq('seller_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(25);
      return data ?? [];
    },
  });

  return (
    <div className="max-w-[840px] mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Earnings &amp; payouts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Buyer payments are processed securely through PayPal. Vendibook records your proceeds and
          our team reviews and sends every payout manually according to the transaction timeline.
        </p>
      </header>

      <div className="rounded-md border border-border bg-card p-6">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your payout preference…
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {preference
                  ? `${PAYOUT_METHOD_LABEL[preference.method]} · ${preference.masked_destination ?? ''}`
                  : 'Add your payout preference'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {preference
                  ? `Status: ${PAYOUT_STATUS_LABEL[preference.status]}. This is a payout preference for Vendibook operations — not a connected merchant account. Admins review and send each payout manually.`
                  : 'Choose PayPal, Venmo, Cash App or bank transfer (ACH). You can list, take bookings and get paid by buyers before adding this — it never affects publishing.'}
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link to={PAYOUT_SETTINGS_PATH}>
                  {preference ? 'Update payout preference' : 'Add payout preference'}
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
            {payables.map((p: any) => {
              const releaseAt = p.payout_eligible_at ?? p.release_due_at;
              const showTiming = releaseAt && !NO_TIMING_PROMISE.has(p.status);
              return (
                <li key={p.id} className="px-6 py-4 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {money(p.net_payout_cents)} <span className="text-xs font-normal text-muted-foreground">net payout</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(p.transaction_type ?? 'transaction').replace(/_/g, ' ')} ·{' '}
                        {new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-foreground/80 shrink-0">
                      {PAYABLE_STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </div>

                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[11px]">
                    <div>
                      <dt className="text-muted-foreground">Gross collected</dt>
                      <dd className="text-foreground/85">{money(p.gross_collected_cents)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Vendibook fee</dt>
                      <dd className="text-foreground/85">−{money(p.platform_fee_cents)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Adjustments</dt>
                      <dd className="text-foreground/85">{money(p.adjustments_cents)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Refunded</dt>
                      <dd className="text-foreground/85">−{money(p.refunded_cents)}</dd>
                    </div>
                  </dl>

                  <p className="text-[11px] text-muted-foreground">
                    {showTiming
                      ? `Eligible for review on ${new Date(releaseAt).toLocaleDateString()}. A Vendibook admin approves and sends the payout after review.`
                      : p.hold_reason
                        ? `On hold: ${p.hold_reason}. Payout timing changes while this is resolved.`
                        : 'Timing may change if a hold, refund, dispute, verification issue or operational review applies.'}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PayoutsPanel;
