import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
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
        ) : products.length === 0 ? (
          <div className="mt-8 rounded-xl border border-border/70 bg-card/50 p-6 text-sm text-muted-foreground">
            <p className="text-foreground font-medium">No paid buyer services are open right now.</p>
            <p className="mt-2">
              Buying and browsing stay free. Financing, inspection, and transport partners are
              available any time from the partners directory, and support can answer purchase
              questions directly.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to="/partners?category=inspection"
                className="text-sm font-medium text-primary hover:underline"
              >
                Browse inspection &amp; transport partners
              </Link>
              <Link to="/financing" className="text-sm font-medium text-primary hover:underline">
                See financing options
              </Link>
            </div>
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

        {products.length > 0 && (
          <div className="mt-8 rounded-xl border border-border/70 bg-card/50 backdrop-blur-sm p-4 text-xs text-muted-foreground">
            Buyer services are informational — not certified mechanical inspections, appraisals, or
            legal opinions.
          </div>
        )}

        <div className="mt-8">
          <TrustModule variant="compact" points={PAYMENT_TRUST_POINTS} />
        </div>
      </section>
    </div>
  );
};

export default BuyerServicesHub;
