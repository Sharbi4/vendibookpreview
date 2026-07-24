import { Clock, Check, CircleDot, ShoppingBag, CreditCard, Truck, Package, Handshake, Banknote, type LucideIcon } from 'lucide-react';

export interface TxTimelineEvent {
  id: string;
  label: string;
  detail?: string;
  timestamp: string | null;
  state: 'complete' | 'active' | 'pending';
  icon: LucideIcon;
}

function fmt(ts: string | null | undefined): string | null {
  if (!ts) return null;
  try { return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return ts as string; }
}

/** Build the ordered event timeline from a sale_transactions row. */
export function buildTransactionTimeline(tx: Record<string, any>): TxTimelineEvent[] {
  const paid = tx.status === 'paid' || tx.status === 'confirmed' || tx.status === 'completed';
  const shipReq = tx.fulfillment_type === 'freight' || tx.fulfillment_type === 'delivery';
  const shipped = !!tx.shipped_at;
  const delivered = !!tx.delivered_at || tx.shipping_status === 'delivered';
  const buyerC = !!tx.buyer_confirmed_at;
  const sellerC = !!tx.seller_confirmed_at;
  const completed = tx.status === 'completed' || (buyerC && sellerC);
  const paidOut = !!tx.payout_completed_at;

  const events: TxTimelineEvent[] = [];

  events.push({
    id: 'created',
    label: 'Order placed',
    timestamp: fmt(tx.created_at),
    state: 'complete',
    icon: ShoppingBag,
  });

  events.push({
    id: 'payment',
    label: paid ? 'Payment received' : 'Payment pending',
    detail: tx.payment_intent_id ? `Ref ${String(tx.payment_intent_id).slice(-8)}` : undefined,
    timestamp: paid ? fmt(tx.updated_at ?? tx.created_at) : null,
    state: paid ? 'complete' : 'active',
    icon: CreditCard,
  });

  if (shipReq) {
    events.push({
      id: 'shipped',
      label: shipped ? 'Shipped' : 'Awaiting shipment',
      detail: tx.tracking_number ? `${tx.carrier ?? 'Carrier'} · ${tx.tracking_number}` : undefined,
      timestamp: fmt(tx.shipped_at),
      state: shipped ? 'complete' : paid ? 'active' : 'pending',
      icon: Truck,
    });
    events.push({
      id: 'delivered',
      label: delivered ? 'Delivered' : 'In transit',
      timestamp: fmt(tx.delivered_at),
      state: delivered ? 'complete' : shipped ? 'active' : 'pending',
      icon: Package,
    });
  } else {
    events.push({
      id: 'handoff',
      label: (buyerC && sellerC) ? 'Handoff confirmed'
        : (buyerC || sellerC) ? 'Partial handoff confirmation'
        : 'Handoff pending',
      detail: `Buyer ${buyerC ? '✓' : '…'} · Seller ${sellerC ? '✓' : '…'}`,
      timestamp: (buyerC && sellerC) ? fmt((tx.buyer_confirmed_at ?? '') > (tx.seller_confirmed_at ?? '') ? tx.buyer_confirmed_at : tx.seller_confirmed_at) : null,
      state: (buyerC && sellerC) ? 'complete' : paid ? 'active' : 'pending',
      icon: Handshake,
    });
  }

  events.push({
    id: 'completed',
    label: 'Sale completed',
    timestamp: completed ? fmt(tx.updated_at) : null,
    state: completed ? 'complete' : 'pending',
    icon: Check,
  });

  events.push({
    id: 'payout',
    label: paidOut ? 'Seller paid out' : 'Payout scheduled',
    detail: !paidOut && completed ? 'Standard 25-day sale payout window' : undefined,
    timestamp: fmt(tx.payout_completed_at),
    state: paidOut ? 'complete' : completed ? 'active' : 'pending',
    icon: Banknote,
  });

  return events;
}

export function TransactionTimeline({ events, className = '' }: { events: TxTimelineEvent[]; className?: string }) {
  return (
    <ol className={`relative ${className}`}>
      {events.map((e, i) => {
        const Icon = e.icon;
        const isLast = i === events.length - 1;
        const dot = e.state === 'complete' ? 'bg-emerald-500 text-black ring-4 ring-emerald-500/20'
          : e.state === 'active' ? 'bg-orange-500 text-black ring-4 ring-orange-500/25 animate-pulse'
          : 'bg-white/10 text-white/40 ring-4 ring-white/[0.03]';
        const rail = e.state === 'complete' ? 'bg-emerald-500/40'
          : e.state === 'active' ? 'bg-gradient-to-b from-orange-500/50 to-white/10'
          : 'bg-white/10';
        return (
          <li key={e.id} className="relative flex gap-4 pb-5 last:pb-0">
            {!isLast && <span aria-hidden className={`absolute left-[15px] top-8 h-full w-0.5 ${rail}`} />}
            <div className={`z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full ${dot}`}>
              {e.state === 'complete' ? <Check className="h-4 w-4" strokeWidth={3} />
                : e.state === 'active' ? <CircleDot className="h-4 w-4" />
                : <Icon className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h4 className={`text-sm font-semibold ${e.state === 'pending' ? 'text-white/50' : 'text-white'}`}>{e.label}</h4>
                {e.timestamp && (
                  <span className="inline-flex items-center gap-1 text-xs text-white/50">
                    <Clock className="h-3 w-3" />{e.timestamp}
                  </span>
                )}
              </div>
              {e.detail && <p className={`mt-0.5 text-xs ${e.state === 'pending' ? 'text-white/40' : 'text-white/60'}`}>{e.detail}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
