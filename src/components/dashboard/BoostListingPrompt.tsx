import { useEffect, useMemo, useState } from 'react';
import { Star, TrendingUp, Eye, Award, Loader2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { isListingFeatured } from '@/lib/featured';
import { reportError } from '@/lib/errorReporter';

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

/**
 * Auto-opens once per session for hosts who have at least one published
 * listing that is NOT currently boosted. Picks the most recent eligible
 * listing as the boost target. Dismissal is persisted per-user for 7 days.
 */
export const BoostListingPrompt = ({ listings, userId }: BoostListingPromptProps) => {
  const [open, setOpen] = useState(false);
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

  useEffect(() => {
    if (!userId || !candidate) return;
    const key = `${SUPPRESS_KEY_PREFIX}${userId}`;
    try {
      const dismissedAt = localStorage.getItem(key);
      if (dismissedAt) {
        const ageMs = Date.now() - Number(dismissedAt);
        if (ageMs < SUPPRESS_DAYS * 24 * 60 * 60 * 1000) return;
      }
    } catch {
      // localStorage unavailable — show anyway
    }
    // Slight delay so it doesn't fight with first paint / other modals
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [userId, candidate?.id]);

  const handleDismiss = () => {
    if (userId) {
      try {
        localStorage.setItem(`${SUPPRESS_KEY_PREFIX}${userId}`, String(Date.now()));
      } catch {}
    }
    setOpen(false);
  };

  const handleBoost = async () => {
    if (!candidate) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-featured-checkout', {
        body: { listing_id: candidate.id },
      });
      if (error) {
        const { referenceCode } = await reportError({
          action: 'boost.checkout.init',
          endpoint: '/functions/v1/create-featured-checkout',
          errorType: 'StripeCheckoutInitFailed',
          errorMessage: (error as any)?.message ?? String(error),
          status: (error as any)?.status,
          listingId: candidate.id,
        });
        toast({
          title: "Couldn't start Stripe Checkout",
          description: `Payments are temporarily unreachable. Try again, or boost from your listing card. Reference: ${referenceCode}`,
          variant: 'destructive',
        });
        return;
      }
      if (!data?.url) {
        const { referenceCode } = await reportError({
          action: 'boost.checkout.init',
          endpoint: '/functions/v1/create-featured-checkout',
          errorType: 'StripeCheckoutMissingUrl',
          errorMessage: 'No checkout URL returned',
          listingId: candidate.id,
        });
        toast({
          title: 'Checkout unavailable',
          description: `Stripe didn't return a link. Please try again. Reference: ${referenceCode}`,
          variant: 'destructive',
        });
        return;
      }
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
      console.error('Boost checkout error:', err);
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
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : handleDismiss())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
            Boost your listing to the top
          </DialogTitle>
          <DialogDescription>
            Get 30 days of premium placement for "{candidate.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <TrendingUp className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h4 className="font-medium text-foreground text-sm">3× more visibility</h4>
              <p className="text-xs text-muted-foreground">Top of search & category pages.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Eye className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h4 className="font-medium text-foreground text-sm">Front-page Featured rail</h4>
              <p className="text-xs text-muted-foreground">Premium placement on the homepage.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Award className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h4 className="font-medium text-foreground text-sm">Featured ⭐ badge</h4>
              <p className="text-xs text-muted-foreground">Stands out on every card and detail page.</p>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">One-time · 30 days</span>
            <span className="text-2xl font-bold text-foreground">$30</span>
          </div>
          <Button
            variant="dark-shine"
            className="w-full rounded-xl h-12"
            onClick={handleBoost}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Star className="h-4 w-4 mr-2" />
            )}
            Boost this listing
          </Button>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full text-xs text-muted-foreground hover:text-foreground mt-3 flex items-center justify-center gap-1"
          >
            <X className="h-3 w-3" /> Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BoostListingPrompt;
