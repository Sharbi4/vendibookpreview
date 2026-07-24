import { useState } from 'react';
import { Check, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  effectivePriceCents,
  formatUsd,
  startMonetizationCheckout,
  type MonetizationProduct,
} from '@/lib/monetization/products';
import { trackLeadEvent } from '@/lib/leadTracking';

interface Props {
  product: MonetizationProduct;
  listingId?: string;
  recommended?: boolean;
  ctaLabel?: string;
  successPath?: string;
  cancelPath?: string;
  onBeforeCheckout?: () => Promise<boolean> | boolean;
}

/**
 * Reusable pricing card. Trust-focused, no dark patterns:
 * - Always shows what the user receives, duration, refund policy, and whether the charge is recurring.
 * - No pre-checked options.
 */
export function ProductPricingCard({
  product,
  listingId,
  recommended,
  ctaLabel,
  successPath,
  cancelPath,
  onBeforeCheckout,
}: Props) {
  const [busy, setBusy] = useState(false);
  const price = effectivePriceCents(product);
  const recurring = product.billing_type === 'recurring';

  const handleClick = async () => {
    try {
      if (onBeforeCheckout) {
        const ok = await onBeforeCheckout();
        if (!ok) return;
      }
      setBusy(true);
      trackLeadEvent('checkout_started', {
        product_slug: product.slug,
        listing_id: listingId,
        surface: 'product_pricing_card',
      });
      const { url } = await startMonetizationCheckout({
        productSlug: product.slug,
        listingId,
        successPath,
        cancelPath,
      });
      window.location.href = url;
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Could not start checkout');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border p-6 backdrop-blur-sm transition',
        recommended
          ? 'border-orange-400/60 bg-orange-500/5 shadow-[0_0_0_1px_rgba(251,146,60,0.15)]'
          : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]',
      )}
    >
      {recommended && (
        <Badge className="absolute -top-3 right-6 bg-orange-500 text-white">Most popular</Badge>
      )}
      <h3 className="text-lg font-semibold text-foreground">{product.name}</h3>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-foreground">{formatUsd(price)}</span>
        {recurring && <span className="text-sm text-muted-foreground">/month</span>}
      </div>
      {product.description && (
        <p className="mt-3 text-sm text-muted-foreground">{product.description}</p>
      )}

      <ul className="mt-4 space-y-2 text-sm">
        {product.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
            <span className="text-foreground/90">{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 space-y-1 text-xs text-muted-foreground">
        {product.duration_days && (
          <p>Includes {product.duration_days} days of coverage.</p>
        )}
        {recurring && <p>Recurring monthly charge. Cancel anytime.</p>}
        {!recurring && <p>One-time charge. No recurring billing.</p>}
        {product.refund_policy && <p>Refunds: {product.refund_policy}</p>}
      </div>

      <div className="mt-6 flex-1" />
      <Button
        onClick={handleClick}
        disabled={busy}
        className={cn(
          'w-full',
          recommended ? 'bg-orange-500 hover:bg-orange-500/90 text-white' : '',
        )}
        variant={recommended ? 'default' : 'outline'}
      >
        {busy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <>
            {ctaLabel ?? (recurring ? 'Start plan' : 'Purchase')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}

export default ProductPricingCard;
