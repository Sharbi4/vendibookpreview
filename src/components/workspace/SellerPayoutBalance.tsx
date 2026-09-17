import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePayoutPreference } from '@/hooks/usePayoutPreference';
import { useMyPayPalConnection } from '@/hooks/useMyPayPalConnection';
import { PAYOUT_METHOD_LABEL } from '@/lib/payouts/methods';

/**
 * Seller payout balance + manual payout request.
 *
 * Reads the seller's real recorded payables. Vendibook pays sellers through a
 * manual review process, so a request here records the seller's ask for the
 * admin queue — it never approves, releases, or sends money, and it never
 * changes the payable's status.
 */

const REQUESTABLE = new Set(['pending_release', 'eligible_for_review']);

const IN_REVIEW = new Set(['payout_approved', 'payout_processing']);

const BLOCKED_LABEL: Record<string, string> = {
  payout_on_hold: 'On hold',
  disputed: 'Disputed',
  reversed: 'Reversed',
  payout_failed: 'Failed — support notified',
  partially_refunded: 'Partially refunded',
  fully_refunded: 'Refunded',
  cancelled: 'Cancelled',
};

const STATUS_LABEL: Record<string, string> = {
  awaiting_payment_confirmation: 'Awaiting payment confirmation',
  pending_release: 'Pending release',
  eligible_for_review: 'Ready to request',
  payout_approved: 'Approved',
  payout_processing: 'Processing',
  payout_completed: 'Paid',
  ...BLOCKED_LABEL,
};

interface Payable {
  id: string;
  status: string;
  transaction_type: string | null;
  net_payout_cents: number | null;
  payout_eligible_at: string | null;
  release_due_at: string | null;
  payout_completed_at: string | null;
  created_at: string;
}

const money = (cents: number | null | undefined) =>
  `$${(((cents ?? 0) as number) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const shortDate = (raw?: string | null) => {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function SellerPayoutBalance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { preference } = usePayoutPreference();
  const { isReady: paypalReady } = useMyPayPalConnection();

  const { data: payables = [], isLoading } = useQuery({
    queryKey: ['seller-payout-balance', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('seller_payables')
        .select(
          'id, status, transaction_type, net_payout_cents, payout_eligible_at, release_due_at, payout_completed_at, created_at',
        )
        .eq('seller_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Payable[];
    },
  });

  const { data: requestedIds = new Set<string>() } = useQuery({
    queryKey: ['seller-payout-requests', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('payout_actions')
        .select('payable_id')
        .eq('subject_user_id', user!.id)
        .eq('action', 'seller_requested_payout');
      if (error) throw error;
      return new Set<string>((data ?? []).map((r: { payable_id: string }) => r.payable_id));
    },
  });

  const totals = useMemo(() => {
    let available = 0;
    let inReview = 0;
    let upcoming = 0;
    let paid = 0;
    for (const p of payables) {
      const net = p.net_payout_cents ?? 0;
      if (p.status === 'payout_completed') paid += net;
      else if (IN_REVIEW.has(p.status)) inReview += net;
      else if (p.status === 'eligible_for_review') available += net;
      else if (p.status === 'pending_release' || p.status === 'awaiting_payment_confirmation')
        upcoming += net;
    }
    return { available, inReview, upcoming, paid };
  }, [payables]);

  const requestPayout = useMutation({
    mutationFn: async (payableId: string) => {
      const { error } = await (supabase as any).from('payout_actions').insert({
        payable_id: payableId,
        action: 'seller_requested_payout',
        actor_id: user!.id,
        subject_user_id: user!.id,
        note: 'Seller requested this payout from their dashboard.',
        metadata: { source: 'dashboard_payments' },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Payout requested. Our team reviews and sends it manually.');
      queryClient.invalidateQueries({ queryKey: ['seller-payout-requests', user?.id] });
    },
    onError: () => {
      toast.error("We couldn't send that request. Please try again.");
    },
  });

  const canRequest = Boolean(preference) || paypalReady;

  const open = payables.filter((p) => p.status !== 'payout_completed');

  return (
    <div>
      <div className="v2-panel-head">
        <div>
          <h2>Your payouts</h2>
          <p>
            Proceeds from paid orders and bookings. Vendibook reviews and sends every payout
            manually, so amounts and dates are shown as expected, not guaranteed.
          </p>
        </div>
      </div>

      <div className="v2-payout-tiles">
        <article>
          <small>Ready to request</small>
          <strong>{money(totals.available)}</strong>
        </article>
        <article>
          <small>Requested / in review</small>
          <strong>{money(totals.inReview)}</strong>
        </article>
        <article>
          <small>Upcoming</small>
          <strong>{money(totals.upcoming)}</strong>
        </article>
        <article>
          <small>Paid to date</small>
          <strong>{money(totals.paid)}</strong>
        </article>
      </div>

      <div className="v2-payout-note">
        {preference ? (
          <p>
            Payouts go to your {PAYOUT_METHOD_LABEL[preference.method]} destination
            {preference.masked_destination ? ` (${preference.masked_destination})` : ''}.{' '}
            <Link to="/dashboard/account#section-payments">Update payout details</Link>
          </p>
        ) : (
          <p>
            Add where you want to be paid before requesting a payout.{' '}
            <Link to="/dashboard/account#section-payments">Add payout details</Link>
          </p>
        )}
        {!paypalReady ? (
          <p>
            Connect your PayPal Business account to accept online payments.{' '}
            <Link to="/dashboard/payments/setup">Open payment setup</Link>
          </p>
        ) : null}
      </div>

      {isLoading ? (
        <div className="v2-payout-empty">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your payouts…
        </div>
      ) : open.length === 0 ? (
        <div className="v2-payout-empty">
          Once a buyer pays, your proceeds appear here while we review the payout.
        </div>
      ) : (
        <ul className="v2-payout-list">
          {open.map((p) => {
            const requested = requestedIds.has(p.id);
            const requestable = REQUESTABLE.has(p.status) && (p.net_payout_cents ?? 0) > 0;
            const expected = BLOCKED_LABEL[p.status]
              ? null
              : shortDate(p.payout_eligible_at || p.release_due_at);
            return (
              <li key={p.id}>
                <span>
                  <strong>{money(p.net_payout_cents)}</strong>
                  <small>
                    {(p.transaction_type ?? 'transaction').replace(/_/g, ' ')} ·{' '}
                    {STATUS_LABEL[p.status] ?? p.status}
                    {expected ? ` · expected ${expected}` : ''}
                  </small>
                </span>
                {requested ? (
                  <span className="v2-status">Payout requested</span>
                ) : requestable ? (
                  <button
                    type="button"
                    className="v2-btn v2-btn-sm"
                    disabled={!canRequest || requestPayout.isPending}
                    onClick={() => requestPayout.mutate(p.id)}
                  >
                    {requestPayout.isPending ? 'Requesting…' : 'Request payout'}
                  </button>
                ) : (
                  <span className="v2-status">{STATUS_LABEL[p.status] ?? p.status}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
