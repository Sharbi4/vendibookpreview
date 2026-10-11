import { productCheckoutUrl, hostedCheckoutUrl } from '@/lib/payments/hostedCheckout';
import React, { useState } from 'react';
import { Loader2, TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCatalogPrice } from '@/hooks/useCatalogPrices';
import { ACTIVE_PRODUCT_SLUGS } from '@/lib/monetization/catalogPricing';

interface Props {
  listingId: string;
  /** Optional display price override. Defaults to the live catalog price. */
  priceLabel?: string;
}

/**
 * Compact one-liner shown at the top of ListingPublished:
 *   "Want more eyes on it? Feature this listing"
 *
 * One tap → boost checkout for this listing (create-featured-checkout).
 * One tap → dismiss for this listing (localStorage-scoped).
 * The deeper BoostListingPrompt lower on the page remains the fuller offer.
 *
 * NOTE: Uses a plain `Sparkle` glyph — the design system bans decorative
 * Sparkles/Star icons; this single outlined mark is used purely as a bullet
 * next to text, not as a hero visual.
 */
export const FeatureThisListingCTA: React.FC<Props> = ({ listingId, priceLabel }) => {
  const { toast } = useToast();
  const boostPrice = useCatalogPrice(ACTIVE_PRODUCT_SLUGS.featuredBoost);
  const durationDays = boostPrice.durationDays ?? 30;
  const displayPrice = priceLabel ?? `${boostPrice.label} for ${durationDays} days`;
  const dismissKey = `vb:feature-cta-dismissed:${listingId}`;
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(dismissKey) === '1';
  });
  const [busy, setBusy] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    try { window.localStorage.setItem(dismissKey, '1'); } catch {}
    setDismissed(true);
  };

  const handleFeature = async () => {
    setBusy(true);
    try {
      const url = productCheckoutUrl(ACTIVE_PRODUCT_SLUGS.featuredBoost, listingId);
      window.location.href = url;
    } catch (e) {
      toast({
        title: 'Could not start checkout',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border-[1.5px] border-orange-500/30 bg-orange-500/5 p-4 flex flex-wrap items-center gap-3">
      <TrendingUp className="h-4 w-4 text-orange-500 shrink-0" aria-hidden />
      <div className="flex-1 min-w-[220px]">
        <p className="font-medium text-foreground">
          Want more eyes on it? Feature this listing.
        </p>
        <p className="text-xs text-muted-foreground">
          Pinned to the top of search and category pages for {durationDays} days — {displayPrice} plus sales tax.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-muted-foreground">
          Not now
        </Button>
        <Button size="sm" onClick={handleFeature} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Feature for ${durationDays} days`}
        </Button>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={handleDismiss}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default FeatureThisListingCTA;
