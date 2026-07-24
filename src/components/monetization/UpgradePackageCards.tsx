import { useEffect, useState } from 'react';
import { Loader2, Check, Sparkle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  effectivePriceCents,
  formatUsd,
  listProductsByCategory,
  startMonetizationCheckout,
  type MonetizationProduct,
} from '@/lib/monetization/products';

interface Props {
  listingId?: string;
  onSkip?: () => void;
  skipLabel?: string;
  heading?: string;
  subheading?: string;
  /** Product slugs to show in this card group. */
  slugs?: string[];
}

const DEFAULT_SLUGS = ['featured-listing-30', 'seller-pro', 'white-glove-seller'];

export function UpgradePackageCards({
  listingId,
  onSkip,
  skipLabel = 'Continue with free listing',
  heading = 'Sell faster with an optional upgrade',
  subheading = 'Every listing on Vendibook is free. Upgrades are optional tools that help you get more exposure and support.',
  slugs = DEFAULT_SLUGS,
}: Props) {
  const [products, setProducts] = useState<MonetizationProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

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
        // preserve requested order
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

  const buy = async (slug: string) => {
    setBuying(slug);
    try {
      const { url } = await startMonetizationCheckout({
        productSlug: slug,
        listingId,
        successPath: '/dashboard?purchase=success&',
        cancelPath: '/dashboard?purchase=cancelled',
      });
      window.location.href = url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Checkout failed';
      toast.error(msg);
      setBuying(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2 text-center md:text-left">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{heading}</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">{subheading}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {products.map((p, idx) => {
          const price = effectivePriceCents(p);
          const isHighlighted = idx === 1;
          return (
            <article
              key={p.id}
              className={`relative rounded-2xl border p-5 transition-colors ${
                isHighlighted
                  ? 'border-primary/60 bg-primary/5 shadow-sm'
                  : 'border-border bg-card'
              }`}
            >
              {isHighlighted && (
                <Badge className="absolute -top-2.5 right-4 bg-primary text-primary-foreground">
                  Most popular
                </Badge>
              )}
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-lg font-semibold text-foreground">{p.name}</h3>
              </div>
              <p className="mt-1 text-3xl font-bold text-foreground">{formatUsd(price)}</p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {p.billing_type === 'recurring' ? 'per month' : 'one-time'}
                {p.duration_days ? ` · ${p.duration_days}-day duration` : ''}
              </p>
              {p.description && (
                <p className="mt-3 text-sm text-muted-foreground">{p.description}</p>
              )}
              <ul className="mt-4 space-y-1.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 flex-none text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {p.refund_policy && (
                <p className="mt-4 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Refund policy: </span>
                  {p.refund_policy}
                </p>
              )}
              <Button
                className="mt-5 w-full"
                variant={isHighlighted ? 'default' : 'outline'}
                onClick={() => buy(p.slug)}
                disabled={buying !== null}
              >
                {buying === p.slug ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting…
                  </>
                ) : (
                  <>
                    <Sparkle className="mr-2 h-4 w-4" />
                    Upgrade for {formatUsd(price)}
                  </>
                )}
              </Button>
            </article>
          );
        })}
      </div>

      {onSkip && (
        <div className="flex justify-center pt-2">
          <Button variant="ghost" onClick={onSkip} disabled={buying !== null}>
            {skipLabel}
          </Button>
        </div>
      )}

      <p className="text-center text-[11px] text-muted-foreground">
        Upgrades are optional. Basic listings on Vendibook are always free. Cancellation and refund
        terms are shown on every product above.
      </p>
    </section>
  );
}

export default UpgradePackageCards;
