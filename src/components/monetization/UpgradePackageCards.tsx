import { useEffect, useState } from 'react';
import { Loader2, Check, ArrowRight, ShieldCheck, Headphones, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { TrustModule } from '@/components/journey';
import {
  effectivePriceCents,
  formatUsd,
  listProductsByCategory,
  type MonetizationProduct,
} from '@/lib/monetization/products';
import { buildCheckoutReturnPaths } from '@/lib/monetization/returnRoutes';
import { trackLeadEvent } from '@/lib/leadTracking';
import { useSubscriptionConsent } from '@/hooks/useSubscriptionConsent';

interface Props {
  listingId?: string;
  onSkip?: () => void;
  skipLabel?: string;
  heading?: string;
  subheading?: string;
  /** Product slugs to show in this card group. */
  slugs?: string[];
  /** Index of the visually recommended plan. Defaults to middle card. */
  recommendedIndex?: number;
}

const DEFAULT_SLUGS = ['featured-listing-30', 'seller-pro', 'white-glove-seller'];

export function UpgradePackageCards({
  listingId,
  onSkip,
  skipLabel = 'Continue with free listing',
  heading = 'Optional upgrades to help you sell faster',
  subheading = 'Every listing on Vendibook is free. These are optional tools that improve exposure and give you extra support.',
  slugs = DEFAULT_SLUGS,
  recommendedIndex = 1,
}: Props) {
  const [products, setProducts] = useState<MonetizationProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { requestCheckout, dialog: consentDialog, pendingSlug } = useSubscriptionConsent();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [upgrades, services] = await Promise.all([
          listProductsByCategory('listing_upgrade'),
          listProductsByCategory('seller_service'),
        ]);
        if (!alive) return;
        const all = [...upgrades, ...services].filter((p) => slugs.includes(p.slug));
        all.sort((a, b) => slugs.indexOf(a.slug) - slugs.indexOf(b.slug));
        setProducts(all);
      } catch (e) {
        console.error('load upgrade products failed', e);
        toast.error('Could not load upgrade options');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slugs]);

  const buy = async (product: MonetizationProduct) => {
    const paths = buildCheckoutReturnPaths(product.slug, { listingId });
    trackLeadEvent('checkout_started', {
      product_slug: product.slug,
      listing_id: listingId,
      surface: 'upgrade_package_cards',
    });
    await requestCheckout(product, {
      listingId,
      successPath: paths.successPath,
      cancelPath: paths.cancelPath,
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12" aria-busy="true" aria-live="polite">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">Loading upgrade options</span>
      </div>
    );
  }

  const billingLabel = (p: MonetizationProduct) => {
    if (p.billing_type === 'recurring') return 'per month · cancel anytime';
    if (p.duration_days) return `one-time · ${p.duration_days}-day duration`;
    return 'one-time payment';
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{heading}</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">{subheading}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {products.map((p, idx) => {
          const price = effectivePriceCents(p);
          const originalPrice = p.promo_price_cents != null ? p.price_cents : null;
          const isRecommended = idx === recommendedIndex;
          const busy = pendingSlug === p.slug;
          const anyBusy = pendingSlug !== null;
          return (
            <article
              key={p.id}
              className={`relative flex flex-col rounded-2xl border p-5 transition-colors ${
                isRecommended
                  ? 'border-primary/60 bg-card ring-1 ring-primary/25 shadow-[0_10px_30px_-15px_hsl(var(--primary)/0.35)]'
                  : 'border-border/70 bg-card/60 backdrop-blur-sm'
              }`}
              aria-labelledby={`plan-${p.id}-title`}
            >
              {isRecommended && (
                <Badge className="absolute -top-2.5 right-4 bg-primary text-primary-foreground shadow-sm">
                  Recommended
                </Badge>
              )}
              <h3
                id={`plan-${p.id}-title`}
                className="text-lg font-semibold text-foreground"
              >
                {p.name}
              </h3>

              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground tracking-tight">
                  {formatUsd(price)}
                </span>
                {originalPrice != null && originalPrice > price && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatUsd(originalPrice)}
                  </span>
                )}
              </div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {billingLabel(p)}
              </p>

              {p.description && (
                <p className="mt-3 text-sm text-muted-foreground">{p.description}</p>
              )}

              <ul className="mt-4 space-y-1.5 flex-1">
                {p.features?.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground/90">
                    <Check className="mt-0.5 h-4 w-4 flex-none text-primary" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {p.refund_policy && (
                <p className="mt-4 text-[11px] text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground/90">Refund policy: </span>
                  {p.refund_policy}
                </p>
              )}

              <Button
                className="mt-5 w-full font-medium"
                variant={isRecommended ? 'default' : 'outline'}
                onClick={() => buy(p)}
                disabled={anyBusy}
                aria-busy={busy}
                aria-label={busy ? `Starting checkout for ${p.name}` : `Get ${p.name} for ${formatUsd(price)}`}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Redirecting to secure checkout…
                  </>
                ) : (
                  <>
                    Get {p.name}
                    <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                  </>
                )}
              </Button>
            </article>
          );
        })}
      </div>

      {onSkip && (
        <div className="flex justify-center">
          <Button variant="ghost" onClick={onSkip} disabled={pendingSlug !== null}>
            {skipLabel}
          </Button>
        </div>
      )}

      <TrustModule
        variant="compact"
        title="What you get with any Vendibook upgrade"
        points={[
          { icon: ShieldCheck, label: 'Secure checkout', detail: 'Payments processed by Stripe' },
          { icon: TrendingUp, label: 'Transparent metrics', detail: 'Track views, saves, and inquiries' },
          { icon: Headphones, label: 'Real human support', detail: 'Mon–Fri 9am–5pm AZ time' },
        ]}
        disclaimer="Upgrades are optional and never required to list on Vendibook. Cancellation and refund terms are shown on every product above."
      />
      {consentDialog}
    </section>
  );
}

export default UpgradePackageCards;
