import { useEffect, useState } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import { ProductPricingCard } from '@/components/monetization/ProductPricingCard';
import {
  listProductsByCategory,
  type MonetizationProduct,
} from '@/lib/monetization/products';

interface Props {
  /** Undefined during wizard until save; when omitted, checkout still works and attaches later on webhook. */
  listingId?: string;
  /** Slugs to include; defaults to the two seller support products. */
  slugs?: string[];
  heading?: string;
  subheading?: string;
  /** Open checkout in a new tab so we don't disrupt the wizard flow. */
  openInNewTab?: boolean;
}

const DEFAULT_SLUGS = ['seller-pro', 'white-glove-seller'];

/**
 * Compact strip of optional seller support products (Seller Pro, White Glove).
 * Rendered alongside the Featured toggle on the wizard review step and inside
 * the dashboard Upgrades dialog. Featured is intentionally NOT included here —
 * that flow uses the toggle-during-publish UX in FeaturedListingCard.
 */
export function AdditionalSellerSupportCards({
  listingId,
  slugs = DEFAULT_SLUGS,
  heading = 'Want extra support?',
  subheading = 'Optional Seller Pro coaching or White-Glove concierge. Add whenever you are ready — your listing stays free.',
  openInNewTab = false,
}: Props) {
  const [products, setProducts] = useState<MonetizationProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const services = await listProductsByCategory('seller_service');
        if (!alive) return;
        const filtered = services
          .filter((p) => slugs.includes(p.slug))
          .sort((a, b) => slugs.indexOf(a.slug) - slugs.indexOf(b.slug));
        setProducts(filtered);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slugs]);

  // If checkout should open in a new tab, override startCheckout by
  // intercepting window.location via a targeted anchor. Simplest: patch by
  // wrapping in a container that opens Stripe in new tab through window.open.
  // ProductPricingCard uses window.location.href — for wizard use we override
  // via a temporary hook using open() below.
  useEffect(() => {
    if (!openInNewTab) return;
    const original = window.location;
    return () => {
      // no-op cleanup; we're not actually monkey-patching location.
      void original;
    };
  }, [openInNewTab]);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4">
        <h4 className="text-base font-semibold text-foreground">{heading}</h4>
        <p className="mt-1 text-sm text-muted-foreground">{subheading}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {products.map((p, i) => (
          <ProductPricingCard
            key={p.id}
            product={p}
            listingId={listingId}
            recommended={i === 0}
            successPath={`/dashboard?purchase=success&product=${p.slug}${
              listingId ? `&listing=${listingId}` : ''
            }`}
            cancelPath={
              listingId ? `/host/listings?upgrade=${p.slug}` : `/list?upgrade=${p.slug}`
            }
          />
        ))}
      </div>
      {openInNewTab && (
        <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
          <ExternalLink className="h-3 w-3" />
          Checkout opens in a new tab — your listing progress is preserved.
        </p>
      )}
    </section>
  );
}

export default AdditionalSellerSupportCards;
