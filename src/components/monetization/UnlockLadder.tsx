import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Crown, Loader2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionConsent } from '@/hooks/useSubscriptionConsent';
import {
  buildUnlockOptions,
  type UnlockOption,
} from '@/lib/monetization/unlockLadder';
import {
  monetizationProductUrl,
  startMonetizationCheckout,
} from '@/lib/monetization/products';
import { cn } from '@/lib/utils';

type Props = {
  slug: string;
  eyebrow?: string;
  headline?: string;
  subhead?: string;
  className?: string;
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

/**
 * Progressive unlock ladder: shows the tool's one-time unlock and the
 * membership alternative that includes it. Resolves everything from the live
 * monetization catalog — no hardcoded prices.
 */
export function UnlockLadder({
  slug,
  eyebrow,
  headline,
  subhead,
  className,
  tone = 'dark',
  returnPath,
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { requireConsent, dialog: consentDialog } = useSubscriptionConsent();
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const options = buildUnlockOptions(slug);
  const light = tone === 'light';

  if (options.length === 0) return null;

  const handlePick = async (opt: UnlockOption) => {
    if (!user) {
      navigate(
        `/auth?mode=signin&next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
      );
      return;
    }
    if (busySlug) return;

    if (opt.billingType === 'recurring') {
      const consented = await requireConsent({
        planName: opt.product.name,
        amountCents: opt.priceCents,
        interval: opt.interval,
        context: opt.product.slug,
        returnPath: window.location.pathname,
      });
      if (!consented) return;
    }

    setBusySlug(opt.product.slug);
    try {
      const overrides = returnPath
        ? {
            successPath: `${returnPath}?purchase=success&product=${opt.product.slug}`,
            cancelPath: `${returnPath}?purchase=cancelled&product=${opt.product.slug}`,
          }
        : {};
      await startMonetizationCheckout(opt.product, overrides);
    } catch (err) {
      toast({
        title: 'Could not start checkout',
        description:
          err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
      setBusySlug(null);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {(eyebrow || headline || subhead) && (
        <div className="text-center space-y-1">
          {eyebrow && (
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary">
              {eyebrow}
            </p>
          )}
          {headline && (
            <h3
              className={cn(
                'text-xl font-semibold tracking-tight',
                light ? 'text-foreground' : 'text-white',
              )}
            >
              {headline}
            </h3>
          )}
          {subhead && (
            <p
              className={cn(
                'text-sm',
                light ? 'text-muted-foreground' : 'text-white/55',
              )}
            >
              {subhead}
            </p>
          )}
        </div>
      )}

      <div
        className={cn(
          'grid gap-4',
          options.length > 1 ? 'md:grid-cols-2' : 'max-w-md mx-auto',
        )}
      >
        {options.map((opt) => {
          const url = monetizationProductUrl(opt.product);
          const busy = busySlug === opt.product.slug;
          return (
            <div
              key={opt.product.slug}
              className={cn(
                'relative rounded-2xl border p-5 transition-colors',
                light
                  ? 'bg-card text-card-foreground shadow-[0_1px_2px_rgba(24,20,16,0.04),0_10px_28px_-18px_rgba(24,20,16,0.28)]'
                  : 'bg-white/[0.04]',
                opt.recommended
                  ? light
                    ? 'border-primary/50 ring-1 ring-primary/20'
                    : 'border-primary/50 ring-1 ring-primary/20'
                  : light
                    ? 'border-border'
                    : 'border-white/10',
              )}
            >
              {opt.recommended && (
                <Badge className="absolute -top-2.5 left-4 bg-primary text-primary-foreground border-0">
                  Best value
                </Badge>
              )}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {opt.kind === 'membership' && (
                      <Crown className="h-4 w-4 text-primary" aria-hidden />
                    )}
                    <h4
                      className={cn(
                        'font-semibold',
                        light ? 'text-foreground' : 'text-white',
                      )}
                    >
                      {opt.product.name}
                    </h4>
                  </div>
                  <p
                    className={cn(
                      'text-xs mt-0.5',
                      light ? 'text-muted-foreground' : 'text-white/50',
                    )}
                  >
                    {opt.kind === 'membership'
                      ? 'Recurring membership'
                      : 'One-time unlock'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={cn(
                      'text-2xl font-bold',
                      light ? 'text-foreground' : 'text-white',
                    )}
                  >
                    {opt.priceLabel}
                  </p>
                  {opt.interval && (
                    <p
                      className={cn(
                        'text-[11px]',
                        light ? 'text-muted-foreground' : 'text-white/45',
                      )}
                    >
                      per {opt.interval}
                    </p>
                  )}
                </div>
              </div>

              <p
                className={cn(
                  'text-sm mt-3',
                  light ? 'text-muted-foreground' : 'text-white/65',
                )}
              >
                {opt.reason}
              </p>

              {opt.includes && opt.includes.length > 0 && (
                <ul
                  className={cn(
                    'mt-3 space-y-1.5 text-xs',
                    light ? 'text-muted-foreground' : 'text-white/55',
                  )}
                >
                  {opt.includes.slice(0, 4).map((inc) => (
                    <li key={inc} className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
                      {inc}
                    </li>
                  ))}
                </ul>
              )}

              <Button
                className="w-full mt-4"
                variant={opt.recommended ? 'cta' : 'default'}
                disabled={!url || busy || busySlug !== null}
                onClick={() => void handlePick(opt)}
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden />
                    Opening checkout...
                  </>
                ) : opt.billingType === 'recurring' ? (
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
