import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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

  // Wizard-originated visits pass ?returnTo=/create-listing/{id}?step=... and
  // optionally ?listingContext=<draftId>. When present we route checkout cancel/success
  // back to the wizard and auto-scope listing-scoped boosts to that draft so the
  // user is never dumped on /dashboard mid-listing-creation.
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const listingContext = searchParams.get('listingContext') ?? undefined;
  const overrideCancelPath = returnTo || undefined;
  const overrideSuccessPath = returnTo
    ? `${returnTo}${returnTo.includes('?') ? '&' : '?'}purchase=success`
    : undefined;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Vendibook Pricing — Memberships, Boosts & Services"
        description="Compare Vendibook host and seller memberships, listing boosts, and expert services. Monthly or annual billing, no hidden fees."
      />

      <section className="mx-auto max-w-6xl px-4 pt-8 pb-16">
        <PremiumPlansSection
          successPathOverride={overrideSuccessPath}
          cancelPathOverride={overrideCancelPath}
        />
      </section>


      <div className="section-band">
      <section id="upgrades" className="mx-auto max-w-6xl px-4 py-16 md:py-20">

        <SectionHeader
          eyebrow="Boosts & add-ons"
          title="One-time tools for when you need a lift."
          description="Pay once for placement or expert help — no subscription required. Members get automatic discounts at checkout."
        />

        {/* Listing boosts */}
        {(loadingUpgrades || listingUpgrades.length > 0) && (
          <div className="mt-16">
            <SectionHeader
              eyebrow="Boosts"
              title="One-time boosts for your listings"
              description="Pay once for placement — no subscription required."
            />
            {loadingUpgrades ? (
              <div className="mt-8 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {listingUpgrades.map((p) => {
                  const paths = buildCheckoutReturnPaths(p.slug, { listingId: listingContext });
                  return (
                    <ProductPricingCard
                      key={p.id}
                      product={p}
                      listingId={listingContext}
                      ctaLabel="Buy boost"
                      successPath={overrideSuccessPath ?? paths.successPath}
                      cancelPath={overrideCancelPath ?? paths.cancelPath}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}


        {/* Seller services */}
        {(loadingSeller || sellerAddons.length > 0) && (
          <div className="mt-16">
            <SectionHeader
              eyebrow="Seller services"
              title="Expert help, on demand"
              description="Human review and copywriting. Members get automatic discounts at checkout."
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
        )}

        {/* Permit upgrades */}
        {(loadingPermit || permitUpgrades.length > 0) && (
          <div className="mt-16">
            <SectionHeader
              eyebrow="Permits"
              title="Get to open, faster"
              description="A step-by-step permit roadmap for your city with document links."
            />
            {loadingPermit ? (
              <div className="mt-8 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {permitUpgrades.map((p) => {
                  const paths = buildCheckoutReturnPaths(p.slug);
                  return (
                    <ProductPricingCard
                      key={p.id}
                      product={p}
                      ctaLabel="Get roadmap"
                      successPath={paths.successPath}
                      cancelPath={paths.cancelPath}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Buyer services — only render when catalog has any */}
        {!loadingBuyer && buyerServices.length > 0 && (
          <div className="mt-16">
            <SectionHeader
              eyebrow="Buyer services"
              title="Buy with confidence"
              description="Purchase reviews and readiness tools for equipment and space buyers."
            />
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
          </div>
        )}

        <div className="mt-10">
          <TrustModule variant="compact" points={PAYMENT_TRUST_POINTS} />
        </div>

        <div className="mt-6 rounded-xl border border-border/70 bg-card/50 p-4 text-xs text-muted-foreground backdrop-blur-sm">
          Subscriptions are billed securely through PayPal. Upgrade, downgrade, or cancel any time — access continues through the current paid period. Existing subscribers keep their current pricing.
        </div>
      </section>
      </div>
    </div>
  );
};

export default Pricing;
