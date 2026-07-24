import { Loader2 } from 'lucide-react';
import { useMonetizationProducts } from '@/hooks/useMonetizationProducts';
import { ProductPricingCard } from '@/components/monetization/ProductPricingCard';
import { SectionHeader, TrustModule, PAYMENT_TRUST_POINTS } from '@/components/journey';
import { buildCheckoutReturnPaths } from '@/lib/monetization/returnRoutes';

const HostProPlans = () => {
  const { products, loading } = useMonetizationProducts('host_subscription');

  return (
    <div className="min-h-screen bg-background">
      <section className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeader
          eyebrow="Host Pro"
          title="Professional tools for hosts, kitchens, and commissaries"
          description="Every host on Vendibook keeps free access to core tools. Host Pro plans add multi-listing management, custom rules, reporting, and team access — designed for operators who run more than a single space."
        />

        {loading ? (
          <div className="mt-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {products.map((p, i) => {
              const paths = buildCheckoutReturnPaths(p.slug);
              return (
                <ProductPricingCard
                  key={p.id}
                  product={p}
                  recommended={i === 1}
                  ctaLabel="Start plan"
                  successPath={paths.successPath}
                  cancelPath={paths.cancelPath}
                />
              );
            })}
          </div>
        )}

        <div className="mt-8">
          <TrustModule variant="compact" points={PAYMENT_TRUST_POINTS} />
        </div>

        <div className="mt-6 rounded-xl border border-border/70 bg-card/50 backdrop-blur-sm p-4 text-xs text-muted-foreground">
          Subscriptions are managed through Stripe. Upgrade, downgrade, or cancel any time — access continues through the current paid period. Free hosts keep all existing access; paid tiers add professional tools on top.
        </div>
      </section>
    </div>
  );
};

export default HostProPlans;
