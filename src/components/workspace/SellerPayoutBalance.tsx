import { useSellerPayables, type SellerPayable } from '@/hooks/useSellerPayables';
import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePayoutPreference } from '@/hooks/usePayoutPreference';
import { useMyPayPalConnection } from '@/hooks/useMyPayPalConnection';
import { summarizePayables } from '@/lib/payouts/payableTotals';
import {
  EmptyState,
  Panel,
  SimpleTable,
  StatGrid,
  StatTile,
  StatusPill,
  formatDay,
  metric,
  ws,
  type SimpleColumn,
} from '@/components/workspace/ui';
import { money, payablePill, rowBtn } from '@/components/workspace/money/moneyUi';
import { usePayableNotes } from '@/components/workspace/money/usePayableNotes';

/**
 * Seller payout balance + manual payout request.
 *
 * Reads the seller's real recorded payables. Vendibook pays sellers through a
 * manual review process, so a request here records the seller's ask for the
 * admin queue — it never approves, releases, or sends money, and it never
 * changes the payable's status.
 */

const REQUESTABLE = new Set(['pending_release', 'eligible_for_review']);

/** States with no reliable timing: no expected date is shown for them. */
const NO_DATE = new Set(['payout_on_hold', 'disputed', 'reversed', 'payout_failed', 'partially_refunded', 'fully_refunded', 'cancelled']);

/** Paid payouts listed under the open ones, newest first. */
const RECENT_PAID = 5;

const typeLabel = (t: string | null) => {
  const s = (t ?? 'transaction').replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export default function SellerPayoutBalance({ aside }: { /** Rendered under the payouts table (payout method). */ aside?: ReactNode } = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { preference, isLoading: preferenceLoading } = usePayoutPreference();
  const { isReady: paypalReady } = useMyPayPalConnection();
  const notes = usePayableNotes();

  const { data: payables = [], isLoading, isError, refetch } = useSellerPayables();

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

  const totals = useMemo(() => summarizePayables(payables), [payables]);

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

  const rows = useMemo(() => {
    const open = payables.filter((p) => p.status !== 'payout_completed');
    const paid = payables
      .filter((p) => p.status === 'payout_completed')
      .sort((a, b) => Date.parse(b.payout_completed_at ?? b.created_at) - Date.parse(a.payout_completed_at ?? a.created_at))
      .slice(0, RECENT_PAID);
    return [...open, ...paid];
  }, [payables]);
  const paidCount = payables.filter((p) => p.status === 'payout_completed').length;

  if (isError) {
    return (
      <div role="alert" className={ws.surface + ' flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-6'}>
        <p className="text-[14px] text-[#1C1B1A]">Payout records could not be loaded. Nothing has changed on them.</p>
        <button type="button" className={ws.secondary} onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  const state = { loading: isLoading, error: false };
  const hasPayables = isLoading || payables.length > 0;

  const actionFor = (p: SellerPayable) => {
    if (requestedIds.has(p.id)) return <StatusPill tone="muted" dot={false}>Requested</StatusPill>;
    const requestable = REQUESTABLE.has(p.status) && (p.net_payout_cents ?? 0) > 0;
    if (!requestable) return null;
    return (
      <button
        type="button"
        className={rowBtn.ink}
        disabled={!canRequest || requestPayout.isPending}
        title={!canRequest ? 'Add payout details first' : undefined}
        onClick={() => requestPayout.mutate(p.id)}
      >
        {requestPayout.isPending && requestPayout.variables === p.id ? 'Requesting…' : 'Request payout'}
      </button>
    );
  };

  const columns: SimpleColumn<SellerPayable>[] = [
    {
      key: 'payout',
      header: 'Payout',
      cell: (p) => {
        const label = typeLabel(p.transaction_type);
        return (
          <span className="block min-w-0">
            {p.payment_record_id ? (
              <Link to={`/dashboard/transactions/${p.payment_record_id}`} className="block truncate font-semibold hover:underline">{label}</Link>
            ) : (
              <span className="block truncate font-semibold">{label}</span>
            )}
            <span className="block truncate text-[12.5px] text-[#8A847B]">Recorded {formatDay(p.created_at) ?? '—'}</span>
            <span className="mt-1.5 block sm:hidden"><StatusPill tone={payablePill(p.status).tone}>{payablePill(p.status).label}</StatusPill></span>
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      hideBelow: 'sm',
      cell: (p) => {
        const note = notes.data?.get(p.id);
        const autoPaid = note?.payout_provider === 'paypal' && p.status === 'payout_completed';
        const pill = payablePill(p.status);
        return (
          <span className="flex flex-col items-start gap-1">
            <StatusPill tone={pill.tone}>{autoPaid ? 'Paid to your PayPal' : pill.label}</StatusPill>
            {note?.hold_reason && p.status !== 'payout_completed' && (
              <span className="max-w-[16rem] text-[12px] leading-4 text-[#8A847B]">{note.hold_reason}</span>
            )}
          </span>
        );
      },
    },
    {
      key: 'date',
      header: 'Expected',
      hideBelow: 'sm',
      className: 'whitespace-nowrap text-[#5E5953]',
      cell: (p) => {
        if (p.status === 'payout_completed') return <>Paid {formatDay(p.payout_completed_at) ?? ''}</>;
        if (NO_DATE.has(p.status)) return <span className="text-[#B5AEA4]">No date yet</span>;
        return formatDay(p.payout_eligible_at || p.release_due_at) ?? <span className="text-[#B5AEA4]">—</span>;
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      className: 'font-semibold',
      cell: (p) => {
        const action = actionFor(p);
        return (
          <>
            {money(p.net_payout_cents)}
            {action && <span className="mt-2 flex justify-end sm:hidden">{action}</span>}
          </>
        );
      },
    },
    {
      key: 'action',
      header: 'Action',
      srOnlyHeader: true,
      align: 'right',
      hideBelow: 'sm',
      className: 'w-[1%] whitespace-nowrap',
      cell: (p) => actionFor(p),
    },
  ];

  const table = (
    <Panel
      title="Payouts"
      description="Every payout is reviewed and sent manually, so dates are expected, not guaranteed."
      flush
      footer={
        !preferenceLoading && !canRequest && totals.available > 0 ? (
          <p className="text-[13px] text-[#5E5953]">
            Add where you want to be paid before requesting a payout.{' '}
            <Link to="/dashboard/account/payouts" className={ws.link}>Add payout details</Link>
          </p>
        ) : paidCount > RECENT_PAID ? (
          <p className="text-[13px] text-[#8A847B]">Showing your {RECENT_PAID} most recent paid payouts of {paidCount}.</p>
        ) : undefined
      }
    >
      <SimpleTable
        caption="Your payouts"
        columns={columns}
        rows={rows}
        rowKey={(p) => p.id}
        loading={isLoading}
        empty={
          <EmptyState
            compact
            className="px-5 py-5 sm:px-6"
            title="No payouts yet."
            body="When a buyer or renter pays for one of your listings, your proceeds show up here with their expected payout date."
            action={{ label: 'Create a listing', to: '/dashboard/listings/new' }}
            secondary={{ label: 'Your transactions', to: '/dashboard/transactions' }}
          />
        }
      />
    </Panel>
  );

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {hasPayables && (
        <StatGrid label="Payout balance">
          <StatTile
            label="Ready to request"
            format="cents"
            value={metric(totals.available, state)}
            attention={totals.available > 0}
            sub={totals.available > 0 ? 'Request it below' : 'Nothing waiting'}
          />
          <StatTile label="In review" format="cents" value={metric(totals.inReview, state)} sub="Approved or processing" />
          <StatTile
            label="Upcoming"
            format="cents"
            value={metric(totals.upcoming, state)}
            sub={totals.nextExpectedAt ? `Next expected ${formatDay(totals.nextExpectedAt)}` : 'From paid orders and bookings'}
          />
          <StatTile
            label="Paid out to date"
            format="cents"
            value={metric(totals.paid, state)}
            sub={totals.lastPaidAt ? `Last payout ${formatDay(totals.lastPaidAt)}` : 'No payouts yet'}
          />
        </StatGrid>
      )}
      {table}
      {aside}
    </div>
  );
}
