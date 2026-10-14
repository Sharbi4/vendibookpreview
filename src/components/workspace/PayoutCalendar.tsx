import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSellerPayables, type SellerPayable as PayableRow } from '@/hooks/useSellerPayables';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Panel, StatusPill, ws } from '@/components/workspace/ui';
import { cn } from '@/lib/utils';
import { payablePill } from '@/components/workspace/money/moneyUi';

/**
 * Monthly payout calendar.
 *
 * Shows recorded seller payables on the date Vendibook expects to settle them.
 * Payouts are reviewed and sent manually, so dates are presented as expected,
 * never as a guarantee, and states with no reliable timing (holds, disputes,
 * refunds, failures) are listed separately without a date.
 */

const NO_TIMING_PROMISE = new Set([
  'payout_on_hold',
  'disputed',
  'reversed',
  'payout_failed',
  'partially_refunded',
  'fully_refunded',
  'cancelled',
]);

const STATUS_LABEL: Record<string, string> = {
  awaiting_payment_confirmation: 'Awaiting confirmation',
  pending_release: 'Pending release',
  eligible_for_review: 'Eligible for review',
  payout_on_hold: 'Held',
  payout_approved: 'Approved',
  payout_processing: 'Processing',
  payout_completed: 'Payout sent',
  payout_failed: 'Failed — support notified',
  partially_refunded: 'Partially refunded',
  fully_refunded: 'Refunded',
  disputed: 'Disputed',
  reversed: 'Reversed',
  cancelled: 'Cancelled',
};

const money = (cents: number | null | undefined) =>
  `$${(((cents ?? 0) as number) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The date we expect to settle a payable on, or null when no date is promised. */
const settlementDate = (row: PayableRow): Date | null => {
  if (NO_TIMING_PROMISE.has(row.status)) return null;
  const raw =
    row.status === 'payout_completed'
      ? row.payout_completed_at
      : row.payout_eligible_at || row.release_due_at;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

export default function PayoutCalendar() {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const { data: payables = [], isLoading, isError, refetch } = useSellerPayables();

  const monthRows = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const byDay: Record<string, { row: PayableRow; date: Date }[]> = {};
    let expected = 0;
    let sent = 0;
    payables.forEach((row) => {
      const d = settlementDate(row);
      if (!d || d.getFullYear() !== y || d.getMonth() !== m) return;
      (byDay[dayKey(d)] ||= []).push({ row, date: d });
      if (row.status === 'payout_completed') sent += row.net_payout_cents ?? 0;
      else expected += row.net_payout_cents ?? 0;
    });
    return { byDay, expected, sent };
  }, [payables, cursor]);

  const undated = useMemo(
    () => payables.filter((row) => settlementDate(row) === null),
    [payables],
  );

  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const todayKey = dayKey(new Date());
  const shiftMonth = (delta: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  const dated = Object.entries(monthRows.byDay).sort(([a], [b]) => a.localeCompare(b));

  const navBtn =
    'grid h-9 w-9 place-items-center rounded-full border border-[#E2DBD0] bg-white text-[#1C1B1A] transition-colors hover:border-[#1C1B1A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1B1A]';

  return (
    <Panel
      title="Payout calendar"
      description="Expected settlement dates for your recorded proceeds. Payouts are reviewed and sent manually, so dates are expected, not guaranteed."
      flush
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6">
        <button type="button" aria-label="Previous month" className={navBtn} onClick={() => shiftMonth(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 text-center">
          <div className="text-[15px] font-semibold tracking-[-0.01em] text-[#1C1B1A]">{monthLabel}</div>
          <div className="mt-0.5 text-[12.5px] tabular-nums text-[#8A847B]" aria-live="polite">
            {isLoading ? 'Loading payout totals…' : isError ? 'Totals unavailable' : `${money(monthRows.expected)} expected · ${money(monthRows.sent)} sent`}
          </div>
        </div>
        <button type="button" aria-label="Next month" className={navBtn} onClick={() => shiftMonth(1)}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {isError ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-4 border-t border-[#ECE6DD] px-5 py-5 sm:px-6">
          <p className="text-[14px] text-[#1C1B1A]">Payout records could not be loaded.</p>
          <button type="button" className={ws.secondary} onClick={() => refetch()}>Retry</button>
        </div>
      ) : isLoading ? (
        <div className="px-5 pb-5 sm:px-6"><div className={cn(ws.skeleton, 'h-56 w-full')} /></div>
      ) : (
        <>
          <div className="px-3 pb-4 sm:px-6">
            <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8A847B]">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="py-2">
                  <span className="sm:hidden">{d.charAt(0)}</span>
                  <span className="hidden sm:inline">{d}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-[#ECE6DD] ring-1 ring-[#ECE6DD]">
              {grid.map((d) => {
                const key = dayKey(d);
                const inMonth = d.getMonth() === cursor.getMonth();
                const items = monthRows.byDay[key] ?? [];
                const sum = items.reduce((acc, i) => acc + (i.row.net_payout_cents ?? 0), 0);
                const isToday = key === todayKey;
                return (
                  <div
                    key={key}
                    className={cn('min-h-[52px] p-1.5 text-left sm:min-h-[68px] sm:p-2', inMonth ? 'bg-white' : 'bg-[#FAF8F5]')}
                  >
                    <div
                      className={cn(
                        'grid h-6 w-6 place-items-center rounded-full text-[12px] tabular-nums',
                        isToday ? 'bg-[#1C1B1A] font-semibold text-white' : inMonth ? 'text-[#1C1B1A]' : 'text-[#B5AEA4]',
                      )}
                    >
                      {d.getDate()}
                    </div>
                    {items.length > 0 && (
                      <div className="mt-1 hidden truncate rounded-md bg-[#FFEEE7] px-1.5 py-0.5 text-[11.5px] font-semibold tabular-nums text-[#B93A12] sm:block">
                        {money(sum)}
                        {items.length > 1 && <span className="ml-1 font-normal text-[#B93A12]/70">×{items.length}</span>}
                      </div>
                    )}
                    {items.length > 0 && (
                      <span className="mt-1.5 block h-1.5 w-1.5 rounded-full bg-[#FF5124] sm:hidden" aria-label={`${items.length} payouts; details below`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-[#ECE6DD]">
            {dated.length === 0 ? (
              <p className="px-5 py-4 text-[13.5px] text-[#5E5953] sm:px-6">No settlements expected in {monthLabel}.</p>
            ) : (
              <ul className="divide-y divide-[#F1ECE5]">
                {dated.map(([, items]) =>
                  items.map(({ row, date }) => {
                    const pill = payablePill(row.status);
                    return (
                      <li key={row.id} className="flex items-center justify-between gap-4 px-5 py-3.5 sm:px-6">
                        <div className="min-w-0">
                          <div className="text-[14px] font-semibold text-[#1C1B1A]">
                            {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-[#8A847B]">
                            <span>{row.transaction_type === 'rental' ? 'Rental booking' : 'Sale'}</span>
                            <StatusPill tone={pill.tone}>{STATUS_LABEL[row.status] ?? pill.label}</StatusPill>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-[14px] font-semibold tabular-nums text-[#1C1B1A]">{money(row.net_payout_cents)}</div>
                          {row.payment_record_id && (
                            <Link className={cn(ws.actionLink, 'mt-0.5')} to={`/dashboard/transactions/${row.payment_record_id}`}>View order</Link>
                          )}
                        </div>
                      </li>
                    );
                  }),
                )}
              </ul>
            )}
          </div>

          {undated.length > 0 && (
            <div className="border-t border-[#ECE6DD] bg-[#FCFAF7] px-5 py-4 sm:px-6">
              <p className={ws.eyebrow}>No date yet</p>
              <ul className="mt-2.5 space-y-2">
                {undated.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="text-[#5E5953]">{STATUS_LABEL[row.status] ?? row.status}</span>
                    <span className="font-semibold tabular-nums text-[#1C1B1A]">{money(row.net_payout_cents)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
