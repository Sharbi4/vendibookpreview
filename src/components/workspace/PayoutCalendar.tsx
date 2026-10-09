import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSellerPayables, type SellerPayable as PayableRow } from '@/hooks/useSellerPayables';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

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

  return (
    <div className="space-y-5 v2-embedded-section p-4 sm:p-5">
      <div className="v2-panel-head">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Payout calendar
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your recorded seller proceeds, using the same records as Your payouts. Every payout is reviewed and sent
            manually by our team, so dates are expected rather than guaranteed.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="Previous month"
          className="v2-btn-quiet"
          onClick={() => shiftMonth(-1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <div className="text-sm font-semibold text-foreground">{monthLabel}</div>
          <div className="text-xs text-muted-foreground" aria-live="polite">
            {isLoading ? 'Loading payout totals…' : isError ? 'Totals unavailable' : `${money(monthRows.expected)} expected · ${money(monthRows.sent)} sent this month`}
          </div>
        </div>
        <button
          type="button"
          aria-label="Next month"
          className="v2-btn-quiet"
          onClick={() => shiftMonth(1)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {isError ? <div role="alert" className="p-4">Payout records could not be loaded. <button className="v2-btn-quiet" onClick={() => refetch()}>Retry</button></div> : isLoading ? (
        <div className="v2-skeleton h-56 w-full" />
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wide text-muted-foreground">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {grid.map((d) => {
              const key = dayKey(d);
              const inMonth = d.getMonth() === cursor.getMonth();
              const items = monthRows.byDay[key] ?? [];
              const sum = items.reduce((acc, i) => acc + (i.row.net_payout_cents ?? 0), 0);
              return (
                <div
                  key={key}
                  className={[
                    'min-h-[62px] rounded-md border p-1.5 text-left',
                    inMonth ? 'border-border bg-card' : 'border-transparent bg-muted/30',
                    key === todayKey ? 'ring-1 ring-primary/50' : '',
                  ].join(' ')}
                >
                  <div
                    className={`text-[11px] ${inMonth ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    {d.getDate()}
                  </div>
                  {items.length > 0 && (
                    <div className="mt-1 rounded bg-primary/10 px-1 py-0.5 text-[11px] font-semibold text-foreground hidden sm:block">
                      {money(sum)}
                      {items.length > 1 && (
                        <span className="ml-1 font-normal text-muted-foreground">
                          ×{items.length}
                        </span>
                      )}
                    </div>
                  )}
                  {items.length > 0 && <span className="sm:hidden block mt-2 h-2 w-2 rounded-full bg-primary" aria-label={`${items.length} payouts; details below`} />}
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            {dated.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No settlements expected in {monthLabel}.
              </p>
            ) : (
              dated.map(([key, items]) =>
                items.map(({ row, date }) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">
                        {date.toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {row.transaction_type === 'rental' ? 'Rental booking' : 'Sale'} ·{' '}
                        {STATUS_LABEL[row.status] ?? row.status}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      {money(row.net_payout_cents)}
                      {row.payment_record_id && <Link className="block underline text-xs" to={`/dashboard/transactions/${row.payment_record_id}`}>View order</Link>}
                    </div>
                  </div>
                )),
              )
            )}
          </div>

          {undated.length > 0 && (
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold text-foreground">No date yet</p>
              <ul className="mt-2 space-y-1">
                {undated.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-3 text-xs text-muted-foreground"
                  >
                    <span>

                      {STATUS_LABEL[row.status] ?? row.status}
                    </span>
                    <span className="font-medium text-foreground">
                      {money(row.net_payout_cents)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
