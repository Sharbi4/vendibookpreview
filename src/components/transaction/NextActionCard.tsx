import { ArrowRight, CheckCircle2, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface NextAction {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  onClick?: () => void;
  icon?: LucideIcon;
  waitingOnOther?: boolean;
  done?: boolean;
}

/** Decide the single next action for a given transaction and viewer role. */
export function computeNextAction(
  tx: Record<string, any>,
  role: 'buyer' | 'seller' | null,
): NextAction {
  const paid = tx.status === 'paid' || tx.status === 'confirmed' || tx.status === 'completed';
  const shipReq = tx.fulfillment_type === 'freight' || tx.fulfillment_type === 'delivery';
  const shipped = !!tx.shipped_at;
  const delivered = !!tx.delivered_at || tx.shipping_status === 'delivered';
  const buyerC = !!tx.buyer_confirmed_at;
  const sellerC = !!tx.seller_confirmed_at;
  const meC = role === 'buyer' ? buyerC : role === 'seller' ? sellerC : false;
  const themC = role === 'buyer' ? sellerC : role === 'seller' ? buyerC : false;
  const completed = tx.status === 'completed' || (buyerC && sellerC);

  if (tx.status === 'disputed') {
    return {
      title: 'Dispute in review',
      description: 'Vendibook support has this transaction on hold. Watch your email for next steps.',
      ctaLabel: 'Contact support',
      ctaHref: '/support',
    };
  }
  if (tx.status === 'refunded') {
    return { title: 'Refund processed', description: 'This transaction was refunded.', done: true };
  }
  if (completed && tx.payout_completed_at) {
    return { title: 'All done', description: 'Nothing left to do — the sale is complete and paid out.', done: true };
  }
  if (completed) {
    return {
      title: role === 'seller' ? 'Payout on the way' : 'Sale complete',
      description: role === 'seller'
        ? 'Funds are typically released within 24 hours of delivery confirmation.'
        : 'Thanks — leave a review to help the next buyer.',
      ctaLabel: role === 'buyer' ? 'Leave a review' : undefined,
      ctaHref: role === 'buyer' && tx.listing_id ? `/listing/${tx.listing_id}?review=1` : undefined,
    };
  }

  if (!paid) {
    return role === 'buyer'
      ? {
          title: 'Complete your payment',
          description: 'Your order is on hold until payment is received.',
          ctaLabel: 'Pay now',
          ctaHref: `/checkout/${tx.listing_id}`,
        }
      : {
          title: 'Waiting on buyer payment',
          description: 'You will be notified as soon as the buyer pays.',
          waitingOnOther: true,
        };
  }

  if (shipReq && !shipped) {
    return role === 'seller'
      ? {
          title: 'Ship the order',
          description: 'Add carrier and tracking so the buyer can follow along.',
          ctaLabel: 'Add tracking',
          ctaHref: '/dashboard',
        }
      : {
          title: 'Waiting on shipment',
          description: 'The seller is preparing your order.',
          waitingOnOther: true,
        };
  }

  if (shipReq && shipped && !delivered) {
    return {
      title: 'In transit',
      description: tx.tracking_url ? 'Track your package with the carrier.' : 'Package is on its way.',
      ctaLabel: tx.tracking_url ? 'Track package' : undefined,
      ctaHref: tx.tracking_url ?? undefined,
    };
  }

  if (!meC) {
    return {
      title: role === 'buyer' ? 'Confirm you received it' : 'Confirm the handoff',
      description: 'Both parties confirm to release payout and close the sale.',
      ctaLabel: 'Confirm handoff',
      ctaHref: '/dashboard',
      icon: CheckCircle2,
    };
  }
  if (meC && !themC) {
    return {
      title: 'Waiting on the other party',
      description: role === 'buyer' ? 'The seller still needs to confirm.' : 'The buyer still needs to confirm.',
      waitingOnOther: true,
    };
  }

  return { title: 'On track', description: 'No action required right now.' };
}

export function NextActionCard({ action, className = '' }: { action: NextAction; className?: string }) {
  const Icon = action.icon;
  const tone = action.done ? 'emerald' : action.waitingOnOther ? 'white' : 'orange';
  const toneClasses =
    tone === 'emerald' ? 'border-emerald-500/30 bg-emerald-500/5'
    : tone === 'orange' ? 'border-orange-500/40 bg-orange-500/[0.06] shadow-[0_0_40px_-12px_rgba(249,115,22,0.35)]'
    : 'border-white/10 bg-white/[0.03]';
  const chipClasses =
    tone === 'emerald' ? 'bg-emerald-500/20 text-emerald-300'
    : tone === 'orange' ? 'bg-orange-500/20 text-orange-200'
    : 'bg-white/5 text-white/60';

  return (
    <div className={`rounded-2xl border p-5 ${toneClasses} ${className}`}>
      <div className="flex items-start gap-4">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${chipClasses}`}>
          {Icon ? <Icon className="h-5 w-5" /> : action.done ? <CheckCircle2 className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
            {action.done ? 'Complete' : action.waitingOnOther ? 'Waiting on them' : 'Your next step'}
          </div>
          <h3 className="mt-1 text-lg font-semibold text-white">{action.title}</h3>
          <p className="mt-1 text-sm text-white/70">{action.description}</p>
        </div>
        {action.ctaHref ? (
          action.ctaHref.startsWith('http') ? (
            <a
              href={action.ctaHref}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 self-center rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-orange-400"
            >
              {action.ctaLabel}
            </a>
          ) : (
            <Link
              to={action.ctaHref}
              className="shrink-0 self-center rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-orange-400"
            >
              {action.ctaLabel}
            </Link>
          )
        ) : action.ctaLabel && action.onClick ? (
          <button
            onClick={action.onClick}
            className="shrink-0 self-center rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-orange-400"
          >
            {action.ctaLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
