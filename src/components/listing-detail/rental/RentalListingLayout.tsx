import { Link } from 'react-router-dom';
import { ChevronRight, Home, MapPin, Share2, Star, Edit, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EnhancedPhotoGallery from '@/components/listing-detail/EnhancedPhotoGallery';
import CollapsibleDescription from '@/components/listing-detail/CollapsibleDescription';
import AudioListingPlayer from '@/components/listing/AudioListingPlayer';
import PromoVideoPlayer from '@/components/listing/PromoVideoPlayer';
import ReviewsSection from '@/components/reviews/ReviewsSection';
import RelatedListings from '@/components/listing-detail/RelatedListings';
import OwnerBanner from '@/components/listing-detail/OwnerBanner';
import { FavoriteButton } from '@/components/listing/FavoriteButton';
import { FeaturedBadge } from '@/components/listing/FeaturedBadge';
import { SaleCard } from '@/components/listing-detail/sale/SaleCard';
import { SaleQuickSpecs } from '@/components/listing-detail/sale/SaleQuickSpecs';
import { SaleFeaturesGrid } from '@/components/listing-detail/sale/SaleFeaturesGrid';
import { SaleLocationCard } from '@/components/listing-detail/sale/SaleSharedSections';
import { RentalBookingWidget } from '@/components/listing-detail/RentalBookingWidget';
import { WeeklyHoursDisplay } from '@/components/listing-detail/WeeklyHoursDisplay';
import { VendorSlotAvailability } from '@/components/listing-detail/VendorSlotAvailability';
import { ListingEventsSection } from '@/components/storefront';
import { isListingFeatured } from '@/lib/featured';
import { getPublicDisplayName } from '@/lib/displayName';
import { CATEGORY_LABELS, type ListingCategory } from '@/types/listing';
import { RentalPriceCard } from './RentalPriceCard';
import { RentalTermsCard } from './RentalTermsCard';
import { RentalHostCard } from './RentalHostCard';

interface RentalListingLayoutProps {
  listing: any;
  host: any;
  images: string[];
  videos: string[];
  isOwner: boolean;
  hostVerified: boolean;
  ratingData?: { average: number; count: number } | null;
  onShare: () => void;
}

const MULTI_SLOT_CATEGORIES = [
  'vendor_lot',
  'vendor_space',
  'ghost_kitchen',
  'food_truck',
  'food_trailer',
];

const EVENT_CATEGORIES = ['vendor_lot', 'vendor_space', 'ghost_kitchen'];

/**
 * Airbnb-style rental listing detail page.
 *
 * Mirrors the for-sale layout: gallery → title → one booking surface
 * (RentalBookingWidget, sticky on desktop / bottom bar on mobile) → content
 * cards. Every fact appears exactly once; booking logic lives untouched inside
 * RentalBookingWidget.
 */
export const RentalListingLayout = ({
  listing,
  host,
  images,
  videos,
  isOwner,
  hostVerified,
  ratingData,
  onShare,
}: RentalListingLayoutProps) => {
  const categoryLabel =
    CATEGORY_LABELS[listing.category as keyof typeof CATEGORY_LABELS] || 'Listing';
  const locationShort =
    [listing.city, listing.state].filter(Boolean).join(', ') ||
    (listing.address || listing.pickup_location_text || '').split(',').slice(-2).join(',').trim();
  const featured = isListingFeatured(listing);
  const instantBook = Boolean(listing.instant_book);
  const hourlyEnabled = Boolean(listing.hourly_enabled);

  const headlineRate = hourlyEnabled && listing.price_hourly
    ? `$${listing.price_hourly.toLocaleString()} / hour`
    : listing.price_daily
      ? `$${listing.price_daily.toLocaleString()} / day`
      : listing.price_weekly
        ? `$${listing.price_weekly.toLocaleString()} / week`
        : listing.price_monthly
          ? `$${listing.price_monthly.toLocaleString()} / month`
          : 'Rate on request';

  const showSlots =
    MULTI_SLOT_CATEGORIES.includes(listing.category) &&
    listing.total_slots &&
    listing.total_slots > 1;

  const bookingWidget = (instanceKey: string) => (
    <RentalBookingWidget
      key={instanceKey}
      listingId={listing.id}
      listingTitle={listing.title}
      hostId={listing.host_id}
      isOwner={isOwner}
      category={listing.category}
      priceDaily={listing.price_daily}
      priceWeekly={listing.price_weekly}
      priceMonthly={listing.price_monthly}
      priceHourly={listing.price_hourly}
      availableFrom={listing.available_from}
      availableTo={listing.available_to}
      instantBook={instantBook}
      hourlyEnabled={hourlyEnabled}
      dailyEnabled={listing.daily_enabled !== false}
      minHours={listing.min_hours}
      minDays={listing.rental_min_days}
      minNoticeHours={listing.min_notice_hours}
      totalSlots={listing.total_slots || 1}
      slotNames={listing.slot_names}
      fulfillmentType={listing.fulfillment_type}
      deliveryFee={listing.delivery_fee}
    />
  );

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
            <Link to="/" className="hover:text-foreground shrink-0" aria-label="Home">
              <Home className="h-3.5 w-3.5" />
            </Link>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <Link
              to={`/search?category=${listing.category}&mode=rent`}
              className="hover:text-foreground shrink-0"
            >
              {categoryLabel} for rent
            </Link>
            <ChevronRight className="h-3 w-3 shrink-0 hidden sm:block" />
            <span className="truncate hidden sm:block">{listing.title}</span>
          </nav>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" onClick={onShare} className="text-muted-foreground">
              <Share2 className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            <FavoriteButton
              listingId={listing.id}
              category={listing.category}
              size="sm"
              variant="underline"
            />
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
              <h1 className="text-[26px] md:text-[34px] font-semibold leading-[1.15] tracking-tight">
                {listing.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="hidden lg:inline text-xl md:text-2xl font-bold text-foreground">
                  {headlineRate}
                </span>
                <span className="hidden lg:inline">·</span>
                <span>{categoryLabel} for rent</span>
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
              {(featured || instantBook) && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {featured && <FeaturedBadge />}
                  {instantBook && (
                    <Badge variant="secondary" className="text-[11px] font-normal gap-1">
                      <Zap className="h-3 w-3" />
                      Instant Book
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

        {/* Mobile / tablet: the real booking calendar lives inline on the page
            (no bottom sheet). Desktop keeps the sticky card in the right rail. */}
        {!isOwner && (
          <section id="check-dates" className="lg:hidden mb-8 scroll-mt-24">
            <div className="mb-3">
              <h2 className="text-lg font-semibold tracking-tight">Check dates</h2>
              <p className="text-sm text-muted-foreground">
                {instantBook
                  ? 'Instant Book · pick your dates to see the full total'
                  : 'Request to book · pick your dates to see the full total'}
              </p>
            </div>
            {bookingWidget('mobile')}
          </section>
        )}



        <div className="grid lg:grid-cols-3 gap-6 lg:gap-12">
          {/* Left: content only */}
          <div className="lg:col-span-2 space-y-6">
            <SaleQuickSpecs listing={listing} />

            {/* About */}
            <SaleCard padding="lg" className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-lg font-semibold">About this rental</h2>
                {isOwner && <PromoVideoPlayer listingId={listing.id} />}
              </div>
              <AudioListingPlayer listingId={listing.id} />
              <CollapsibleDescription description={listing.description} />
            </SaleCard>

            <SaleFeaturesGrid
              category={listing.category as ListingCategory}
              amenities={listing.amenities}
            />

            <RentalTermsCard
              listingId={listing.id}
              availableFrom={listing.available_from}
              availableTo={listing.available_to}
              minDays={listing.rental_min_days}
              minHours={listing.min_hours}
              minNoticeHours={listing.min_notice_hours}
              hourlyEnabled={hourlyEnabled}
              instantBook={instantBook}
              fulfillmentType={listing.fulfillment_type}
              deliveryFee={listing.delivery_fee}
              deliveryFeeType={listing.delivery_fee_type}
              deliveryRadiusMiles={listing.delivery_radius_miles}
              locationShort={locationShort}
            >
              {hourlyEnabled && listing.hourly_schedule ? (
                <div className="pt-1 border-t border-border">
                  <div className="pt-3">
                    <WeeklyHoursDisplay schedule={listing.hourly_schedule} />
                  </div>
                </div>
              ) : null}
              {showSlots ? (
                <div className="pt-1 border-t border-border">
                  <div className="pt-3">
                    <VendorSlotAvailability
                      listingId={listing.id}
                      totalSlots={listing.total_slots}
                      slotNames={listing.slot_names}
                    />
                  </div>
                </div>
              ) : null}
            </RentalTermsCard>

            <RentalPriceCard
              priceHourly={listing.price_hourly}
              priceDaily={listing.price_daily}
              priceWeekly={listing.price_weekly}
              priceMonthly={listing.price_monthly}
              hourlyEnabled={hourlyEnabled}
              fulfillmentType={listing.fulfillment_type}
              deliveryFee={listing.delivery_fee}
              deliveryFeeType={listing.delivery_fee_type}
              instantBook={instantBook}
            />

            <SaleLocationCard
              city={listing.city}
              state={listing.state}
              zipCode={listing.postal_code ?? listing.zip_code}
              latitude={listing.latitude}
              longitude={listing.longitude}
            />

            <RentalHostCard
              hostId={listing.host_id}
              listingId={listing.id}
              listingTitle={listing.title}
              hostName={host ? getPublicDisplayName(host) : null}
              hostAvatar={host?.avatar_url}
              isVerified={hostVerified}
              memberSince={host?.created_at}
              lastActiveAt={host?.last_active_at}
              ratingData={ratingData}
              isOwner={isOwner}
            />

            {EVENT_CATEGORIES.includes(listing.category) && (
              <ListingEventsSection
                listingId={listing.id}
                hostId={listing.host_id}
                isOwner={isOwner}
              />
            )}

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

          {/* Right: single sticky booking card */}
          <div id="booking-widget" className="hidden lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pb-2 no-scrollbar">
              {bookingWidget('desktop')}
            </div>
          </div>
        </div>
      </div>

    </main>
  );
};

export default RentalListingLayout;
