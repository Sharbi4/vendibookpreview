import { Loader2 } from 'lucide-react';
import { useMonetizationProducts } from '@/hooks/useMonetizationProducts';
import { ProductPricingCard } from '@/components/monetization/ProductPricingCard';
import { TrustModule, PAYMENT_TRUST_POINTS } from '@/components/journey';

const BuyerServicesHub = () => {
  const { products, loading } = useMonetizationProducts('buyer_service');

  return (
    <div className="min-h-screen bg-background">
      <section className="mx-auto max-w-5xl px-4 py-14">
        <p className="text-sm font-medium uppercase tracking-widest text-orange-400">
          Buyer services
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Buy your next food truck with more confidence
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Optional tools that help you evaluate listings, prepare financing, and go into a
          purchase informed. Buying and browsing on Vendibook stays free.
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
                successPath={`/dashboard?purchase=success&product=${p.slug}`}
                cancelPath={`/buyer/services?cancelled=1`}
              />
            ))}
          </div>
        )}

        <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs text-muted-foreground">
          Listing Purchase Reviews are informational — not certified mechanical inspections,
          appraisals, or legal opinions. Reviews are typically returned within 5 business days.
        </div>

        <div className="mt-10">
          <TrustModule variant="compact" points={PAYMENT_TRUST_POINTS} />
        </div>
      </section>
    </div>
  );
};

export default BuyerServicesHub;
