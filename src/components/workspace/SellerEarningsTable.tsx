import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import SellerRefundDialog from '@/components/workspace/SellerRefundDialog';

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
  authorized: 'Funds held',
  completed: 'Paid',
  partially_captured: 'Partly charged',
  deposit_paid_balance_due: 'Deposit paid',
  declined: 'Declined',
  failed: 'Failed',
  cancelled: 'Cancelled',
  partially_refunded: 'Partly refunded',
  refunded: 'Refunded',
  reversed: 'Reversed',
  authorization_voided: 'Hold released',
  authorization_expired: 'Hold expired',
};

const PAYMENT_TONE: Record<string, string> = {
  completed: 'is-ok',
  authorized: 'is-ok',
  partially_captured: 'is-ok',
  deposit_paid_balance_due: 'is-ok',
  pending: 'is-warn',
  approved: 'is-warn',
  created: 'is-warn',
  declined: 'is-alert',
  failed: 'is-alert',
  cancelled: 'is-alert',
  reversed: 'is-alert',
  refunded: 'is-alert',
  partially_refunded: 'is-warn',
  authorization_voided: 'is-warn',
  authorization_expired: 'is-warn',
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

export default function SellerEarningsTable() {
  const { user } = useAuth();

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ['seller-order-earnings', user?.id],
    enabled: !!user?.id,
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

  const { data: payables = [] } = useQuery({
    queryKey: ['seller-order-payables', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('seller_payables')
        .select('payment_record_id, status, net_payout_cents')
        .eq('seller_id', user!.id)
        .limit(200);
      if (error) throw error;
      return (data ?? []) as PayableRow[];
    },
  });

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
    for (const r of rows) {
      gross += r.gross_amount_cents ?? 0;
      fees += r.platform_fee_cents ?? 0;
      refunded += r.refunded_cents ?? 0;
      net += r.seller_proceeds_cents ?? 0;
    }
    return { gross, fees, refunded, net };
  }, [rows]);

  return (
    <div>
      <div className="v2-panel-head">
        <div>
          <h2>Earnings by order</h2>
          <p>
            Every order on your listings, with what the buyer paid, Vendibook&apos;s fee, any
            refunds, your proceeds, and the current PayPal payment status.
          </p>
        </div>
      </div>

      <div className="v2-payout-tiles">
        <article>
          <small>Buyers paid</small>
          <strong>{money(totals.gross)}</strong>
        </article>
        <article>
          <small>Vendibook fees</small>
          <strong>{money(totals.fees)}</strong>
        </article>
        <article>
          <small>Refunded</small>
          <strong>{money(totals.refunded)}</strong>
        </article>
        <article>
          <small>Your proceeds</small>
          <strong>{money(totals.net)}</strong>
        </article>
      </div>

      {isLoading ? (
        <div className="v2-payout-empty">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your orders…
        </div>
      ) : rows.length === 0 ? (
        <div className="v2-payout-empty">
          No orders yet. When a buyer pays for one of your listings, its earnings appear here.
        </div>
      ) : (
        <ul className="v2-earnings-list">
          {rows.map((r) => {
            const status = r.payment_status ?? 'created';
            const payable = payableByRecord.get(r.id);
            const date = shortDate(r.captured_at || r.created_at);
            return (
              <li key={r.id}>
                <div className="v2-earnings-main">
                  <Link to={`/orders/${r.id}`} className="v2-earnings-title">
                    {r.listings?.title || 'Listing'}
                  </Link>
                  <small>
                    {r.reference ? `${r.reference} · ` : ''}
                    {(r.transaction_type ?? 'order').replace(/_/g, ' ')}
                    {date ? ` · ${date}` : ''}
                  </small>
                  <div className="v2-earnings-chips">
                    <span className={`v2-earnings-chip ${PAYMENT_TONE[status] ?? ''}`}>
                      {PAYMENT_LABEL[status] ?? status.replace(/_/g, ' ')}
                    </span>
                    {payable ? (
                      <span className="v2-earnings-chip">
                        {PAYOUT_LABEL[payable.status] ?? payable.status.replace(/_/g, ' ')}
                      </span>
                    ) : null}
                    {r.dispute_status ? (
                      <span className="v2-earnings-chip is-alert">
                        Dispute: {r.dispute_status.replace(/_/g, ' ')}
                      </span>
                    ) : null}
                  </div>
                </div>
                <dl className="v2-earnings-figures">
                  <div>
                    <dt>Buyer paid</dt>
                    <dd>{money(r.gross_amount_cents)}</dd>
                  </div>
                  <div>
                    <dt>Vendibook fee</dt>
                    <dd>−{money(r.platform_fee_cents)}</dd>
                  </div>
                  {(r.refunded_cents ?? 0) > 0 ? (
                    <div>
                      <dt>Refunded</dt>
                      <dd>−{money(r.refunded_cents)}</dd>
                    </div>
                  ) : null}
                  <div className="v2-earnings-net">
                    <dt>Your proceeds</dt>
                    <dd>{money(r.seller_proceeds_cents ?? payable?.net_payout_cents ?? 0)}</dd>
                  </div>
                </dl>
                {['completed', 'partially_refunded', 'partially_captured'].includes(status) ? (
                  <div className="v2-earnings-actions">
                    <SellerRefundDialog
                      paymentRecordId={r.id}
                      reference={r.reference}
                      refundableCents={(r.gross_amount_cents ?? 0) - (r.refunded_cents ?? 0)}
                      onRefunded={() => refetch()}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
