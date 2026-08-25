import { Link } from 'react-router-dom';
import {
  ChevronRight,
  Home,
  MapPin,
  Share2,
  Star,
  Edit,
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
import { SaleLocationCard } from './SaleSharedSections';

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
  const freightEnabled = Boolean(listing.vendibook_freight_enabled);

  return (
    <main className="sale-light flex-1">
      {/* Gallery first — the dominant visual on the page */}
      <div className="md:container md:pt-5">
        <EnhancedPhotoGallery images={images} videos={videos} title={listing.title} />
      </div>

      <div className="container pt-5 pb-40 md:pb-32 lg:pb-20">
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
        <header className="mb-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-[26px] md:text-[34px] font-semibold leading-[1.15] tracking-tight">{listing.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {/* Price shows once per breakpoint: here on desktop, in the purchase card on mobile. */}
                <span className="hidden lg:inline text-xl md:text-2xl font-bold text-foreground">
                  {listing.price_sale ? `$${listing.price_sale.toLocaleString()}` : 'Price on request'}
                </span>
                <span className="hidden lg:inline">·</span>
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
              {(featured || listing.price_negotiable || freightEnabled) && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {featured && <FeaturedBadge />}
                  {listing.price_negotiable && (
                    <Badge variant="secondary" className="text-[11px] font-normal">
                      Offers accepted
                    </Badge>
                  )}
                  {freightEnabled && (
                    <Badge variant="secondary" className="text-[11px] font-normal">
                      Nationwide freight
                    </Badge>
                  )}
                </div>
              )}
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
            instanceId="mobile"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-12">
          {/* Left: content only */}
          <div className="lg:col-span-2 space-y-6">
            <SaleQuickSpecs listing={listing} />

            {/* About */}
            <SaleCard padding="lg" className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-lg font-semibold">About this listing</h2>
                {isOwner && <PromoVideoPlayer listingId={listing.id} />}
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
              subcategory={listing.subcategory}
            />
          </div>

          {/* Right: single sticky purchase card */}
          <div id="booking-widget" className="hidden lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pb-2 no-scrollbar">
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
