import { Link } from 'react-router-dom';
import {
  ChevronRight,
  Home,
  MapPin,
  Share2,
  Star,
  Edit,
  Truck,
  Package,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EnhancedPhotoGallery from '@/components/listing-detail/EnhancedPhotoGallery';
import CollapsibleDescription from '@/components/listing-detail/CollapsibleDescription';
import AudioListingPlayer from '@/components/listing/AudioListingPlayer';
import PromoVideoPlayer from '@/components/listing/PromoVideoPlayer';
import ReviewsSection from '@/components/reviews/ReviewsSection';
import RelatedListings from '@/components/listing-detail/RelatedListings';
import { FavoriteButton } from '@/components/listing/FavoriteButton';
import { FeaturedBadge } from '@/components/listing/FeaturedBadge';
import OwnerBanner from '@/components/listing-detail/OwnerBanner';
import { isListingFeatured } from '@/lib/featured';
import { CATEGORY_LABELS, type ListingCategory } from '@/types/listing';
import { SaleCard } from './SaleCard';
import { SaleQuickSpecs } from './SaleQuickSpecs';
import { SaleFeaturesGrid } from './SaleFeaturesGrid';
import { SalePurchaseCard } from './SalePurchaseCard';
import { SaleStickyActionBar } from './SaleStickyActionBar';
import { SaleLocationCard, SaleProtectionSection } from './SaleSharedSections';

interface SaleListingLayoutProps {
  listing: any;
  host: any;
  images: string[];
  videos: string[];
  isOwner: boolean;
  sellerVerified: boolean;
  ratingData?: { average: number; count: number } | null;
  onShare: () => void;
}

const conditionLabel = (condition?: string | null): string | null => {
  if (!condition) return null;
  return condition.charAt(0).toUpperCase() + condition.slice(1).replace(/_/g, ' ');
};

/**
 * Airbnb-style for-sale listing detail page.
 *
 * One purchase surface (SalePurchaseCard) — sticky on desktop, plus a compact
 * bottom bar on mobile. The body carries content only: specs, description,
 * features, location, handoff summary, confidence, reviews and similar
 * listings. Purchase, delivery and seller modules are never duplicated here.
 */
export const SaleListingLayout = ({
  listing,
  host,
  images,
  videos,
  isOwner,
  sellerVerified,
  ratingData,
  onShare,
}: SaleListingLayoutProps) => {
  const categoryLabel =
    CATEGORY_LABELS[listing.category as keyof typeof CATEGORY_LABELS] || 'Listing';
  const locationShort = [listing.city, listing.state].filter(Boolean).join(', ');
  const featured = isListingFeatured(listing);
  const condition = conditionLabel(listing.condition);
  const fulfillmentType = listing.fulfillment_type ?? 'pickup';
  const offersPickup = fulfillmentType === 'pickup' || fulfillmentType === 'both';
  const sellerDelivers = fulfillmentType === 'delivery' || fulfillmentType === 'both';
  const freightEnabled = Boolean(listing.vendibook_freight_enabled);

  return (
    <main className="flex-1">
      {/* Gallery first */}
      <div className="md:container md:pt-4">
        <EnhancedPhotoGallery images={images} videos={videos} title={listing.title} />
      </div>

      <div className="container pt-4 pb-28 lg:pb-16">
        {/* Breadcrumb + utilities */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <nav className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
            <Link to="/" className="hover:text-foreground shrink-0">
              <Home className="h-3.5 w-3.5" />
            </Link>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <Link
              to={`/search?category=${listing.category}&mode=sale`}
              className="hover:text-foreground shrink-0"
            >
              {categoryLabel} for sale
            </Link>
            <ChevronRight className="h-3 w-3 shrink-0 hidden sm:block" />
            <span className="truncate hidden sm:block">{listing.title}</span>
          </nav>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" onClick={onShare} className="text-muted-foreground">
              <Share2 className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            <FavoriteButton listingId={listing.id} category={listing.category} size="sm" variant="underline" />
          </div>
        </div>

        {isOwner && (
          <div className="mb-5">
            <OwnerBanner listingId={listing.id} variant="inline" status={listing.status} />
          </div>
        )}

        {/* Title block */}
        <header className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-semibold leading-tight">{listing.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="text-xl md:text-2xl font-bold text-foreground">
                  {listing.price_sale ? `$${listing.price_sale.toLocaleString()}` : 'Price on request'}
                </span>
                <span>·</span>
                <span>{categoryLabel}</span>
                {condition && (
                  <>
                    <span>·</span>
                    <span>{condition}</span>
                  </>
                )}
                {locationShort && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {locationShort}
                    </span>
                  </>
                )}
                {ratingData?.count ? (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 text-foreground">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {ratingData.average} ({ratingData.count})
                    </span>
                  </>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {featured && <FeaturedBadge />}
                {listing.status === 'published' && (
                  <Badge variant="secondary" className="text-[11px]">Available</Badge>
                )}
                {listing.instant_book && (
                  <Badge variant="secondary" className="text-[11px]">Buy now</Badge>
                )}
                {listing.price_negotiable && (
                  <Badge variant="secondary" className="text-[11px]">Offers accepted</Badge>
                )}
                {freightEnabled && (
                  <Badge variant="secondary" className="text-[11px]">Nationwide freight</Badge>
                )}
              </div>
            </div>
            {isOwner && (
              <Button asChild size="sm" variant="outline" className="shrink-0">
                <Link to={`/edit-listing/${listing.id}`}>
                  <Edit className="h-4 w-4 mr-1.5" />
                  Edit
                </Link>
              </Button>
            )}
          </div>
        </header>

        {/* Mobile: the single purchase surface sits directly under the header */}
        <div className="lg:hidden mb-6">
          <SalePurchaseCard
            listing={listing}
            host={host}
            isOwner={isOwner}
            sellerVerified={sellerVerified}
            ratingData={ratingData}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-10">
          {/* Left: content only */}
          <div className="lg:col-span-2 space-y-5">
            <SaleQuickSpecs listing={listing} />

            {/* About */}
            <SaleCard padding="lg" className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-lg font-semibold">About this listing</h2>
                <PromoVideoPlayer listingId={listing.id} />
              </div>
              <AudioListingPlayer listingId={listing.id} />
              <CollapsibleDescription description={listing.description} />
            </SaleCard>

            <SaleFeaturesGrid
              category={listing.category as ListingCategory}
              amenities={listing.amenities}
            />

            <SaleLocationCard
              city={listing.city}
              state={listing.state}
              zipCode={listing.postal_code}
              latitude={listing.latitude}
              longitude={listing.longitude}
            />

            {/* Pickup & delivery summary — explanation only, no pricing/CTAs */}
            <SaleCard padding="lg" className="space-y-3">
              <h2 className="text-lg font-semibold">Pickup &amp; delivery</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {offersPickup && (
                  <li className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-foreground/70" />
                    <span>
                      Buyer pickup from {locationShort || 'the seller’s area'}. You and the seller
                      coordinate the pickup time after checkout.
                    </span>
                  </li>
                )}
                {sellerDelivers && (
                  <li className="flex items-start gap-2">
                    <Truck className="h-4 w-4 mt-0.5 shrink-0 text-foreground/70" />
                    <span>
                      The seller delivers locally. Use the delivery check in the purchase card to
                      confirm your area before you buy.
                    </span>
                  </li>
                )}
                {freightEnabled && (
                  <li className="flex items-start gap-2">
                    <Package className="h-4 w-4 mt-0.5 shrink-0 text-foreground/70" />
                    <span>
                      Nationwide freight is available to the 48 contiguous states, quoted by
                      distance at checkout.
                    </span>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <EyeOff className="h-4 w-4 mt-0.5 shrink-0 text-foreground/70" />
                  <span>
                    The exact street address and handoff instructions are shared once your purchase
                    is confirmed.
                  </span>
                </li>
              </ul>
            </SaleCard>

            {/* Purchase confidence */}
            <SaleProtectionSection />

            {/* Reviews */}
            <SaleCard padding="lg" className="space-y-2">
              <h2 className="text-lg font-semibold">Reviews</h2>
              <ReviewsSection listingId={listing.id} />
            </SaleCard>

            {/* Similar listings */}
            <RelatedListings
              listingId={listing.id}
              category={listing.category}
              mode={listing.mode}
              address={listing.address}
              latitude={listing.latitude}
              longitude={listing.longitude}
            />
          </div>

          {/* Right: single sticky purchase card */}
          <div id="booking-widget" className="hidden lg:block">
            <div className="sticky top-24">
              <SalePurchaseCard
                listing={listing}
                host={host}
                isOwner={isOwner}
                sellerVerified={sellerVerified}
                ratingData={ratingData}
              />
            </div>
          </div>
        </div>
      </div>

      <SaleStickyActionBar
        listingId={listing.id}
        hostId={listing.host_id}
        priceSale={listing.price_sale}
        status={listing.status}
        listingTitle={listing.title}
        isOwner={isOwner}
      />
    </main>
  );
};

export default SaleListingLayout;
