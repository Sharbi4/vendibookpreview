import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown } from 'lucide-react';
import type { useHostListings } from '@/hooks/useHostListings';
import type { useHostBookings } from '@/hooks/useHostBookings';
import type { useUserTransactions } from '@/hooks/useUserTransactions';
import { StatusPill, formatCents, formatDay, ws, type StatusTone } from '@/components/workspace/ui';
import { Thumb } from '@/components/workspace/selling/sellingUi';
import { dollars, humanize } from '@/components/workspace/selling/format';
import { cn } from '@/lib/utils';

type Listing = ReturnType<typeof useHostListings>['listings'][number];
type Booking = ReturnType<typeof useHostBookings>['bookings'][number];
type Tx = ReturnType<typeof useUserTransactions>['transactions'][number];

type TimelineEntry = {
  id: string;
  label: string;
  detail: string | null;
  date: string;
  amount: string | null;
  href: string | null;
  tone: StatusTone;
  payment: boolean;
};

const DOT: Record<StatusTone, string> = {
  ok: 'bg-[#2E8B57]',
  warn: 'bg-[#C98A0B]',
  alert: 'bg-[#D92D20]',
  muted: 'bg-[#C9C2B8]',
  neutral: 'bg-[#8A847B]',
  accent: 'bg-[#FF5124]',
};

/**
 * Published listings a seller owns, each with a timeline built only from real
 * records: when it was listed and published, and every payment or booking
 * recorded against it. Data comes from the Activity page's hooks.
 */
export default function WorkspaceListingActivity({
  listings, bookings, transactions, userId,
}: {
  listings: Listing[];
  bookings: Booking[];
  transactions: Tx[];
  userId: string | undefined;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const published = useMemo(() => listings.filter((l) => l.status === 'published'), [listings]);

  const timelines = useMemo(() => {
    const map: Record<string, TimelineEntry[]> = {};
    for (const listing of published) {
      const entries: TimelineEntry[] = [
        { id: `${listing.id}-created`, label: 'Listing created', detail: null, date: listing.created_at, amount: null, href: null, tone: 'muted', payment: false },
      ];
      if (listing.published_at) {
        entries.push({ id: `${listing.id}-published`, label: 'Published to the marketplace', detail: null, date: listing.published_at, amount: null, href: `/listing/${listing.id}`, tone: 'ok', payment: false });
      }
      for (const t of transactions) {
        if (t.listing_id !== listing.id || t.seller_id !== userId) continue;
        const disputed = !!t.dispute_status && t.dispute_status !== 'none';
        entries.push({
          id: `${listing.id}-pay-${t.id}`,
          label: disputed ? `Dispute: ${humanize(t.dispute_status).toLowerCase()}` : `Payment ${humanize(t.payment_status || 'recorded').toLowerCase()}`,
          detail: t.reference,
          date: t.captured_at || t.created_at,
          amount: t.gross_amount_cents == null ? null : formatCents(t.gross_amount_cents, { cents: t.gross_amount_cents % 100 !== 0 }),
          href: `/orders/${t.id}`,
          tone: disputed ? 'alert' : t.payment_status === 'paid' || t.payment_status === 'completed' ? 'ok' : 'warn',
          payment: true,
        });
      }
      for (const b of bookings) {
        if (b.listing_id !== listing.id) continue;
        entries.push({
          id: `${listing.id}-book-${b.id}`,
          label: `Booking ${humanize(b.status).toLowerCase()}${b.payment_status && b.payment_status !== 'paid' ? ` · payment ${humanize(b.payment_status).toLowerCase()}` : ''}`,
          detail: b.shopper?.full_name || null,
          date: b.created_at,
          amount: dollars(b.total_price),
          href: `/dashboard/bookings/${b.id}`,
          tone: b.status === 'cancelled' || b.status === 'declined' ? 'muted' : b.status === 'pending' ? 'warn' : 'ok',
          payment: false,
        });
      }
      map[listing.id] = entries.sort((a, b) => +new Date(b.date) - +new Date(a.date));
    }
    return map;
  }, [published, transactions, bookings, userId]);

  if (!published.length) return null;

  return (
    <section className={cn(ws.surface, 'overflow-hidden')} aria-labelledby="listing-history-title">
      <div className="flex items-start justify-between gap-4 border-b border-[#ECE6DD] px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 id="listing-history-title" className={ws.sectionTitle}>Listing history</h2>
          <p className={cn(ws.sectionNote, 'mt-0.5')}>Open a live listing to see everything recorded against it.</p>
        </div>
        <Link to="/dashboard/listings" className={cn(ws.actionLink, 'pt-0.5')}>
          Manage listings <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      </div>

      <ul className="divide-y divide-[#F1ECE5]">
        {published.map((listing) => {
          const entries = timelines[listing.id] ?? [];
          const payments = entries.filter((e) => e.payment).length;
          const bookingsCount = entries.filter((e) => e.id.includes('-book-')).length;
          const isOpen = openId === listing.id;
          const panelId = `listing-history-${listing.id}`;
          return (
            <li key={listing.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3.5 px-5 py-4 text-left transition-colors hover:bg-[#FCFAF7] sm:px-6"
                onClick={() => setOpenId(isOpen ? null : listing.id)}
                aria-expanded={isOpen}
                aria-controls={panelId}
              >
                <Thumb src={listing.cover_image_url} className="h-11 w-14" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-[#1C1B1A]">{listing.title}</span>
                  <span className="block truncate text-[12.5px] text-[#8A847B]">
                    {listing.published_at ? `Published ${formatDay(listing.published_at)}` : 'Published'}
                    {bookingsCount ? ` · ${bookingsCount} booking${bookingsCount === 1 ? '' : 's'}` : ''}
                  </span>
                </span>
                <StatusPill tone={payments ? 'ok' : 'muted'} className="hidden sm:inline-flex">
                  {payments ? `${payments} payment${payments > 1 ? 's' : ''}` : 'No payments yet'}
                </StatusPill>
                <ChevronDown aria-hidden="true" className={cn('h-4 w-4 shrink-0 text-[#8A847B] transition-transform', isOpen && 'rotate-180')} />
              </button>

              {isOpen && (
                <ol id={panelId} className="relative mx-5 mb-4 ml-[34px] border-l border-[#ECE6DD] pl-6 sm:mx-6 sm:ml-[38px]">
                  {entries.map((entry) => (
                    <li key={entry.id} className="relative flex items-start gap-4 py-2.5">
                      <span aria-hidden="true" className={cn('absolute -left-[28.5px] top-[15px] h-2 w-2 rounded-full ring-4 ring-white', DOT[entry.tone])} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-[#1C1B1A]">
                          {entry.href ? <Link to={entry.href} className="hover:underline">{entry.label}</Link> : entry.label}
                        </p>
                        <p className="text-[12px] text-[#8A847B]">
                          {formatDay(entry.date)}
                          {entry.detail ? ` · ${entry.detail}` : ''}
                        </p>
                      </div>
                      {entry.amount && <span className="shrink-0 text-[13.5px] font-semibold tabular-nums">{entry.amount}</span>}
                    </li>
                  ))}
                </ol>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
