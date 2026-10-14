import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBoostHistory, type BoostHistoryRow } from '@/hooks/useBoostHistory';
import { Panel, SimpleTable, StatusPill, formatDay, ws, type SimpleColumn, type StatusTone } from '@/components/workspace/ui';
import { money } from './moneyUi';

const PROMO_LABEL: Record<string, string> = {
  featured_7: 'Featured, 7 days',
  featured_30: 'Featured, 30 days',
  top_of_search: 'Top of search',
  highlight: 'Highlight',
  motivated_seller: 'Motivated seller',
  email_campaign: 'Email campaign',
  social_feature: 'Social feature',
};

const PAYMENT: Record<string, { label: string; tone: StatusTone }> = {
  paid: { label: 'Paid', tone: 'ok' },
  fulfilled: { label: 'Paid', tone: 'ok' },
  pending: { label: 'Payment pending', tone: 'warn' },
  failed: { label: 'Payment failed', tone: 'alert' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
  refunded: { label: 'Refunded', tone: 'muted' },
};

const SHOWN = 5;

/**
 * Boost (listing promotion) purchases: what's live, when each ends and the
 * payment behind it. Hidden until the seller has bought a boost.
 */
export default function BoostHistoryTable() {
  const { user } = useAuth();
  const { boosts, isLoading } = useBoostHistory(user?.id);
  const [all, setAll] = useState(false);
  if (isLoading || boosts.length === 0) return null;

  const rows = all ? boosts : boosts.slice(0, SHOWN);
  const live = boosts.filter((b) => b.live).length;
  const columns: SimpleColumn<BoostHistoryRow>[] = [
    {
      key: 'listing',
      header: 'Boost',
      cell: (b) => (
        <span className="block min-w-0">
          <Link to={`/listing/${b.listingId}`} className="block max-w-[52vw] truncate font-semibold hover:underline sm:max-w-[18rem]">{b.listingTitle}</Link>
          <span className="block truncate text-[12.5px] text-[#8A847B]">
            {PROMO_LABEL[b.promoType] ?? b.promoType} · {formatDay(b.startsAt)} to {formatDay(b.endsAt)}
          </span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      hideBelow: 'sm',
      cell: (b) => {
        const pay = b.refundedAt ? PAYMENT.refunded : b.paymentStatus ? PAYMENT[b.paymentStatus] : undefined;
        return (
          <span className="flex flex-wrap gap-1.5">
            {b.live ? (
              <StatusPill tone="ok">Live · {b.daysRemaining} day{b.daysRemaining === 1 ? '' : 's'} left</StatusPill>
            ) : (
              <StatusPill tone="muted">{new Date(b.endsAt).getTime() <= Date.now() ? 'Ended' : 'Not active'}</StatusPill>
            )}
            <StatusPill tone={pay?.tone ?? 'neutral'} dot={false}>{pay?.label ?? b.paymentStatus ?? 'Payment status unknown'}</StatusPill>
          </span>
        );
      },
    },
    { key: 'amount', header: 'Amount', align: 'right', className: 'font-semibold', cell: (b) => money(b.amountCents) },
  ];

  return (
    <Panel
      title="Boost history"
      description={live ? `${live} live now. Each boost shows when it ends and the payment behind it.` : 'When each boost ran and the payment behind it.'}
      action={{ label: 'Your listings', to: '/dashboard/listings' }}
      flush
      footer={
        boosts.length > SHOWN ? (
          <button type="button" className={ws.actionLink} onClick={() => setAll((v) => !v)}>
            {all ? 'Show fewer' : `Show all ${boosts.length} boosts`}
          </button>
        ) : undefined
      }
    >
      <SimpleTable caption="Boost history" columns={columns} rows={rows} rowKey={(b) => b.id} />
    </Panel>
  );
}
