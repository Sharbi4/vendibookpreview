import { Truck, Package, MapPin, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FulfillmentKind = 'pickup' | 'delivery' | 'both' | 'on_site' | null;

export function normalizeFulfillment(value: unknown): FulfillmentKind {
  switch (value) {
    case 'pickup':
    case 'delivery':
    case 'both':
    case 'on_site':
      return value;
    default:
      return null;
  }
}

/** Short label used in chips and spec cells. */
export function fulfillmentLabel(value: unknown): string | null {
  switch (normalizeFulfillment(value)) {
    case 'pickup':
      return 'Pickup only';
    case 'delivery':
      return 'Delivery only';
    case 'both':
      return 'Pickup or delivery';
    case 'on_site':
      return 'On-site only';
    default:
      return null;
  }
}

/** One-line explanation shown under the label. */
export function fulfillmentDescription(value: unknown, isRental = false): string | null {
  switch (normalizeFulfillment(value)) {
    case 'pickup':
      return isRental
        ? 'You pick this up from the host and return it at the end of your rental.'
        : 'You arrange pickup from the seller. Exact pickup details are shared after your purchase is confirmed.';
    case 'delivery':
      return isRental
        ? 'The host delivers to your location within their delivery area.'
        : 'The seller delivers within their delivery area. Delivery cost is based on their rate.';
    case 'both':
      return isRental
        ? 'Pick it up yourself or have the host deliver it within their delivery area.'
        : 'Pick it up yourself or have the seller deliver within their delivery area.';
    case 'on_site':
      return 'This stays at its location — use it on-site. Nothing is picked up or delivered.';
    default:
      return null;
  }
}

const ICONS = {
  pickup: Package,
  delivery: Truck,
  both: Truck,
  on_site: Store,
} as const;

interface FulfillmentTypeBadgeProps {
  fulfillmentType?: string | null;
  isRental?: boolean;
  /** 'chip' = compact pill, 'panel' = labeled card with description */
  variant?: 'chip' | 'panel';
  className?: string;
}

export const FulfillmentTypeBadge = ({
  fulfillmentType,
  isRental = false,
  variant = 'chip',
  className,
}: FulfillmentTypeBadgeProps) => {
  const kind = normalizeFulfillment(fulfillmentType);
  const label = fulfillmentLabel(fulfillmentType);
  if (!kind || !label) return null;

  const Icon = ICONS[kind] ?? MapPin;

  if (variant === 'chip') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full bg-card/60 px-3 py-1.5 text-xs font-medium ring-1 ring-border/60',
          className,
        )}
      >
        <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        {label}
      </span>
    );
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur-sm sm:p-5',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-4.5 w-4.5 text-primary" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {fulfillmentDescription(fulfillmentType, isRental)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FulfillmentTypeBadge;
