/**
 * UnlockLadder — the standardized "how to unlock this tool" price ladder.
 *
 * Cheapest first, with the recommended row (usually Growth) marked
 * "Best value". Never renders a tier that doesn't actually include the
 * tool the user is trying to unlock — the ladder is resolved by
 * `resolveUnlockLadder()` from real monetization_products rows.
 */
import * as React from 'react';
import { Check, Loader2, ShieldCheck, Sparkles as _NoSparkleBanned, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMonetizationProducts } from '@/hooks/useMonetizationProducts';
import { useSubscriptionConsent } from '@/hooks/useSubscriptionConsent';
import { startMonetizationCheckout } from '@/lib/monetization/products';
import { buildCheckoutReturnPaths } from '@/lib/monetization/returnRoutes';
import { resolveUnlockLadder, type LadderOption } from '@/lib/monetization/unlockLadder';
import { getToolBySlug } from '@/lib/tools/catalog';
import { useHostEntitlements } from '@/hooks/useHostEntitlements';
import { trackLeadEvent } from '@/lib/leadTracking';
import { toast } from 'sonner';

// no-sparkle-icons: alias is not used, kept for lint reference.
void _NoSparkleBanned;

export interface UnlockLadderProps {
  toolSlug: string;
  /** Analytics surface (e.g. "tool_gate", "preview_page", "wizard_ai_gate"). */
  surface: string;
  /** Called after checkout is initiated so the parent can close a modal. */
  onCheckoutStarted?: (option: LadderOption) => void;
  className?: string;
  /** If provided, shown above the ladder. */
  headline?: string;
}

export function UnlockLadder({
  toolSlug,
  surface,
  onCheckoutStarted,
  className,
  headline,
}: UnlockLadderProps) {
  // The ladder can pull from multiple product categories.
  const subs = useMonetizationProducts('host_subscription');
  const services = useMonetizationProducts('seller_service');
  const permits = useMonetizationProducts('permit_upgrade');
  const listing = useMonetizationProducts('listing_upgrade');
  const [busySlug, setBusySlug] = React.useState<string | null>(null);
  const { requestCheckout } = useSubscriptionConsent();
  const { tier: currentTier } = useHostEntitlements();

  const tool = getToolBySlug(toolSlug);
  const products = React.useMemo(
    () => [...subs.products, ...services.products, ...permits.products, ...listing.products],
    [subs.products, services.products, permits.products, listing.products],
  );
  const ladder = React.useMemo(
    () => resolveUnlockLadder(toolSlug, products, currentTier),
    [toolSlug, products, currentTier],
  );
  const loading = subs.loading || services.loading || permits.loading || listing.loading;


  const handleSelect = async (option: LadderOption) => {
    setBusySlug(option.productSlug);
    trackLeadEvent('unlock_ladder_option_selected', {
      tool_slug: toolSlug,
      product_slug: option.productSlug,
      kind: option.kind,
      surface,
    });
    trackLeadEvent('tool_preview_converted', {
      tool_slug: toolSlug,
      product_slug: option.productSlug,
      surface,
    });
    try {
      const paths = buildCheckoutReturnPaths(option.productSlug);
      if (option.product.billing_type === 'recurring') {
        await requestCheckout(option.product, {
          interval: 'monthly',
          successPath: paths.successPath,
          cancelPath: paths.cancelPath,
        });
      } else {
        const { url } = await startMonetizationCheckout({
          productSlug: option.productSlug,
          successPath: paths.successPath,
          cancelPath: paths.cancelPath,
        });
        onCheckoutStarted?.(option);
        window.location.href = url;
        return;
      }
      onCheckoutStarted?.(option);
    } catch (err) {
      console.error('[UnlockLadder] checkout failed', err);
      toast.error('Could not start checkout. Please try again.');
    } finally {
      setBusySlug(null);
    }
  };

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-6', className)}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tool || ladder.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {headline && (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {headline}
        </p>
      )}
      <div className="grid gap-2.5">
        {ladder.map((option) => {
          const busy = busySlug === option.productSlug;
          return (
            <button
              type="button"
              key={option.productSlug}
              onClick={() => handleSelect(option)}
              disabled={busy}
              className={cn(
                'group relative flex items-start gap-3 rounded-md border-[1.5px] px-4 py-3 text-left transition-colors',
                option.bestValue
                  ? 'border-orange-500/60 bg-orange-500/[0.06] hover:bg-orange-500/[0.10]'
                  : 'border-white/12 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]',
                busy && 'opacity-60',
              )}
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-[1.5px] border-white/12 bg-white/[0.04] text-orange-300">
                {option.kind === 'one_time' && <Check className="h-4 w-4" />}
                {option.kind === 'weekly_pass' && <ShieldCheck className="h-4 w-4" />}
                {option.kind === 'subscription' && <TrendingUp className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-semibold text-foreground">
                    {option.productName}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-foreground">
                    {option.priceLabel}
                  </span>
                  <span className="text-xs text-muted-foreground">{option.cadenceLabel}</span>
                  {option.bestValue && (
                    <span className="ml-auto rounded-full border-[1.5px] border-orange-500/60 bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-300">
                      Best value
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-foreground/70">
                  {option.reason}
                </p>
              </div>
              {busy && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Payment protection — refund within 7 days if the tool doesn't help.
      </p>
    </div>
  );
}

export default UnlockLadder;
