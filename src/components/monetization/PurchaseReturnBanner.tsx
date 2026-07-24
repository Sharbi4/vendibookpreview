import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getReturnRoute } from '@/lib/monetization/returnRoutes';

/**
 * Renders a product-specific "what happens next" panel when the user returns
 * from a monetization checkout. Prevents dumping users on a generic dashboard.
 *
 * Reads `?purchase=success|cancelled&product=<slug>&listing=<id>` from the URL.
 */
export function PurchaseReturnBanner() {
  const [params, setParams] = useSearchParams();
  const purchase = params.get('purchase');
  const productSlug = params.get('product') || '';
  const listingId = params.get('listing') || undefined;
  const [dismissed, setDismissed] = useState(false);

  const content = getReturnRoute(productSlug, { listingId });

  useEffect(() => {
    // Strip the query so a back/forward navigation doesn't re-fire the banner.
    if (purchase && !dismissed) {
      const t = setTimeout(() => {
        const next = new URLSearchParams(params);
        next.delete('purchase');
        next.delete('product');
        next.delete('listing');
        setParams(next, { replace: true });
      }, 200);
      return () => clearTimeout(t);
    }
  }, [purchase, dismissed, params, setParams]);

  if (!purchase || dismissed) return null;

  if (purchase === 'cancelled') {
    return (
      <Alert className={cn('mb-4 border-border/70 bg-card/70 backdrop-blur-sm')}>
        <XCircle className="h-4 w-4 text-muted-foreground" aria-hidden />
        <AlertTitle>Checkout cancelled</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          No charge was made. Your listing keeps working — you can revisit
          upgrades any time.
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
        {content.subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{content.subtitle}</p>
        )}
        <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
          {content.steps.map((s) => (
            <li key={s.title} className="flex items-start gap-2">
              <span
                className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/70 shrink-0"
                aria-hidden
              />
              <span>
                <span className="text-foreground/90">{s.title}</span>
                {s.hint && (
                  <span className="block text-xs text-muted-foreground/80">
                    {s.hint}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" asChild>
            <a href={content.ctaHref}>
              {content.ctaLabel}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
            </a>
          </Button>
          {content.secondary && (
            <Button size="sm" variant="outline" asChild>
              <a href={content.secondary.href}>{content.secondary.label}</a>
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDismissed(true)}
            className="ml-auto text-muted-foreground"
          >
            Dismiss
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

export default PurchaseReturnBanner;
