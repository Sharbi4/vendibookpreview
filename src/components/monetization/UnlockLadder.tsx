import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Crown, Loader2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useSubscriptionConsent } from '@/hooks/useSubscriptionConsent';
import { trackLeadEvent } from '@/lib/leadTracking';
import {
  resolveUnlockLadder,
  type LadderOption,
} from '@/lib/monetization/unlockLadder';
import type { MonetizationProduct } from '@/lib/monetization/products';
import { cn } from '@/lib/utils';

type Props = {
  toolSlug: string;
  /** Analytics surface, e.g. "tool_gate", "pricepilot_page". */
  surface?: string;
  headline?: string;
  subhead?: string;
  className?: string;
  /** Called when a checkout has been handed off (e.g. to close a dialog). */
  onCheckoutStarted?: () => void;
  /**
   * 'dark' (default) matches the satin-lux dashboard theme.
   * 'light' renders for ivory / sale-light surfaces (white cards, charcoal text).
   */
  tone?: 'dark' | 'light';
  /**
   * When set (e.g. '/tools/pricepilot'), PayPal returns the buyer to this path
   * with ?purchase=success|cancelled instead of the product's default route.
   * Keeps tool unlocks landing back on the tool.
   */
  returnPath?: string;
};

async function fetchActiveProducts(): Promise<MonetizationProduct[]> {
  const { data, error } = await (supabase as any)
    .from('monetization_products')
    .select('*')
    .eq('is_active', true);
  if (error) throw error;
  return (data ?? []) as MonetizationProduct[];
}

/**
 * Progressive unlock ladder: the tool's cheapest unlock plus the best-value
 * membership that includes it (max two options, cheapest first). Resolves
 * everything from the live monetization catalog — no hardcoded prices.
 */
export function UnlockLadder({
  toolSlug,
  surface,
  headline,
  subhead,
  className,
  onCheckoutStarted,
  tone = 'dark',
  returnPath,
}: Props) {
  const { requestCheckout, dialog: consentDialog, pendingSlug } = useSubscriptionConsent();
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const { data: products, isLoading } = useQuery({
    queryKey: ['monetization-products-active'],
    queryFn: fetchActiveProducts,
    staleTime: 5 * 60_000,
  });

  const options = products ? resolveUnlockLadder(toolSlug, products, 'free') : [];
  const light = tone === 'light';

  if (isLoading) {
    return (
      <div className={cn('flex justify-center py-10', className)}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading unlock options" />
      </div>
    );
  }
  if (options.length === 0) return null;

  const handlePick = async (opt: LadderOption) => {
    if (busySlug || pendingSlug) return;
    setBusySlug(opt.product.slug);
    if (surface) {
      trackLeadEvent('tool_unlock_clicked', {
        tool_slug: toolSlug,
        surface,
        product_slug: opt.product.slug,
        kind: opt.kind,
      });
    }
    const overrides = returnPath
      ? {
          successPath: `${returnPath}?purchase=success&product=${opt.product.slug}`,
          cancelPath: `${returnPath}?purchase=cancelled&product=${opt.product.slug}`,
        }
      : {};
    // requestCheckout opens the recurring-billing consent dialog first when
    // needed, then hands off to PayPal (and navigates away on success).
    void requestCheckout(opt.product, overrides).finally(() => setBusySlug(null));
    onCheckoutStarted?.();
  };

  return (
    <div className={cn('space-y-4', className)}>
      {(headline || subhead) && (
        <div className="text-center space-y-1">
          {headline && (
            <h3 className={cn('text-xl font-semibold tracking-tight', light ? 'text-foreground' : 'text-white')}>
              {headline}
            </h3>
          )}
          {subhead && (
            <p className={cn('text-sm', light ? 'text-muted-foreground' : 'text-white/55')}>{subhead}</p>
          )}
        </div>
      )}

      <div className={cn('grid gap-4', options.length > 1 ? 'md:grid-cols-2' : 'max-w-md mx-auto')}>
        {options.map((opt) => {
          const busy = busySlug === opt.product.slug || pendingSlug === opt.product.slug;
          const isMembership = opt.kind === 'subscription' || opt.kind === 'upgrade';
          return (
            <div
              key={opt.product.slug}
              className={cn(
                'relative rounded-2xl border p-5 transition-colors',
                light
                  ? 'bg-card text-card-foreground shadow-[0_1px_2px_rgba(24,20,16,0.04),0_10px_28px_-18px_rgba(24,20,16,0.28)]'
                  : 'bg-white/[0.04]',
                opt.bestValue
                  ? 'border-primary/50 ring-1 ring-primary/20'
                  : light
                    ? 'border-border'
                    : 'border-white/10',
              )}
            >
              {opt.bestValue && (
                <Badge className="absolute -top-2.5 left-4 bg-primary text-primary-foreground border-0">
                  Best value
                </Badge>
              )}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {isMembership && <Crown className="h-4 w-4 text-primary" aria-hidden />}
                    <h4 className={cn('font-semibold', light ? 'text-foreground' : 'text-white')}>
                      {opt.productName}
                    </h4>
                  </div>
                  <p className={cn('text-xs mt-0.5', light ? 'text-muted-foreground' : 'text-white/50')}>
                    {isMembership ? 'Recurring membership' : 'One-time unlock'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn('text-2xl font-bold', light ? 'text-foreground' : 'text-white')}>
                    {opt.priceLabel}
                  </p>
                  <p className={cn('text-[11px]', light ? 'text-muted-foreground' : 'text-white/45')}>
                    {opt.cadenceLabel}
                  </p>
                </div>
              </div>

              <p className={cn('text-sm mt-3', light ? 'text-muted-foreground' : 'text-white/65')}>
                {opt.reason}
              </p>

              <Button
                className="w-full mt-4"
                variant={opt.bestValue ? 'cta' : 'default'}
                disabled={busy || busySlug !== null || pendingSlug !== null}
                onClick={() => void handlePick(opt)}
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden />
                    Opening checkout...
                  </>
                ) : isMembership ? (
                  `Start ${opt.product.name}`
                ) : (
                  `Unlock once, ${opt.priceLabel}`
                )}
              </Button>
            </div>
          );
        })}
      </div>

      <p
        className={cn(
          'text-center text-xs flex items-center justify-center gap-1.5',
          light ? 'text-muted-foreground' : 'text-white/45',
        )}
      >
        <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
        Secure PayPal checkout. Cancel memberships any time.
      </p>
      {consentDialog}
    </div>
  );
}

export default UnlockLadder;
