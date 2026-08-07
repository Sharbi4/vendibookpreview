import { productCheckoutUrl } from '@/lib/payments/hostedCheckout';
import { useState } from 'react';
import { Flame, TrendingUp, Eye, Award, Loader2, ShieldCheck, Star } from 'lucide-react';
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
import { reportError } from '@/lib/errorReporter';

interface FeaturedListingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  listingTitle: string;
}

const benefits = [
  {
    icon: TrendingUp,
    title: '3× more visibility',
    description: 'Featured listings sit at the top of search and category pages.',
  },
  {
    icon: Eye,
    title: 'Front-page Featured rail',
    description: 'Premium placement on the homepage discovery shelf.',
  },
  {
    icon: Award,
    title: '30 days of exposure',
    description: 'Your listing stays boosted for a full month.',
  },
  {
    icon: Star,
    title: 'Featured badge',
    description: 'A distinctive badge on every card and detail page.',
  },
];

export const FeaturedListingModal = ({
  open,
  onOpenChange,
  listingId,
  listingTitle,
}: FeaturedListingModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAddNow = async () => {
    setIsLoading(true);
    try {
      const data = { url: productCheckoutUrl('boost-featured-30', listingId) };
      const popup = window.open(data.url, '_blank');
      if (!popup || popup.closed) {
        toast({
          title: 'Popup blocked',
          description:
            'Your browser blocked the checkout tab. Allow popups for Vendibook, then click "Boost this listing" again.',
          variant: 'destructive',
        });
        return;
      }
      onOpenChange(false);
    } catch (err) {
      const { referenceCode } = await reportError({
        action: 'boost.checkout.init',
        endpoint: '/functions/v1/create-featured-checkout',
        errorType: 'UnhandledCheckoutError',
        errorMessage: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        listingId,
      });
      console.error('Featured checkout error:', err);
      toast({
        title: 'Something went wrong',
        description: `We couldn't start your Featured Boost checkout. Please try again or contact support. Reference: ${referenceCode}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg overflow-hidden border border-white/12 bg-[#08080a]/95 backdrop-blur-2xl p-0 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]">
        {/* Ember glow wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(60%_100%_at_50%_0%,hsl(14,100%,57%,0.22),transparent_70%)]"
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
                Featured boost · 30 days
              </span>
            </div>
            <DialogTitle className="text-2xl font-semibold tracking-tight">
              Put this listing in front of more buyers
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              Boost <span className="text-foreground">“{listingTitle}”</span> to the top of search,
              category pages, and the homepage Featured rail.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 grid gap-2.5">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.06]"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(14,100%,57%)]/10 ring-1 ring-[hsl(14,100%,57%)]/25">
                  <benefit.icon className="h-4 w-4 text-[hsl(14,100%,62%)]" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-medium text-foreground">{benefit.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                One-time · 30 days
              </span>
              <span className="text-3xl font-semibold tracking-tight text-foreground">$30</span>
            </div>

            <Button
              variant="dark-shine"
              className="mt-4 h-12 w-full rounded-xl text-base"
              onClick={handleAddNow}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
