import { productCheckoutUrl } from '@/lib/payments/hostedCheckout';
import { useMemo, useState } from 'react';
import { useAutoPopup } from '@/hooks/useAutoPopup';
import { Flame, TrendingUp, Eye, Award, Loader2, X, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PayPalMonogram } from '@/components/brand/ProviderLogos';
import { useToast } from '@/hooks/use-toast';
import { isListingFeatured } from '@/lib/featured';
import { reportError } from '@/lib/errorReporter';
import { useCatalogPrice } from '@/hooks/useCatalogPrices';
import { ACTIVE_PRODUCT_SLUGS } from '@/lib/monetization/catalogPricing';

interface BoostCandidate {
  id: string;
  title: string;
  status: string;
  featured_enabled?: boolean | null;
  featured_expires_at?: string | null;
}

interface BoostListingPromptProps {
  listings: BoostCandidate[];
  userId: string | undefined;
}

const SUPPRESS_KEY_PREFIX = 'vendi_boost_prompt_dismissed_';
// Don't re-prompt the same user for 7 days after they dismiss
const SUPPRESS_DAYS = 7;
/** Show one minute after dashboard entry, never on top of another popup. */
const BOOST_PROMPT_DELAY_MS = 60_000;

const perks = [
  {
    icon: TrendingUp,
    title: '3× more visibility',
    description: 'Top of search & category pages.',
  },
  {
    icon: Eye,
    title: 'Front-page Featured rail',
    description: 'Premium placement on the homepage.',
  },
  {
    icon: Award,
    title: 'Featured badge',
    description: 'Stands out on every card and detail page.',
  },
];

/**
 * Auto-opens once per session for hosts who have at least one published
 * listing that is NOT currently boosted. Picks the most recent eligible
 * listing as the boost target. Dismissal is persisted per-user for 7 days.
 */
export const BoostListingPrompt = ({ listings, userId }: BoostListingPromptProps) => {
  const boostPrice = useCatalogPrice(ACTIVE_PRODUCT_SLUGS.featuredBoost);
  const durationLabel = boostPrice.durationDays ? `${boostPrice.durationDays} days` : 'one-time';
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Find the best candidate: published AND not currently featured.
  const candidate = useMemo<BoostCandidate | null>(() => {
    const eligible = listings.filter(
      (l) => l.status === 'published' && !isListingFeatured(l as any)
    );
    if (eligible.length === 0) return null;
    return eligible[0];
  }, [listings]);

  // Recently dismissed hosts are skipped entirely.
  const suppressed = useMemo(() => {
    if (!userId) return true;
    try {
      const dismissedAt = localStorage.getItem(`${SUPPRESS_KEY_PREFIX}${userId}`);
      if (!dismissedAt) return false;
      return Date.now() - Number(dismissedAt) < SUPPRESS_DAYS * 24 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  }, [userId]);

  // Opens one minute after the dashboard loads, and only once every other
  // auto-popup (welcome, PayPal partner, verification, consent) has closed.
  const { open, close } = useAutoPopup('boost-listing-prompt', {
    delayMs: BOOST_PROMPT_DELAY_MS,
    ready: !!userId && !!candidate && !suppressed,
  });

  const handleDismiss = () => {
    if (userId) {
      try {
        localStorage.setItem(`${SUPPRESS_KEY_PREFIX}${userId}`, String(Date.now()));
      } catch {}
    }
    close();
  };

  const handleBoost = async () => {
    if (!candidate) return;
    setIsLoading(true);
    try {
      const data = { url: productCheckoutUrl(ACTIVE_PRODUCT_SLUGS.featuredBoost, candidate.id) };
      const popup = window.open(data.url, '_blank');
      if (!popup || popup.closed) {
        toast({
          title: 'Popup blocked',
          description: 'Allow popups for Vendibook, then try again.',
          variant: 'destructive',
        });
        return;
      }
      handleDismiss();
    } catch (err) {
      const { referenceCode } = await reportError({
        action: 'boost.checkout.init',
        endpoint: '/functions/v1/create-featured-checkout',
        errorType: 'UnhandledCheckoutError',
        errorMessage: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        listingId: candidate.id,
      });
      toast({
        title: 'Could not start checkout',
        description: `Please try again or contact support. Reference: ${referenceCode}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!candidate) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleDismiss(); }}>
      <DialogContent className="sm:max-w-lg overflow-hidden rounded-2xl border border-white/12 bg-[#08080a]/95 backdrop-blur-2xl p-0 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(60%_100%_at_50%_0%,hsl(14,100%,57%,0.2),transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_35%,rgba(255,255,255,0.05)_50%,transparent_65%)]"
        />

        <div className="relative p-6">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-[hsl(14,100%,57%)]/12 ring-1 ring-[hsl(14,100%,57%)]/35 flex items-center justify-center shadow-[0_0_30px_-10px_hsl(14,100%,57%)]">
                <Flame className="h-5 w-5 text-[hsl(14,100%,62%)]" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Featured boost · {durationLabel}
              </span>
            </div>
            <DialogTitle className="text-2xl font-semibold tracking-tight">
              Boost your listing to the top
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              30 days of premium placement for{' '}
              <span className="text-foreground">“{candidate.title}”</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 grid gap-2.5">
            {perks.map((perk) => (
              <div
                key={perk.title}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.06]"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(14,100%,57%)]/10 ring-1 ring-[hsl(14,100%,57%)]/25">
                  <perk.icon className="h-4 w-4 text-[hsl(14,100%,62%)]" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-medium text-foreground">{perk.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {perk.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                One-time · {durationLabel}
              </span>
              <span className="text-3xl font-semibold tracking-tight text-foreground">{boostPrice.label}</span>
            </div>
            {/* Sales tax is computed server-side at checkout (TaxJar, with a
                state-rate fallback), so the price shown here is pre-tax. */}
            <p className="mt-1 text-xs text-muted-foreground">
              Plus sales tax, calculated at checkout.
            </p>


            <Button
              variant="dark-shine"
              className="mt-4 h-12 w-full rounded-xl text-base"
              onClick={handleBoost}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Flame className="mr-2 h-4 w-4" />
              )}
              Boost this listing
            </Button>

            <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
              <PayPalMonogram className="h-4" />
              <span>Payments by PayPal</span>
              <span className="text-white/20">·</span>
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Secure checkout</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="mt-4 flex w-full items-center justify-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3 w-3" /> Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BoostListingPrompt;
