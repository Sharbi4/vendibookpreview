import { Loader2 } from 'lucide-react';
import { useMonetizationProducts } from '@/hooks/useMonetizationProducts';
import { ProductPricingCard } from '@/components/monetization/ProductPricingCard';
import { SectionHeader } from '@/components/journey';
import { buildCheckoutReturnPaths } from '@/lib/monetization/returnRoutes';

const PermitPathUpgrades = () => {
  const { products, loading } = useMonetizationProducts('permit_upgrade');

  return (
    <div className="min-h-screen bg-background">
      <section className="mx-auto max-w-5xl px-4 py-14">
        <SectionHeader
          eyebrow="Permit Path"
          title="Optional upgrades for your Permit Path"
          description="Basic Permit Path stays free. These add saved progress, document storage, and concierge-level help preparing your applications."
        />

        {loading ? (
          <div className="mt-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {products.map((p, i) => {
              const paths = buildCheckoutReturnPaths(p.slug);
              return (
                <ProductPricingCard
                  key={p.id}
                  product={p}
                  recommended={i === products.length - 1}
                  successPath={paths.successPath}
                  cancelPath={paths.cancelPath}
                />
              );
            })}
          </div>
        )}

        <div className="mt-8 rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-4 text-xs text-muted-foreground">
          Vendibook does not provide legal advice and does not guarantee permit approval. Permit Path products are informational tools to help you organize the process.
        </div>
      </section>
    </div>
  );
};

export default PermitPathUpgrades;
