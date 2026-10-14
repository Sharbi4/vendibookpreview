import { useSellerPayables } from '@/hooks/useSellerPayables';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import SellerRefundDialog from '@/components/workspace/SellerRefundDialog';
import {
  EmptyState,
  Panel,
  SimpleTable,
  StatGrid,
  StatTile,
  StatusPill,
  formatDay,
  ws,
  type SimpleColumn,
  type StatusTone,
} from '@/components/workspace/ui';
import { LightScope } from '@/components/workspace/money/LightScope';
import { money } from '@/components/workspace/money/moneyUi';

/**
 * Per-order seller earnings.
 *
 * Reads the seller's own payment records (RLS scopes to seller_id) and pairs
 * each with its recorded payable so the seller can see, order by order, what
 * the buyer paid, what Vendibook kept, what was refunded, their net proceeds,
 * and the real PayPal payment state. Read-only — no money is moved here and
 * payouts stay on Vendibook's manual review process.
 */

interface EarningRow {
  id: string;
  reference: string | null;
  transaction_type: string | null;
  listing_id: string | null;
  gross_amount_cents: number | null;
  platform_fee_cents: number | null;
  refunded_cents: number | null;
  seller_proceeds_cents: number | null;
  tax_cents: number | null;
  payment_status: string | null;
  authorization_status: string | null;
  dispute_status: string | null;
  created_at: string;
  captured_at: string | null;
  listings?: { title: string | null } | null;
}

interface PayableRow {
  payment_record_id: string | null;
  status: string;
  net_payout_cents: number | null;
}

const PAYMENT_LABEL: Record<string, string> = {
  created: 'Awaiting payment',
  approved: 'Approved by buyer',
  pending: 'Pending with PayPal',
  authorized: 'Authorized',
  completed: 'Paid',
  partially_captured: 'Partly charged',
  deposit_paid_balance_due: 'Deposit paid',
  declined: 'Declined',
  failed: 'Failed',
  cancelled: 'Cancelled',
  partially_refunded: 'Partly refunded',
  refunded: 'Refunded',
  reversed: 'Reversed',
  authorization_voided: 'Authorization voided',
  authorization_expired: 'Authorization expired',
};

const PAYMENT_TONE: Record<string, StatusTone> = {
  completed: 'ok',
  authorized: 'ok',
  partially_captured: 'ok',
  deposit_paid_balance_due: 'ok',
  pending: 'warn',
  approved: 'warn',
  created: 'warn',
  declined: 'alert',
  failed: 'alert',
  cancelled: 'alert',
  reversed: 'alert',
  refunded: 'muted',
  partially_refunded: 'warn',
  authorization_voided: 'warn',
  authorization_expired: 'warn',
};

const PAYOUT_LABEL: Record<string, string> = {
  awaiting_payment_confirmation: 'Payout: awaiting payment',
  pending_release: 'Payout: upcoming',
  eligible_for_review: 'Payout: ready to request',
  payout_approved: 'Payout: approved',
  payout_processing: 'Payout: processing',
  payout_completed: 'Payout: sent',
  payout_on_hold: 'Payout: on hold',
  payout_failed: 'Payout: failed',
  disputed: 'Payout: disputed',
  reversed: 'Payout: reversed',
  partially_refunded: 'Payout: partly refunded',
  fully_refunded: 'Payout: refunded',
  cancelled: 'Payout: cancelled',
};

const typeLabel = (t: string | null) => {
  const s = (t ?? 'order').replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export default function SellerEarningsTable() {
  const { user } = useAuth();

  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['seller-order-earnings', user?.id],
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('payment_records')
        .select(
          'id, reference, transaction_type, listing_id, gross_amount_cents, platform_fee_cents, refunded_cents, seller_proceeds_cents, tax_cents, payment_status, authorization_status, dispute_status, created_at, captured_at, listings(title)',
        )
        .eq('seller_id', user!.id)
        // Abandoned checkout attempts never charged anyone — not earnings.
        .not('payment_status', 'in', '("created","cancelled")')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as EarningRow[];
    },
  });

  const { data: payables = [], isError: payablesError } = useSellerPayables();

  const payableByRecord = useMemo(() => {
    const map = new Map<string, PayableRow>();
    for (const p of payables) if (p.payment_record_id) map.set(p.payment_record_id, p);
    return map;
  }, [payables]);

  const totals = useMemo(() => {
    let gross = 0;
    let fees = 0;
    let refunded = 0;
    let net = 0;
    let feesKnown = false;
    for (const r of rows) {
      gross += r.gross_amount_cents ?? 0;
      if (typeof r.platform_fee_cents === 'number') feesKnown = true;
      fees += r.platform_fee_cents ?? 0;
      refunded += r.refunded_cents ?? 0;
      net += r.seller_proceeds_cents ?? 0;
    }
    // No row records a fee: show "—" rather than a fake $0.
    return { gross, fees: feesKnown || rows.length === 0 ? fees : null, refunded, net };
  }, [rows]);

  if (isError) {
    return (
      <div role="alert" className={ws.surface + ' flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-6'}>
        <p className="text-[14px] text-[#1C1B1A]">Order payments could not be loaded. Nothing has changed on them.</p>
        <button type="button" className={ws.secondary} onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  const columns: SimpleColumn<EarningRow>[] = [
    {
      key: 'order',
      header: 'Order',
      cell: (r) => (
        <span className="block min-w-0">
          <Link to={`/orders/${r.id}`} className="block max-w-[52vw] truncate font-semibold hover:underline sm:max-w-[17rem]">
            {r.listings?.title || `${typeLabel(r.transaction_type)} order`}
          </Link>
          <span className="block truncate text-[12.5px] text-[#8A847B]">
            {[typeLabel(r.transaction_type), formatDay(r.captured_at || r.created_at), r.reference].filter(Boolean).join(' · ')}
          </span>
          <span className="mt-1.5 block sm:hidden">
            <StatusPill tone={PAYMENT_TONE[r.payment_status ?? 'created'] ?? 'neutral'}>
              {PAYMENT_LABEL[r.payment_status ?? 'created'] ?? (r.payment_status ?? 'created').replace(/_/g, ' ')}
            </StatusPill>
          </span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      hideBelow: 'sm',
      cell: (r) => {
        const status = r.payment_status ?? 'created';
        const payable = payableByRecord.get(r.id);
        return (
          <span className="flex flex-col items-start gap-1">
            <StatusPill tone={PAYMENT_TONE[status] ?? 'neutral'}>{PAYMENT_LABEL[status] ?? status.replace(/_/g, ' ')}</StatusPill>
            {payablesError ? (
              <span className="text-[12px] text-[#8A847B]">Payout status unavailable</span>
            ) : payable ? (
              <span className="text-[12px] text-[#8A847B]">{PAYOUT_LABEL[payable.status] ?? payable.status.replace(/_/g, ' ')}</span>
            ) : null}
            {r.dispute_status ? <StatusPill tone="alert">Dispute: {r.dispute_status.replace(/_/g, ' ')}</StatusPill> : null}
          </span>
        );
      },
    },
    { key: 'gross', header: 'Buyer paid', align: 'right', hideBelow: 'md', className: 'text-[#5E5953]', cell: (r) => money(r.gross_amount_cents) },
    {
      key: 'fee',
      header: 'Vendibook fee',
      align: 'right',
      hideBelow: 'lg',
      className: 'text-[#5E5953]',
      cell: (r) => (
        <>
          {typeof r.platform_fee_cents === 'number' ? `−${money(r.platform_fee_cents)}` : money(null)}
          {(r.refunded_cents ?? 0) > 0 && <span className="block text-[12px] text-[#8A847B]">Refunded −{money(r.refunded_cents)}</span>}
        </>
      ),
    },
    {
      key: 'net',
      header: 'Your proceeds',
      align: 'right',
      className: 'font-semibold',
      cell: (r) => money(r.seller_proceeds_cents ?? payableByRecord.get(r.id)?.net_payout_cents ?? 0),
    },
    {
      key: 'refund',
      header: 'Refund',
      srOnlyHeader: true,
      align: 'right',
      className: 'w-[1%] whitespace-nowrap',
      cell: (r) =>
        ['completed', 'partially_refunded', 'partially_captured'].includes(r.payment_status ?? '') ? (
          <LightScope className="inline-block [&_button]:h-8 [&_button]:rounded-full [&_button]:border [&_button]:border-[#E2DBD0] [&_button]:bg-white [&_button]:px-3.5 [&_button]:text-[12.5px] [&_button]:font-semibold [&_button]:text-[#1C1B1A] hover:[&_button]:border-[#1C1B1A]">
            <SellerRefundDialog
              paymentRecordId={r.id}
              reference={r.reference}
              refundableCents={(r.gross_amount_cents ?? 0) - (r.refunded_cents ?? 0)}
              onRefunded={() => refetch()}
            />
          </LightScope>
        ) : null,
    },
  ];

  return (
    <Panel
      title="Earnings by order"
      description="Your latest 100 payment records, without abandoned checkouts. Amounts include pending and authorized payments, so check each status."
      flush
      footer={
        <p className="text-[13px] text-[#5E5953]">
          Unpaid orders and rental bookings are in{' '}
          <Link to="/dashboard/transactions" className={ws.link}>Transactions</Link>
        </p>
      }
    >
      <StatGrid label="Earnings totals" variant="flat" className="border-b border-[#ECE6DD]">
        <StatTile size="sm" label="Buyers paid" format="cents" value={isLoading ? undefined : totals.gross} />
        <StatTile size="sm" label="Vendibook fees" format="cents" value={isLoading ? undefined : totals.fees} />
        <StatTile size="sm" label="Refunded" format="cents" value={isLoading ? undefined : totals.refunded} />
        <StatTile size="sm" label="Your proceeds" format="cents" value={isLoading ? undefined : totals.net} />
      </StatGrid>
      <SimpleTable
        caption="Earnings by order"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={isLoading}
        empty={
          <EmptyState
            compact
            className="px-5 py-5 sm:px-6"
            title="No paid orders yet."
            body="Once a buyer or renter pays, each order shows what they paid, the Vendibook fee and your proceeds."
            action={{ label: 'View transactions', to: '/dashboard/transactions' }}
          />
        }
      />
    </Panel>
  );
}
