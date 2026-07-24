import { Loader2 } from 'lucide-react';
import { useMonetizationProducts } from '@/hooks/useMonetizationProducts';
import { ProductPricingCard } from '@/components/monetization/ProductPricingCard';
import { SectionHeader, TrustModule, PAYMENT_TRUST_POINTS } from '@/components/journey';
import { buildCheckoutReturnPaths } from '@/lib/monetization/returnRoutes';

const BuyerServicesHub = () => {
  const { products, loading } = useMonetizationProducts('buyer_service');

  return (
    <div className="min-h-screen bg-background">
      <section className="mx-auto max-w-5xl px-4 py-14">
        <SectionHeader
          eyebrow="Buyer services"
          title="Buy your next food truck with more confidence"
          description="Optional tools that help you evaluate listings, prepare financing, and go into a purchase informed. Buying and browsing on Vendibook stays free."
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

        <div className="mt-8 rounded-xl border border-border/70 bg-card/50 backdrop-blur-sm p-4 text-xs text-muted-foreground">
          Listing Purchase Reviews are informational — not certified mechanical inspections, appraisals, or legal opinions. Reviews are typically returned within 5 business days.
        </div>

        <div className="mt-8">
          <TrustModule variant="compact" points={PAYMENT_TRUST_POINTS} />
        </div>
      </section>
    </div>
  );
};

export default BuyerServicesHub;
