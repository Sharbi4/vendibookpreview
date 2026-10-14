import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { EmptyState, PageHeader, StatGrid, StatTile, ws } from '@/components/workspace/ui';
import { FilterTabs } from '@/components/workspace/selling/FilterTabs';
import { ReceivedOfferRow, SentOfferRow, type OfferFocusAction } from '@/components/workspace/selling/OfferRows';
import { LoadError } from '@/components/workspace/selling/sellingUi';
import { dollars } from '@/components/workspace/selling/format';
import { useHostOffers } from '@/hooks/useHostOffers';
import { useBuyerOffers } from '@/hooks/useBuyerOffers';
import { cn } from '@/lib/utils';

const ACTIONS: OfferFocusAction[] = ['review', 'accept', 'counter', 'decline'];
type View = 'received' | 'sent';
const HISTORY_PREVIEW = 5;

function Skeleton() {
  return (
    <ul aria-busy="true" className="divide-y divide-[#F1ECE5]">
      {[0, 1].map((i) => (
        <li key={i} className="flex gap-4 px-5 py-5 sm:px-6">
          <span className={cn(ws.skeleton, 'h-16 w-20 shrink-0 rounded-lg')} />
          <span className="flex-1 space-y-2">
            <span className={cn(ws.skeleton, 'block h-4 w-56 max-w-full')} />
            <span className={cn(ws.skeleton, 'block h-3 w-32')} />
          </span>
          <span className={cn(ws.skeleton, 'hidden h-7 w-24 sm:block')} />
        </li>
      ))}
      <li className="sr-only" role="status">Loading</li>
    </ul>
  );
}

function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className={cn(ws.surface, 'overflow-hidden')}>
      <div className="border-b border-[#ECE6DD] px-5 py-4 sm:px-6">
        <h2 className={ws.sectionTitle}>{title}</h2>
        {note && <p className={cn(ws.sectionNote, 'mt-0.5')}>{note}</p>}
      </div>
      <ul className="divide-y divide-[#F1ECE5]">{children}</ul>
    </section>
  );
}

/**
 * Offers in one place: offers buyers made on your listings (accept, counter,
 * decline) and offers you made as a buyer. Offer emails deep-link here with
 * ?offer=<id>&action=accept|counter|decline; the link only focuses the offer
 * and opens the matching dialog — every response is still the user's click.
 */
export default function WorkspaceOffers() {
  const [params, setParams] = useSearchParams();
  const host = useHostOffers();
  const buyer = useBuyerOffers();
  const [showAllHistory, setShowAllHistory] = useState(false);

  const focusOfferId = params.get('offer');
  const rawAction = params.get('action') as OfferFocusAction | null;
  const focusAction = rawAction && ACTIONS.includes(rawAction) ? rawAction : focusOfferId ? 'review' : null;
  const focusInSent = !!focusOfferId && buyer.offers.some((o) => o.id === focusOfferId);
  const focusInHistory = !!focusOfferId && (host.respondedOffers.some((o) => o.id === focusOfferId) || buyer.offers.some((o) => o.id === focusOfferId && !['pending', 'countered'].includes(o.status)));

  const requested = params.get('view');
  const view: View =
    requested === 'sent' || requested === 'received'
      ? requested
      : focusInSent || (!host.isLoading && host.offers.length === 0 && buyer.offers.length > 0)
        ? 'sent'
        : 'received';
  const setView = (v: View) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('view', v);
      return next;
    }, { replace: true });

  // Received
  const receivedOpen = [...host.pendingOffers, ...host.counteredOffers];
  const highest = host.pendingOffers.length ? Math.max(...host.pendingOffers.map((o) => Number(o.offer_amount) || 0)) : null;
  const acceptedCount = host.offers.filter((o) => o.status === 'accepted' || o.status === 'purchased').length;
  // Sent
  const sentOpen = buyer.offers.filter((o) => o.status === 'pending' || o.status === 'countered');
  const sentAgreed = buyer.offers.filter((o) => o.status === 'accepted');
  const sentHistory = buyer.offers.filter((o) => !['pending', 'countered', 'accepted'].includes(o.status));

  const q = view === 'received' ? host : buyer;
  const state = (q: { isLoading: boolean; isError: boolean }, n: number | null) => (q.isLoading ? undefined : q.isError ? null : n);
  const focusFor = (id: string) => (id === focusOfferId ? focusAction ?? 'review' : null);

  const history = view === 'received' ? host.respondedOffers : sentHistory;
  const historyShown = showAllHistory || focusInHistory ? history : history.slice(0, HISTORY_PREVIEW);

  const receivedRow = (o: (typeof host.offers)[number]) => (
    <ReceivedOfferRow
      key={o.id}
      offer={o}
      onAccept={(id) => host.respondToOffer({ offerId: id, status: 'accepted' })}
      onDecline={(id, response) => host.respondToOffer({ offerId: id, status: 'declined', response })}
      onCounter={(id, amount, message) => host.respondToOffer({ offerId: id, status: 'countered', counterAmount: amount, counterMessage: message })}
      isResponding={host.isResponding}
      focusAction={focusFor(o.id)}
    />
  );
  const sentRow = (o: (typeof buyer.offers)[number]) => (
    <SentOfferRow
      key={o.id}
      offer={o}
      onCancel={buyer.cancelOffer}
      isCancelling={buyer.isCancelling}
      onAcceptCounter={(id) => buyer.respondToCounter({ offerId: id, action: 'accept' })}
      onDeclineCounter={(id) => buyer.respondToCounter({ offerId: id, action: 'decline' })}
      isRespondingToCounter={buyer.isRespondingToCounter}
      focused={o.id === focusOfferId}
    />
  );

  const historyBlock = history.length > 0 && (
    <Group title="Past offers" note="Accepted, declined, withdrawn and expired.">
      {historyShown.map((o) => (view === 'received' ? receivedRow(o as never) : sentRow(o as never)))}
      {history.length > historyShown.length && (
        <li className="px-5 py-3.5 sm:px-6">
          <button type="button" onClick={() => setShowAllHistory(true)} className={ws.actionLink}>
            Show {history.length - historyShown.length} more
          </button>
        </li>
      )}
    </Group>
  );

  return (
    <WorkspaceShell>
      <div className={ws.page}>
        <div className={ws.stack}>
          <PageHeader
            eyebrow="Deals"
            title="Offers"
            description="Offers stay open for 48 hours. Answer before they expire. Accepting agrees on a price; nothing is charged until the invoice is paid."
          />

          <div className="flex flex-col gap-6">
            <FilterTabs<View>
              label="Offer direction"
              value={view}
              onChange={(v) => { setShowAllHistory(false); setView(v); }}
              tabs={[
                { key: 'received', label: 'Received', count: host.isLoading ? null : receivedOpen.length, attention: host.pendingOffers.length > 0 },
                { key: 'sent', label: 'Sent', count: buyer.isLoading ? null : sentOpen.length + sentAgreed.length, attention: buyer.counteredOffers.length > 0 || sentAgreed.length > 0 },
              ]}
            />

            {/* Figures only once there is something to measure; a new account sees the empty state alone. */}
            {!(q.isLoading || q.isError || q.offers.length > 0) ? null : view === 'received' ? (
              <StatGrid cols={3} label="Offers on your listings">
                <StatTile label="Waiting on you" value={state(host, host.pendingOffers.length)} attention sub="Answer within 48 hours" />
                <StatTile label="Highest open offer" value={host.isLoading ? undefined : host.isError ? null : highest === null ? '—' : dollars(highest)} format="text" sub={highest === null ? 'No open offers' : host.pendingOffers.find((o) => Number(o.offer_amount) === highest)?.listing?.title} />
                <StatTile label="Accepted" value={state(host, acceptedCount)} sub="Price agreed, all time" />
              </StatGrid>
            ) : (
              <StatGrid cols={3} label="Offers you made">
                <StatTile label="Waiting on sellers" value={state(buyer, buyer.pendingOffers.length)} />
                <StatTile label="Counter-offers" value={state(buyer, buyer.counteredOffers.length)} attention sub="Answer before they expire" />
                <StatTile label="Price agreed" value={state(buyer, sentAgreed.length)} sub="Ready for an invoice" />
              </StatGrid>
            )}

            {q.isError ? (
              <div className={cn(ws.surface, 'overflow-hidden')}>
                <LoadError what="offers" onRetry={() => void q.refetch()} />
              </div>
            ) : q.isLoading ? (
              <div className={cn(ws.surface, 'overflow-hidden')}><Skeleton /></div>
            ) : view === 'received' ? (
              host.offers.length === 0 ? (
                <div className={cn(ws.surface, 'overflow-hidden')}>
                  <EmptyState
                    title="No offers yet."
                    body="When a buyer makes an offer on one of your sale listings, it shows up here with the amount, their message and how long you have to answer."
                    secondary={{ label: 'View your listings', to: '/dashboard/listings' }}
                  />
                </div>
              ) : (
                <>
                  {receivedOpen.length > 0 ? (
                    <Group title="Open offers" note="Accept, counter or decline. Buyers are notified by email.">
                      {receivedOpen.map(receivedRow)}
                    </Group>
                  ) : (
                    <div className={cn(ws.surface, 'px-5 py-5 sm:px-6')}>
                      <p className="text-[14px] text-[#5E5953]"><span className="font-semibold text-[#1C1B1A]">You’re all caught up.</span> No offers are waiting on you.</p>
                    </div>
                  )}
                  {historyBlock}
                </>
              )
            ) : buyer.offers.length === 0 ? (
              <div className={cn(ws.surface, 'overflow-hidden')}>
                <EmptyState
                  title="You haven’t made any offers."
                  body="Look for “Make an offer” on sale listings. Sellers have 48 hours to accept, counter or decline, and you can follow every offer here."
                  secondary={{ label: 'Browse the marketplace', to: '/search' }}
                />
              </div>
            ) : (
              <>
                {[...sentOpen, ...sentAgreed].length > 0 ? (
                  <Group title="Open offers" note="Counter-offers need your answer before they expire.">
                    {[...buyer.counteredOffers, ...sentAgreed, ...buyer.pendingOffers].map(sentRow)}
                  </Group>
                ) : (
                  <div className={cn(ws.surface, 'px-5 py-5 sm:px-6')}>
                    <p className="text-[14px] text-[#5E5953]"><span className="font-semibold text-[#1C1B1A]">No open offers.</span> Past offers are listed below.</p>
                  </div>
                )}
                {historyBlock}
              </>
            )}
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}
