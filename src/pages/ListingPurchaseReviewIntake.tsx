import { Link, useParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Listing Purchase Review — RETIRED product.
 *
 * The `listing_purchase_review` product is inactive in the monetization
 * catalog, so this page must never present it as purchasable and must never
 * start a PayPal checkout. Existing `buyer_service_requests` records stay
 * untouched; buyers who land here (old links, resumable-journey cards) get a
 * clear explanation and live alternatives instead of a dead checkout.
 */
const ListingPurchaseReviewIntake = () => {
  const { listingId } = useParams<{ listingId: string }>();

  return (
    <div className="min-h-screen bg-background">
      <section className="mx-auto max-w-2xl px-4 py-14">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Buyer services
        </div>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
          Listing Purchase Review is no longer offered
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          We&apos;ve retired the paid Listing Purchase Review. If you already purchased one, your
          review is unaffected — our team will deliver it and you can track it from your buyer
          dashboard. Nothing new can be purchased here.
        </p>

        <div className="mt-6 rounded-xl border border-border/70 bg-card/50 p-5 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">What to use instead</p>
          <ul className="mt-3 space-y-2">
            <li>· Message the seller directly with your questions from the listing page.</li>
            <li>· Book an independent inspector or transport partner from our partner directory.</li>
            <li>· Every purchase on Vendibook already includes payment protection.</li>
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {listingId ? (
            <Button asChild variant="cta">
              <Link to={`/listing/${listingId}`}>Back to the listing</Link>
            </Button>
          ) : null}
          <Button asChild variant="cta-outline">
            <Link to="/partners?category=inspection">Find an inspector</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/buyer/dashboard">Go to buyer dashboard</Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default ListingPurchaseReviewIntake;
