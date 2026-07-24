import { Loader2 } from 'lucide-react';
import { useMonetizationProducts } from '@/hooks/useMonetizationProducts';
import { ProductPricingCard } from '@/components/monetization/ProductPricingCard';

const PermitPathUpgrades = () => {
  const { products, loading } = useMonetizationProducts('permit_upgrade');

  return (
    <div className="min-h-screen bg-background">
      <section className="mx-auto max-w-5xl px-4 py-14">
        <p className="text-sm font-medium uppercase tracking-widest text-orange-400">
          Permit Path
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Optional upgrades for your Permit Path
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Basic Permit Path stays free. These add saved progress, document storage, and
          concierge-level help preparing your applications.
        </p>

        {loading ? (
          <div className="mt-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {products.map((p, i) => (
              <ProductPricingCard
                key={p.id}
                product={p}
                recommended={i === products.length - 1}
                successPath={`/tools/permitpath?purchase=success&product=${p.slug}`}
                cancelPath={`/tools/permitpath/upgrades?cancelled=1`}
              />
            ))}
          </div>
        )}

        <div className="mt-8 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-xs text-yellow-100/90">
          Vendibook does not provide legal advice and does not guarantee permit approval. Permit
          Path products are informational tools to help you organize the process.
        </div>
      </section>
    </div>
  );
};

export default PermitPathUpgrades;
