import { CheckCircle2, Truck, Zap, Tag } from 'lucide-react';
import { CATEGORY_LABELS, type ListingCategory } from '@/types/listing';

interface KeySpecsStripProps {
  category: ListingCategory;
  mode: 'rent' | 'sale';
  fulfillmentType?: string | null;
  instantBook?: boolean;
  inStock?: boolean;
  deliveryFee?: number | null;
}

/**
 * Dense "at a glance" spec strip directly below the title.
 * Amazon-style: pill chips with key buying signals.
 */
export const KeySpecsStrip = ({
  category,
  mode,
  fulfillmentType,
  instantBook,
  inStock = true,
  deliveryFee,
}: KeySpecsStripProps) => {
  const items: { icon: typeof CheckCircle2; label: string; tone: string }[] = [];

  if (inStock) {
    items.push({
      icon: CheckCircle2,
      label: mode === 'rent' ? 'Available now' : 'In stock',
      tone: 'text-emerald-400',
    });
  }

  if (instantBook && mode === 'rent') {
    items.push({
      icon: Zap,
      label: 'Instant Book',
      tone: 'text-amber-400',
    });
  }

  if (fulfillmentType === 'delivery' || fulfillmentType === 'both') {
    items.push({
      icon: Truck,
      label: deliveryFee ? `Delivery from $${deliveryFee}` : 'Delivery available',
      tone: 'text-sky-400',
    });
  } else if (fulfillmentType === 'pickup') {
    items.push({
      icon: Truck,
      label: 'Pickup',
      tone: 'text-foreground/70',
    });
  } else if (fulfillmentType === 'on_site') {
    items.push({
      icon: Truck,
      label: 'On-site use',
      tone: 'text-foreground/70',
    });
  }

  items.push({
    icon: Tag,
    label: CATEGORY_LABELS[category],
    tone: 'text-foreground/70',
  });

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card/50 border border-border/50 text-foreground/90"
          >
            <Icon className={`h-3.5 w-3.5 ${item.tone}`} />
            {item.label}
          </span>
        );
      })}
    </div>
  );
};

export default KeySpecsStrip;
