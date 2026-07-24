import { CreditCard, Truck, Package, CheckCircle2, AlertTriangle, XCircle, Clock, RefreshCw, type LucideIcon } from 'lucide-react';

export type PillTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusPill {
  label: string;
  tone: PillTone;
  icon: LucideIcon;
}

const TONE: Record<PillTone, string> = {
  success: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/25',
  warning: 'bg-amber-500/15 text-amber-300 ring-amber-500/25',
  danger: 'bg-rose-500/15 text-rose-300 ring-rose-500/25',
  info: 'bg-sky-500/15 text-sky-300 ring-sky-500/25',
  neutral: 'bg-white/5 text-white/70 ring-white/10',
};

export function StatusPillBadge({ pill }: { pill: StatusPill }) {
  const Icon = pill.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${TONE[pill.tone]}`}>
      <Icon className="h-3.5 w-3.5" />
      {pill.label}
    </span>
  );
}

export function paymentPill(status: string | null | undefined): StatusPill {
  switch (status) {
    case 'paid':
    case 'confirmed':
    case 'completed':
      return { label: 'Payment received', tone: 'success', icon: CreditCard };
    case 'pending':
      return { label: 'Payment pending', tone: 'warning', icon: Clock };
    case 'refunded':
      return { label: 'Refunded', tone: 'info', icon: RefreshCw };
    case 'disputed':
      return { label: 'Disputed', tone: 'danger', icon: AlertTriangle };
    case 'cancelled':
    case 'failed':
      return { label: 'Payment failed', tone: 'danger', icon: XCircle };
    default:
      return { label: status ?? 'Awaiting payment', tone: 'neutral', icon: CreditCard };
  }
}

export function fulfillmentPill(args: {
  fulfillmentType: string | null | undefined;
  shippingStatus: string | null | undefined;
  buyerConfirmed: boolean;
  sellerConfirmed: boolean;
  status: string | null | undefined;
}): StatusPill {
  const { fulfillmentType, shippingStatus, buyerConfirmed, sellerConfirmed, status } = args;

  if (status === 'completed' || (buyerConfirmed && sellerConfirmed)) {
    return { label: 'Handoff complete', tone: 'success', icon: CheckCircle2 };
  }

  if (fulfillmentType === 'freight' || fulfillmentType === 'delivery') {
    switch (shippingStatus) {
      case 'delivered': return { label: 'Delivered', tone: 'success', icon: Package };
      case 'in_transit': return { label: 'In transit', tone: 'info', icon: Truck };
      case 'ready': return { label: 'Ready to ship', tone: 'warning', icon: Package };
      case 'label_created': return { label: 'Label created', tone: 'info', icon: Package };
      default: return { label: 'Awaiting shipment', tone: 'neutral', icon: Truck };
    }
  }

  if (fulfillmentType === 'pickup' || fulfillmentType === 'in_person') {
    if (buyerConfirmed && !sellerConfirmed) return { label: 'Buyer confirmed', tone: 'info', icon: CheckCircle2 };
    if (sellerConfirmed && !buyerConfirmed) return { label: 'Seller confirmed', tone: 'info', icon: CheckCircle2 };
    return { label: 'Awaiting pickup', tone: 'warning', icon: Package };
  }

  return { label: 'Awaiting handoff', tone: 'neutral', icon: Package };
}
