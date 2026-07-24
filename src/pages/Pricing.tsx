import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useMonetizationProducts } from '@/hooks/useMonetizationProducts';
import { ProductPricingCard } from '@/components/monetization/ProductPricingCard';
import {
  SectionHeader,
  TrustModule,
  PAYMENT_TRUST_POINTS,
} from '@/components/journey';
import { buildCheckoutReturnPaths } from '@/lib/monetization/returnRoutes';
import { effectivePriceCents, type MonetizationProduct } from '@/lib/monetization/products';
import { cn } from '@/lib/utils';
import SEO from '@/components/SEO';

type Interval = 'monthly' | 'annual';

/**
 * Pair recurring host_subscription products by their base slug.
 * Convention: monthly = "<base>" or "<base>_monthly"; annual = "<base>_annual".
 */
function pairSubscriptions(products: MonetizationProduct[]) {
  const byKey = new Map<string, { monthly?: MonetizationProduct; annual?: MonetizationProduct; order: number }>();

  for (const p of products) {
    const slug = p.slug;
    const isAnnual = slug.endsWith('_annual');
    const base = isAnnual ? slug.replace(/_annual$/, '') : slug.replace(/_monthly$/, '');
    const entry = byKey.get(base) ?? { order: p.display_order };
    if (isAnnual) entry.annual = p;
    else entry.monthly = p;
    entry.order = Math.min(entry.order, p.display_order);
    byKey.set(base, entry);
  }

  return Array.from(byKey.entries())
    .map(([base, v]) => ({ base, ...v }))
    .sort((a, b) => a.order - b.order);
}

function savingsPct(monthly?: MonetizationProduct, annual?: MonetizationProduct): number | null {
  if (!monthly || !annual) return null;
  const yearIfMonthly = effectivePriceCents(monthly) * 12;
  const yearAnnual = effectivePriceCents(annual);
  if (yearIfMonthly <= 0) return null;
  const pct = Math.round(((yearIfMonthly - yearAnnual) / yearIfMonthly) * 100);
  return pct > 0 ? pct : null;
}

const Pricing = () => {
  const { products: subs, loading: loadingSubs } = useMonetizationProducts('host_subscription');
  const { products: sellerAddons, loading: loadingSeller } = useMonetizationProducts('seller_service');
  const { products: listingUpgrades, loading: loadingUpgrades } = useMonetizationProducts('listing_upgrade');
  const { products: buyerServices, loading: loadingBuyer } = useMonetizationProducts('buyer_service');

  const [interval, setInterval] = useState<Interval>('monthly');

  const paired = useMemo(() => pairSubscriptions(subs), [subs]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Vendibook Pricing — Memberships, Boosts & Services"
        description="Compare Vendibook host and seller memberships, listing boosts, and expert services. Monthly or annual billing, no hidden fees."
      />

      <section className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeader
          eyebrow="Pricing"
          title="Simple pricing. Real tools."
          description="Free hosts and sellers keep every core tool. Add memberships, boosts, or expert services only when you need them. Cancel anytime — access continues through the paid period."
        />

        {/* Interval toggle */}
        <div className="mt-8 flex items-center justify-center">
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1 backdrop-blur-sm">
            {(['monthly', 'annual'] as Interval[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setInterval(opt)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-medium transition',
                  interval === opt
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-pressed={interval === opt}
              >
                {opt === 'monthly' ? 'Monthly' : 'Annual'}
                {opt === 'annual' && (
                  <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wider text-orange-200/90">
                    Save ~17%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Subscription tiers */}
        {loadingSubs ? (
          <div className="mt-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {paired.map(({ base, monthly, annual }, idx) => {
              const active = interval === 'annual' ? annual ?? monthly : monthly ?? annual;
              if (!active) return null;
              const paths = buildCheckoutReturnPaths(active.slug);
              const save = savingsPct(monthly, annual);
              return (
                <div key={base} className="relative">
                  {interval === 'annual' && save && (
                    <div className="absolute -top-2.5 left-6 z-10 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow">
                      Save {save}%
                    </div>
                  )}
                  <ProductPricingCard
                    product={active}
                    recommended={idx === 1}
                    ctaLabel="Start plan"
                    successPath={paths.successPath}
                    cancelPath={paths.cancelPath}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Listing boosts */}
        <div className="mt-16">
          <SectionHeader
            eyebrow="Boosts"
            title="One-time boosts for your listings"
            description="Pay once for placement or a badge — no subscription required."
          />
          {loadingUpgrades ? (
            <div className="mt-8 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {listingUpgrades.map((p) => {
                const paths = buildCheckoutReturnPaths(p.slug);
                return (
                  <ProductPricingCard
                    key={p.id}
                    product={p}
                    ctaLabel="Buy boost"
                    successPath={paths.successPath}
                    cancelPath={paths.cancelPath}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Seller services */}
        <div className="mt-16">
          <SectionHeader
            eyebrow="Seller services"
            title="Expert help, on demand"
            description="Human review, copywriting, and pricing analysis. Members get automatic discounts at checkout."
          />
          {loadingSeller ? (
            <div className="mt-8 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sellerAddons.map((p) => {
                const paths = buildCheckoutReturnPaths(p.slug);
                return (
                  <ProductPricingCard
                    key={p.id}
                    product={p}
                    ctaLabel="Add service"
                    successPath={paths.successPath}
                    cancelPath={paths.cancelPath}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Buyer services */}
        <div className="mt-16">
          <SectionHeader
            eyebrow="Buyer services"
            title="Buy with confidence"
            description="Purchase reviews and readiness tools designed for equipment and space buyers."
          />
          {loadingBuyer ? (
            <div className="mt-8 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {buyerServices.map((p) => {
                const paths = buildCheckoutReturnPaths(p.slug);
                return (
                  <ProductPricingCard
                    key={p.id}
                    product={p}
                    ctaLabel="Get started"
                    successPath={paths.successPath}
                    cancelPath={paths.cancelPath}
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-10">
          <TrustModule variant="compact" points={PAYMENT_TRUST_POINTS} />
        </div>

        <div className="mt-6 rounded-xl border border-border/70 bg-card/50 p-4 text-xs text-muted-foreground backdrop-blur-sm">
          Subscriptions are managed through Stripe. Upgrade, downgrade, or cancel any time — access continues through the current paid period. Existing subscribers keep their current pricing.
        </div>
      </section>
    </div>
  );
};

export default Pricing;
