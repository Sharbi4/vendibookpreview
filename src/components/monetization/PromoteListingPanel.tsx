import { useEffect, useMemo, useState } from 'react';
import { Loader2, Rocket, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  effectivePriceCents,
  formatUsd,
  listProductsByCategory,
  startMonetizationCheckout,
  type ListingPromotion,
  type MonetizationProduct,
} from '@/lib/monetization/products';

interface Props {
  listingId: string;
}

const BOOST_SLUGS = [
  'boost-featured-7',
  'boost-featured-30',
  'boost-top-of-search',
  'boost-highlight',
  'boost-motivated-seller',
  'boost-email-campaign',
  'boost-social-feature',
];

export function PromoteListingPanel({ listingId }: Props) {
  const [products, setProducts] = useState<MonetizationProduct[]>([]);
  const [promos, setPromos] = useState<ListingPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [items, promoRes] = await Promise.all([
          listProductsByCategory('listing_upgrade'),
          (supabase as unknown as {
            from: (t: string) => {
              select: (c: string) => {
                eq: (a: string, b: unknown) => {
                  eq: (a: string, b: unknown) => Promise<{
                    data: ListingPromotion[] | null;
                    error: Error | null;
                  }>;
                };
              };
            };
          })
            .from('listing_promotions')
            .select('*')
            .eq('listing_id', listingId)
            .eq('active', true),
        ]);
        if (!alive) return;
        setProducts(items.filter((p) => BOOST_SLUGS.includes(p.slug)));
        setPromos(promoRes.data ?? []);
      } catch (e) {
        console.error('promote panel load failed', e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [listingId]);

  const activeTypes = useMemo(() => new Set(promos.map((p) => p.promo_type)), [promos]);

  const buy = async (slug: string) => {
    setBuying(slug);
    try {
      const { url } = await startMonetizationCheckout({
        productSlug: slug,
        listingId,
        successPath: `/dashboard?purchase=success&`,
        cancelPath: `/dashboard?purchase=cancelled`,
      });
      window.location.href = url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Checkout failed';
      toast.error(msg);
      setBuying(null);
    }
  };

  const daysLeft = (ends: string) =>
    Math.max(0, Math.ceil((new Date(ends).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
          <Rocket className="h-5 w-5 text-primary" /> Promote listing
        </h2>
        <p className="text-sm text-muted-foreground">
          Optional boosts add extra exposure to your existing free listing. Every purchase includes
          a clear duration and refund policy.
        </p>
      </header>

      {promos.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">
            Current promotions
          </div>
          <ul className="space-y-2">
            {promos.map((promo) => (
              <li
                key={promo.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background/50 p-3 text-sm"
              >
                <div>
                  <div className="font-semibold text-foreground">
                    {promo.promo_type.replaceAll('_', ' ')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Ends {new Date(promo.ends_at).toLocaleDateString()} · {daysLeft(promo.ends_at)}{' '}
                    days remaining
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{promo.metrics?.impressions ?? 0} impressions</span>
                  <span>{promo.metrics?.views ?? 0} views</span>
                  <span>{promo.metrics?.saves ?? 0} saves</span>
                  <span>{promo.metrics?.messages ?? 0} messages</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {products.map((p) => {
          const isActive = p.promo_type ? activeTypes.has(p.promo_type) : false;
          const price = effectivePriceCents(p);
          return (
            <article
              key={p.id}
              className="flex flex-col rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-foreground">{p.name}</h3>
                  {p.description && (
                    <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
                  )}
                </div>
                <Badge variant="outline" className="shrink-0 border-primary/40 text-primary">
                  {formatUsd(price)}
                </Badge>
              </div>
              <ul className="mt-3 flex-1 space-y-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-foreground">
                    <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {p.refund_policy && (
                <p className="mt-3 text-[10px] text-muted-foreground">
                  {p.refund_policy}
                </p>
              )}
              <Button
                className="mt-3"
                size="sm"
                variant={isActive ? 'secondary' : 'default'}
                disabled={buying !== null || isActive}
                onClick={() => buy(p.slug)}
              >
                {isActive ? (
                  'Already active'
                ) : buying === p.slug ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Redirecting…
                  </>
                ) : (
                  <>
                    Purchase boost
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default PromoteListingPanel;
