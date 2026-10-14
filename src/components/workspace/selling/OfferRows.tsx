import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { StatusPill, type StatusTone } from '@/components/workspace/ui';
import { NegotiationCoach } from '@/components/dashboard/NegotiationCoach';
import type { HostOffer } from '@/hooks/useHostOffers';
import type { BuyerOffer } from '@/hooks/useBuyerOffers';
import { offerDeadline } from '@/lib/offers/offerState';
import { getCounterpartyName } from '@/lib/displayName';
import { cn } from '@/lib/utils';
import { Thumb } from './sellingUi';
import { btn } from './buttons';
import { dayTime, dollars, timeLeft } from './format';

export type OfferFocusAction = 'review' | 'accept' | 'counter' | 'decline';

const RECEIVED_STATUS: Record<string, { tone: StatusTone; label: string }> = {
  pending: { tone: 'accent', label: 'Waiting on you' },
  countered: { tone: 'neutral', label: 'You countered' },
  accepted: { tone: 'ok', label: 'Accepted' },
  purchased: { tone: 'ok', label: 'Sale pending' },
  declined: { tone: 'muted', label: 'Declined' },
  expired: { tone: 'muted', label: 'Expired' },
  cancelled: { tone: 'muted', label: 'Withdrawn by buyer' },
};

const SENT_STATUS: Record<string, { tone: StatusTone; label: string }> = {
  pending: { tone: 'neutral', label: 'Waiting on seller' },
  countered: { tone: 'accent', label: 'Seller countered' },
  accepted: { tone: 'ok', label: 'Price agreed' },
  purchased: { tone: 'ok', label: 'Sale pending' },
  declined: { tone: 'muted', label: 'Declined' },
  expired: { tone: 'muted', label: 'Expired' },
  cancelled: { tone: 'muted', label: 'Cancelled' },
};

const pill = (map: typeof RECEIVED_STATUS, status: string) => map[status] ?? { tone: 'muted' as StatusTone, label: status.replace(/_/g, ' ') };

/** "Expires in 1 day 19 hr · Oct 16, 3:00 PM". */
function Expiry({ deadline, label = 'Expires' }: { deadline: number; label?: string }) {
  const left = timeLeft(deadline);
  if (!left) return null;
  const soon = deadline - Date.now() < 12 * 36e5;
  return (
    <span className={cn('text-[12.5px] tabular-nums', soon ? 'font-semibold text-[#B93A12]' : 'text-[#5E5953]')}>
      {label} in {left.replace(' left', '')} <span className="font-normal text-[#8A847B]">· {dayTime(deadline)}</span>
    </span>
  );
}

/** Shared row frame: photo, title block, big amount, then a footer for deadline + actions. */
function OfferFrame({
  id, focused, image, listingHref, title, subtitle, status, amount, amountNote, children, footerLeft, actions, frameRef,
}: {
  id: string;
  focused?: boolean;
  image: string | null;
  listingHref: string;
  title: string;
  subtitle: ReactNode;
  status: { tone: StatusTone; label: string };
  amount: string | null;
  amountNote?: ReactNode;
  children?: ReactNode;
  footerLeft?: ReactNode;
  actions?: ReactNode;
  frameRef?: Ref<HTMLLIElement>;
}) {
  return (
    <li
      ref={frameRef}
      id={`offer-${id}`}
      className={cn('scroll-mt-28 px-5 py-5 sm:px-6', focused && 'bg-[#FFF8F4] shadow-[inset_3px_0_0_#FF5124]')}
    >
      <div className="flex gap-4">
        <Link to={listingHref} tabIndex={-1} aria-hidden="true" className="shrink-0">
          <Thumb src={image} className="h-14 w-14 sm:h-16 sm:w-20" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <Link to={listingHref} className="block truncate text-[14px] font-semibold text-[#1C1B1A] hover:underline">{title}</Link>
              <p className="mt-0.5 truncate text-[12.5px] text-[#8A847B]">{subtitle}</p>
              <div className="mt-2"><StatusPill tone={status.tone}>{status.label}</StatusPill></div>
            </div>
            <div className="shrink-0 sm:text-right">
              <p className="text-[24px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-[#1C1B1A] sm:text-[26px]">{amount ?? '—'}</p>
              {amountNote && <p className="mt-1.5 text-[12.5px] tabular-nums text-[#8A847B]">{amountNote}</p>}
            </div>
          </div>
          {children}
          {(footerLeft || actions) && (
            <div className="mt-4 flex flex-col gap-3 border-t border-[#F1ECE5] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">{footerLeft}</div>
              {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

const Quote = ({ who, text }: { who: string; text: string }) => (
  <p className="mt-3 max-w-xl rounded-xl bg-[#F8F5F0] px-3.5 py-2.5 text-[13px] leading-5 text-[#5E5953]">
    <span className="font-semibold text-[#1C1B1A]">{who}: </span>“{text}”
  </p>
);

const percentOf = (amount: number, asking: number | null) =>
  asking ? `${Math.round((amount / asking) * 100)}% of ${dollars(asking)} asking` : null;

/* ------------------------------------------------------------------ */
/* Offers buyers made on the seller's listings                          */
/* ------------------------------------------------------------------ */

export function ReceivedOfferRow({
  offer, onAccept, onDecline, onCounter, isResponding, focusAction,
}: {
  offer: HostOffer;
  onAccept: (offerId: string) => void;
  onDecline: (offerId: string, response?: string) => void;
  onCounter: (offerId: string, amount: number, message?: string) => void;
  isResponding: boolean;
  /** Set when an email deep link targets this offer. Never acts on its own. */
  focusAction?: OfferFocusAction | null;
}) {
  const [showDecline, setShowDecline] = useState(false);
  const [showCounter, setShowCounter] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [counterAmount, setCounterAmount] = useState('');
  const [counterMessage, setCounterMessage] = useState('');

  // Status is already resolved by the hook (expired pending rows read 'expired').
  const isPending = offer.status === 'pending';
  const isCountered = offer.status === 'countered';
  const asking = offer.listing?.price_sale ?? null;
  const deadline = offerDeadline(offer);

  const openCounter = () => {
    // Pre-fill with the midpoint between the offer and the asking price.
    if (asking) setCounterAmount(String(Math.round((offer.offer_amount + asking) / 2)));
    setShowCounter(true);
  };

  const handleDecline = () => {
    onDecline(offer.id, declineReason);
    setShowDecline(false);
    setDeclineReason('');
  };

  const amountNum = parseFloat(counterAmount);
  const counterValid =
    Number.isFinite(amountNum) && amountNum > 0 && amountNum <= 10000000 && Math.abs(amountNum * 100 - Math.round(amountNum * 100)) <= 1e-7;
  const handleCounter = () => {
    if (!counterValid) return;
    onCounter(offer.id, amountNum, counterMessage);
    setShowCounter(false);
    setCounterAmount('');
    setCounterMessage('');
  };

  // Email deep link: scroll to the offer and open the matching dialog. Accept
  // is never automatic: the seller still clicks Accept.
  const ref = useRef<HTMLLIElement>(null);
  const handled = useRef(false);
  useEffect(() => {
    if (!focusAction || handled.current) return;
    handled.current = true;
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (!isPending) return;
    if (focusAction === 'counter') openCounter();
    if (focusAction === 'decline') setShowDecline(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusAction]);

  const buyer = getCounterpartyName(offer.buyer, 'Buyer');
  const sent = new Date(offer.created_at);

  return (
    <>
      <OfferFrame
        frameRef={ref}
        id={offer.id}
        focused={!!focusAction}
        image={offer.listing?.cover_image_url ?? null}
        listingHref={`/listing/${offer.listing_id}`}
        title={offer.listing?.title || 'Listing'}
        subtitle={<>From {buyer} · {sent.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>}
        status={pill(RECEIVED_STATUS, offer.status)}
        amount={dollars(offer.offer_amount)}
        amountNote={percentOf(offer.offer_amount, asking)}
        footerLeft={
          isPending ? <Expiry deadline={deadline} />
            : isCountered ? <span className="text-[12.5px] text-[#5E5953]">Your counter: <span className="font-semibold text-[#1C1B1A]">{dollars(offer.counter_amount)}</span> · <Expiry deadline={deadline} label="Buyer has until" /></span>
            : offer.status === 'accepted' ? <span className="text-[12.5px] text-[#5E5953]">Price agreed at <span className="font-semibold text-[#1C1B1A]">{dollars(offer.agreed_amount ?? offer.offer_amount)}</span>. The buyer hasn’t paid yet; an itemized invoice comes next.</span>
            : undefined
        }
        actions={
          isPending ? (
            <>
              <button type="button" className={btn.text} onClick={() => setShowDecline(true)} disabled={isResponding}>Decline</button>
              <button type="button" className={btn.outlineMd} onClick={openCounter} disabled={isResponding}>Counter</button>
              <button type="button" className={btn.solid} onClick={() => onAccept(offer.id)} disabled={isResponding}>
                {isResponding ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
                Accept {dollars(offer.offer_amount)}
              </button>
            </>
          ) : offer.status === 'accepted' || offer.status === 'purchased' ? (
            <Link to="/dashboard/invoices?view=selling" className={btn.outlineMd}>Purchase requests</Link>
          ) : undefined
        }
      >
        {offer.message && !isCountered && <Quote who={buyer} text={offer.message} />}
        {isCountered && offer.counter_message && <Quote who="You" text={offer.counter_message} />}
        {!isPending && !isCountered && offer.seller_response && <Quote who="Your reply" text={offer.seller_response} />}
      </OfferFrame>

      <Dialog open={showDecline} onOpenChange={setShowDecline}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Decline this offer?</DialogTitle>
            <DialogDescription>
              {buyer} offered {dollars(offer.offer_amount)} for {offer.listing?.title || 'your listing'}. You can add a short note for the buyer.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Optional, e.g. “I’m looking for offers closer to asking.”"
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            maxLength={1000}
            rows={3}
          />
          <DialogFooter className="gap-2 sm:gap-2">
            <button type="button" className={btn.outlineMd} onClick={() => setShowDecline(false)}>Keep offer</button>
            <button type="button" className={cn(btn.solid, 'bg-[#B42318] hover:bg-[#9F1F15]')} onClick={handleDecline} disabled={isResponding}>
              {isResponding ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : 'Decline offer'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCounter} onOpenChange={setShowCounter}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Counter this offer</DialogTitle>
            <DialogDescription>Propose a different price. The buyer has 48 hours to respond.</DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-[#ECE6DD] text-[13px]">
            <div className="bg-[#FAF8F5] px-4 py-3">
              <dt className="text-[#8A847B]">Their offer</dt>
              <dd className="mt-0.5 text-[16px] font-semibold tabular-nums">{dollars(offer.offer_amount)}</dd>
            </div>
            <div className="bg-[#FAF8F5] px-4 py-3">
              <dt className="text-[#8A847B]">Your asking price</dt>
              <dd className="mt-0.5 text-[16px] font-semibold tabular-nums">{dollars(asking) ?? '—'}</dd>
            </div>
          </dl>
          <div className="space-y-2">
            <label htmlFor={`counter-${offer.id}`} className="text-[13px] font-semibold text-[#1C1B1A]">Your counter-offer</label>
            <div className="relative">
              <span aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-[#8A847B]">$</span>
              <input
                id={`counter-${offer.id}`}
                type="number"
                inputMode="decimal"
                placeholder="Amount"
                value={counterAmount}
                onChange={(e) => setCounterAmount(e.target.value)}
                min="0.01"
                max="10000000"
                step="0.01"
                className="h-11 w-full rounded-xl border border-[#E2DBD0] bg-white pl-8 pr-3 text-[16px] tabular-nums text-[#1C1B1A] placeholder:text-[#A8A198] focus:border-[#1C1B1A] focus:outline-none"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor={`counter-msg-${offer.id}`} className="text-[13px] font-semibold text-[#1C1B1A]">Message <span className="font-normal text-[#8A847B]">(optional)</span></label>
            <Textarea
              id={`counter-msg-${offer.id}`}
              placeholder="e.g. “I can meet you halfway at this price.”"
              value={counterMessage}
              onChange={(e) => setCounterMessage(e.target.value)}
              maxLength={1000}
              rows={2}
            />
          </div>
          {isPending && <NegotiationCoach offerId={offer.id} onUseCounter={(amt) => setCounterAmount(String(amt))} />}
          <DialogFooter className="gap-2 sm:gap-2">
            <button type="button" className={btn.outlineMd} onClick={() => setShowCounter(false)}>Cancel</button>
            <button type="button" className={btn.solid} onClick={handleCounter} disabled={isResponding || !counterValid}>
              {isResponding ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : 'Send counter-offer'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Offers the user made as a buyer                                      */
/* ------------------------------------------------------------------ */

export function SentOfferRow({
  offer, onCancel, isCancelling, onAcceptCounter, onDeclineCounter, isRespondingToCounter, focused,
}: {
  offer: BuyerOffer;
  onCancel: (id: string) => void;
  isCancelling: boolean;
  onAcceptCounter: (id: string) => void;
  onDeclineCounter: (id: string) => void;
  isRespondingToCounter: boolean;
  focused?: boolean;
}) {
  const isPending = offer.status === 'pending';
  const isCountered = offer.status === 'countered' && offer.counter_amount != null;
  const asking = offer.listing?.price_sale ?? null;
  const deadline = offerDeadline(offer);
  const agreed = offer.status === 'accepted' ? offer.agreed_amount : null;

  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focused]);

  return (
    <OfferFrame
      frameRef={ref}
      id={offer.id}
      focused={focused}
      image={offer.listing?.cover_image_url ?? null}
      listingHref={`/listing/${offer.listing_id}`}
      title={offer.listing?.title || 'Listing'}
      subtitle={`${isCountered ? `You offered ${dollars(offer.offer_amount)} · ` : ''}Sent ${new Date(offer.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
      status={pill(SENT_STATUS, offer.status)}
      amount={dollars(isCountered ? offer.counter_amount : agreed ?? offer.offer_amount)}
      amountNote={isCountered ? 'Seller’s counter' : percentOf(offer.offer_amount, asking)}
      footerLeft={
        isPending ? <Expiry deadline={deadline} />
          : isCountered ? <Expiry deadline={deadline} label="Counter expires" />
          : offer.status === 'accepted' ? <span className="text-[12.5px] text-[#5E5953]">Nothing has been charged. Prepare the invoice to continue.</span>
          : undefined
      }
      actions={
        isCountered ? (
          <>
            <button type="button" className={btn.outlineMd} onClick={() => onDeclineCounter(offer.id)} disabled={isRespondingToCounter}>Decline</button>
            <button type="button" className={btn.solid} onClick={() => onAcceptCounter(offer.id)} disabled={isRespondingToCounter}>
              {isRespondingToCounter ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
              Accept {dollars(offer.counter_amount)}
            </button>
          </>
        ) : offer.status === 'accepted' && agreed ? (
          <Link to={`/purchase-request/${offer.listing_id}?offer=${offer.id}`} className={btn.solid}>
            Prepare invoice · {dollars(agreed)}
          </Link>
        ) : isPending ? (
          <button type="button" className={btn.text} onClick={() => onCancel(offer.id)} disabled={isCancelling}>
            {isCancelling ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : 'Withdraw offer'}
          </button>
        ) : (
          <Link to={`/listing/${offer.listing_id}`} className={btn.text}>View listing</Link>
        )
      }
    >
      {isCountered && offer.counter_message && <Quote who="Seller" text={offer.counter_message} />}
      {offer.status === 'declined' && offer.seller_response && <Quote who="Seller" text={offer.seller_response} />}
    </OfferFrame>
  );
}
