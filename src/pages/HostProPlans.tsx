import { Loader2 } from 'lucide-react';
import { useMonetizationProducts } from '@/hooks/useMonetizationProducts';
import { ProductPricingCard } from '@/components/monetization/ProductPricingCard';

const HostProPlans = () => {
  const { products, loading } = useMonetizationProducts('host_subscription');

  return (
    <div className="min-h-screen bg-background">
      <section className="mx-auto max-w-6xl px-4 py-14">
        <p className="text-sm font-medium uppercase tracking-widest text-orange-400">
          Host Pro
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Professional tools for hosts, kitchens, and commissaries
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Every host on Vendibook keeps free access to core tools. Host Pro plans add
          multi-listing management, custom rules, reporting, and team access — designed for
          operators who run more than a single space.
        </p>

        {loading ? (
          <div className="mt-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {products.map((p, i) => (
              <ProductPricingCard
                key={p.id}
                product={p}
                recommended={i === 1}
                ctaLabel="Start plan"
                successPath={`/dashboard?subscription=success&tier=${p.slug}`}
                cancelPath={`/host/plans?cancelled=1`}
              />
            ))}
          </div>
        )}

        <div className="mt-10 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs text-muted-foreground">
          Subscriptions are managed through Stripe. You can upgrade, downgrade, or cancel at any
          time — access continues through the current paid period. Free hosts keep all existing
          access; paid tiers add professional tools on top.
        </div>
      </section>
    </div>
  );
};

export default HostProPlans;
