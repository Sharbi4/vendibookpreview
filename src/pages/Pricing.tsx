import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';
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

// One-line "what you get" copy for the simplified catalog.
// Keys match monetization_products.slug — anything outside this map still uses
// the DB description, so future SKUs are additive without a code change.
const ONE_LINERS: Record<string, string> = {
  'boost-featured-30': 'Top of search + featured shelf for 30 days.',
  'permit_path_plus': 'Full permit roadmap for your city with document links.',
  'listing_rewrite': 'We rewrite your listing copy and photos in 3 business days.',
  'pro_weekly_pass': 'All Pro benefits for 7 days. No renewal.',
};

const applyOneLiners = <T extends { slug: string; description: string | null }>(list: T[]): T[] =>
  list.map((p) => (ONE_LINERS[p.slug] ? { ...p, description: ONE_LINERS[p.slug] } : p));

const Pricing = () => {
  const { products: sellerRaw, loading: loadingSeller } = useMonetizationProducts('seller_service');
  const { products: listingRaw, loading: loadingUpgrades } = useMonetizationProducts('listing_upgrade');
  const { products: buyerRaw, loading: loadingBuyer } = useMonetizationProducts('buyer_service');
  const { products: permitRaw, loading: loadingPermit } = useMonetizationProducts('permit_upgrade');

  const sellerAddons = useMemo(() => applyOneLiners(sellerRaw), [sellerRaw]);
  const listingUpgrades = useMemo(() => applyOneLiners(listingRaw), [listingRaw]);
  const buyerServices = useMemo(() => applyOneLiners(buyerRaw), [buyerRaw]);
  const permitUpgrades = useMemo(() => applyOneLiners(permitRaw), [permitRaw]);



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
