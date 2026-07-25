import { Loader2 } from 'lucide-react';
import { useMonetizationProducts } from '@/hooks/useMonetizationProducts';
import { ProductPricingCard } from '@/components/monetization/ProductPricingCard';
import {
  SectionHeader,
  TrustModule,
  PAYMENT_TRUST_POINTS,
} from '@/components/journey';
import { buildCheckoutReturnPaths } from '@/lib/monetization/returnRoutes';
import SEO from '@/components/SEO';
import PremiumPlansSection from '@/components/monetization/PremiumPlansSection';


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

      <section className="mx-auto max-w-6xl px-4 pt-8 pb-4">
        <PremiumPlansSection />
      </section>

      <section id="upgrades" className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeader
          eyebrow="Boosts & add-ons"
          title="One-time tools for when you need a lift."
          description="Pay once for placement, a badge, or expert help — no subscription required. Members get automatic discounts at checkout."
        />


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
