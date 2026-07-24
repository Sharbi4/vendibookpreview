import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NEXT_STEPS_BY_SLUG: Record<string, { title: string; steps: string[]; ctaLabel: string; ctaHref: string }> = {
  'seller-pro': {
    title: 'Seller Pro is active',
    steps: [
      'Add three more photos to strengthen your listing',
      'Refine your listing description with the built-in writer',
      'Set your response goals so buyers see a fast-reply badge',
    ],
    ctaLabel: 'Open my listing',
    ctaHref: '/host/listings',
  },
  'featured-listing-30': {
    title: 'Your listing is featured for 30 days',
    steps: [
      'Featured placement starts within minutes',
      'You can track impressions and inquiries in Insights',
      'We\'ll email a performance snapshot when the boost ends',
    ],
    ctaLabel: 'View insights',
    ctaHref: '/host/listings',
  },
  'white-glove-seller': {
    title: 'White-glove support is on the way',
    steps: [
      'Our team will reach out within one business day',
      'We\'ll review your listing, photos, and pricing together',
      'You\'ll receive a personalized action plan by email',
    ],
    ctaLabel: 'Prepare your listing',
    ctaHref: '/host/listings',
  },
};

const GENERIC = {
  title: 'Purchase complete',
  steps: [
    'A receipt is on the way to your email',
    'Your new benefits are being activated now',
    'You can manage everything from your dashboard',
  ],
  ctaLabel: 'Go to dashboard',
  ctaHref: '/dashboard',
};

/**
 * Renders a specific "what happens next" panel when the user returns from a
 * monetization checkout. Prevents dumping users on a generic dashboard after payment.
 */
export function PurchaseReturnBanner() {
  const [params, setParams] = useSearchParams();
  const purchase = params.get('purchase');
  const productSlug = params.get('product') || '';
  const [dismissed, setDismissed] = useState(false);

  const content = useMemo(() => NEXT_STEPS_BY_SLUG[productSlug] ?? GENERIC, [productSlug]);

  useEffect(() => {
    // Auto-clear the query so a reload doesn't re-show the banner forever.
    if (purchase && !dismissed) {
      const t = setTimeout(() => {
        // Leave banner visible; strip the query so back/forward doesn't trigger it again.
        const next = new URLSearchParams(params);
        next.delete('purchase');
        next.delete('product');
        setParams(next, { replace: true });
      }, 200);
      return () => clearTimeout(t);
    }
  }, [purchase, dismissed, params, setParams]);

  if (!purchase || dismissed) return null;

  if (purchase === 'cancelled') {
    return (
      <Alert
        className={cn(
          'mb-4 border-border/70 bg-card/70 backdrop-blur-sm',
        )}
      >
        <XCircle className="h-4 w-4 text-muted-foreground" aria-hidden />
        <AlertTitle>Checkout cancelled</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          No charge was made. You can revisit upgrades any time — your listing keeps working in the meantime.
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={() => setDismissed(true)}>
              Dismiss
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert
      className={cn(
        'mb-4 border-primary/40 bg-card/70 backdrop-blur-sm ring-1 ring-primary/15',
      )}
      role="status"
    >
      <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
      <AlertTitle className="text-foreground">{content.title}</AlertTitle>
      <AlertDescription>
        <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
          {content.steps.map((s) => (
            <li key={s} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/70 shrink-0" aria-hidden />
              <span>{s}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" asChild>
            <a href={content.ctaHref}>
              {content.ctaLabel}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
            </a>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
            Dismiss
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

export default PurchaseReturnBanner;
