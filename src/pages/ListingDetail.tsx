import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Loader2,
  Star,
  Edit,
  Share2,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { trackEventToDb } from '@/hooks/useAnalyticsEvents';
import { usePageTracking } from '@/hooks/usePageTracking';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import EnhancedPhotoGallery from '@/components/listing-detail/EnhancedPhotoGallery';
import EnhancedBookingSummaryCard from '@/components/listing-detail/EnhancedBookingSummaryCard';
import EnhancedInquiryForm from '@/components/listing-detail/EnhancedInquiryForm';
import EnhancedHostCard from '@/components/listing-detail/EnhancedHostCard';
import ReviewsSection from '@/components/reviews/ReviewsSection';
import RequirementsModal from '@/components/listing-detail/RequirementsModal';
import CollapsibleDescription from '@/components/listing-detail/CollapsibleDescription';
import EnhancedQuickHighlights from '@/components/listing-detail/EnhancedQuickHighlights';
import PricingSection from '@/components/listing-detail/PricingSection';
import { AmenitiesSection } from '@/components/listing-detail/AmenitiesSection';
import { StickyMobileCTA } from '@/components/listing-detail/StickyMobileCTA';
import { FavoriteButton } from '@/components/listing/FavoriteButton';
import CompactTrustSection from '@/components/trust/CompactTrustSection';
import CancellationPolicyCard from '@/components/trust/CancellationPolicyCard';
import AvailabilitySection from '@/components/listing-detail/AvailabilitySection';
import OwnerBanner from '@/components/listing-detail/OwnerBanner';
import { useListing } from '@/hooks/useListing';
import { useListingAverageRating } from '@/hooks/useReviews';
import { useTrackListingView } from '@/hooks/useListingAnalytics';
import { useAuth } from '@/contexts/AuthContext';
import { CATEGORY_LABELS } from '@/types/listing';
import { useEffect, useMemo } from 'react';
import { trackListingViewed } from '@/lib/analytics';
import { CategoryTooltip } from '@/components/categories/CategoryGuide';
import SEO from '@/components/SEO';
import JsonLd, { generateProductSchema, generateListingBreadcrumbSchema } from '@/components/JsonLd';
import { getPublicDisplayName } from '@/lib/displayName';
import { formatLastActive } from '@/hooks/useActivityTracker';

const ListingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { listing, host, isLoading, error } = useListing(id);
  
  // Track page views with Google Analytics
  usePageTracking();
  const { data: ratingData } = useListingAverageRating(id);
  const { trackView } = useTrackListingView();

  // Check if user is the owner of this listing
  const isOwner = user?.id && listing?.host_id && user.id === listing.host_id;

  // Handle share listing
  const handleShare = async () => {
    const listingUrl = `https://vendibook.com/listing/${id}`;
    
    trackEventToDb('share_listing', 'listing_detail', { listing_id: id });
    
    // Try native share on mobile
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: listing?.title || 'Check out this listing on Vendibook',
          url: listingUrl,
        });
        return;
      } catch {
        // User cancelled or share failed, fallback to copy
      }
    }
    
    // Fallback to clipboard copy
    try {
      await navigator.clipboard.writeText(listingUrl);
      toast({ title: 'Link copied!' });
    } catch {
      toast({ title: 'Failed to copy link', variant: 'destructive' });
    }
  };

  // Generate structured data for Google Shopping / Search
  // Must be called before any conditional returns to follow Rules of Hooks
  const productSchema = useMemo(() => {
    if (!listing || !host) return null;
    return generateProductSchema({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      category: listing.category,
      mode: listing.mode as 'rent' | 'sale',
      price_daily: listing.price_daily,
      price_weekly: listing.price_weekly,
      price_sale: listing.price_sale,
      cover_image_url: listing.cover_image_url,
      image_urls: listing.image_urls || [],
      address: listing.address,
      status: listing.status,
      host_name: host?.full_name,
      average_rating: ratingData?.average,
      review_count: ratingData?.count,
    });
  }, [listing, host, ratingData]);

  const breadcrumbSchema = useMemo(() => {
    if (!listing) return null;
    return generateListingBreadcrumbSchema({
      id: listing.id,
      title: listing.title,
      category: listing.category,
      mode: listing.mode as 'rent' | 'sale',
    });
  }, [listing]);

  // Track page view when listing loads
  useEffect(() => {
    if (id && listing && !isLoading) {
      trackView(id);
      trackListingViewed(id, listing.category);
    }
  }, [id, listing, isLoading, trackView]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 container py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            {error || 'Listing not found'}
          </h1>
          <p className="text-muted-foreground mb-8">
            This listing may have been removed or is no longer available.
          </p>
          <Button variant="dark-shine" asChild>
            <Link to="/search">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Search
            </Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const images = listing.image_urls || (listing.cover_image_url ? [listing.cover_image_url] : []);
  const videos = (listing as any).video_urls || [];
  const location = listing.address || listing.pickup_location_text;
  const isRental = listing.mode === 'rent';
  
  // Check if listing is featured (featured_enabled=true and featured_expires_at in the future)
  const isFeatured = (listing as any).featured_enabled && 
    (listing as any).featured_expires_at && 
    new Date((listing as any).featured_expires_at) > new Date();

  // Extract city/state from address for compact display
  const locationShort = location?.split(',').slice(-2).join(',').trim() || location;

  // SEO meta description
  const metaDescription = `${listing.mode === 'rent' ? 'Rent' : 'Buy'} this ${CATEGORY_LABELS[listing.category as keyof typeof CATEGORY_LABELS] || 'listing'}${location ? ` in ${locationShort}` : ''}. ${listing.description?.slice(0, 120) || ''}`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title={`${listing.title} | ${listing.mode === 'rent' ? 'For Rent' : 'For Sale'} - Vendibook`}
        description={metaDescription}
        canonical={`/listing/${listing.id}`}
        image={listing.cover_image_url || undefined}
      />
      {productSchema && breadcrumbSchema && (
        <JsonLd schema={[productSchema, breadcrumbSchema]} />
      )}
      <Header />

      <main className="flex-1">
        {/* Photo Gallery - Full bleed on mobile, contained on desktop */}
        <div className="md:container md:pt-6">
          <div className="md:px-0">
            <EnhancedPhotoGallery images={images} videos={videos} title={listing.title} />
          </div>
        </div>

        {/* Main Content */}
        <div className="container pt-6 pb-24 lg:pb-16">
          {/* Owner Banner - Show prominently if owner is viewing */}
          {isOwner && (
            <div className="mb-6">
              <OwnerBanner listingId={listing.id} variant="inline" />
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Left Column - Details */}
            <div className="lg:col-span-2 space-y-8">
              {/* Title Section - Airbnb Style */}
              <div className="space-y-4">
                {/* Title */}
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-2xl md:text-3xl font-semibold text-foreground leading-tight">
                    {listing.title}
                  </h1>
                  {isOwner && (
                    <Button asChild size="sm" variant="outline" className="shrink-0">
                      <Link to={`/edit-listing/${listing.id}`}>
                        <Edit className="h-4 w-4 mr-1.5" />
                        Edit
                      </Link>
                    </Button>
                  )}
                </div>

                {/* Meta Info Row */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  {ratingData && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-foreground text-foreground" />
                      <span className="font-medium">{ratingData.average}</span>
                      <span className="text-muted-foreground">
                        ({ratingData.count} review{ratingData.count !== 1 ? 's' : ''})
                      </span>
                    </div>
                  )}
                  
                  {ratingData && locationShort && (
                    <span className="text-muted-foreground">·</span>
                  )}
                  
                  {locationShort && (
                    <button className="flex items-center gap-1 text-foreground underline underline-offset-2 hover:text-primary transition-colors">
                      <MapPin className="h-4 w-4" />
                      <span>{locationShort}</span>
                    </button>
                  )}

                  {/* Host Last Active */}
                  {host?.last_active_at && (
                    <>
                      {(ratingData || locationShort) && (
                        <span className="text-muted-foreground">·</span>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${
                          formatLastActive(host.last_active_at) === 'Active now' 
                            ? 'bg-green-500 animate-pulse' 
                            : 'bg-muted-foreground/50'
                        }`} />
                        <span className="text-muted-foreground">
                          {formatLastActive(host.last_active_at)}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Action Buttons Row */}
                <div className="flex items-center gap-2 pt-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-foreground gap-2 underline underline-offset-2 hover:bg-muted/50 px-2"
                    onClick={handleShare}
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                  <FavoriteButton 
                    listingId={id!} 
                    category={listing.category}
                    size="sm"
                    variant="underline"
                  />
                  
                  {/* Badges - More subtle placement */}
                  <div className="ml-auto flex items-center gap-2">
                    {isFeatured && (
                      <Badge className="text-xs bg-amber-500 text-white border-0 flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        Featured
                      </Badge>
                    )}
                    <CategoryTooltip category={listing.category} side="bottom">
                      <Badge variant="secondary" className="text-xs cursor-help font-normal">
                        {CATEGORY_LABELS[listing.category]}
                      </Badge>
                    </CategoryTooltip>
                    <Badge variant={isRental ? 'default' : 'secondary'} className="text-xs font-normal">
                      For {isRental ? 'Rent' : 'Sale'}
                    </Badge>
                    {listing.instant_book && isRental && (
                      <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 font-normal">
                        ⚡ Instant Book
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Quick Highlights - Clean grid */}
              <EnhancedQuickHighlights
                fulfillmentType={listing.fulfillment_type}
                category={listing.category}
                highlights={listing.highlights}
                instantBook={listing.instant_book || false}
                deliveryFee={listing.delivery_fee}
                hoursOfAccess={listing.hours_of_access}
                weightLbs={listing.weight_lbs}
                lengthInches={listing.length_inches}
                widthInches={listing.width_inches}
                heightInches={listing.height_inches}
                isRental={isRental}
              />

              {/* Divider */}
              <div className="border-t border-border" />

              {/* About Section */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">About this listing</h2>
                <CollapsibleDescription description={listing.description} />
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Amenities / What's Included */}
              {listing.amenities && listing.amenities.length > 0 && (
                <>
                  <AmenitiesSection
                    category={listing.category}
                    amenities={listing.amenities}
                  />
                  <div className="border-t border-border" />
                </>
              )}

              {/* Pricing Section */}
              <PricingSection
                isRental={isRental}
                priceDaily={listing.price_daily}
                priceWeekly={listing.price_weekly}
                priceSale={listing.price_sale}
                deliveryFee={listing.delivery_fee}
                fulfillmentType={listing.fulfillment_type}
                vendibookFreightEnabled={(listing as any).vendibook_freight_enabled}
              />

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Requirements - Rentals only */}
              {isRental && (
                <>
                  <RequirementsModal listingId={listing.id} />
                  <div className="border-t border-border" />
                </>
              )}

              {/* Host Section */}
              <EnhancedHostCard
                hostId={listing.host_id}
                listingId={listing.id}
                hostName={host ? getPublicDisplayName(host) : null}
                hostAvatar={host?.avatar_url}
                isVerified={host?.identity_verified || false}
                memberSince={host?.created_at}
                lastActiveAt={host?.last_active_at}
              />

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Reviews Section */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Reviews</h2>
                <ReviewsSection listingId={listing.id} />
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Policies */}
              <CancellationPolicyCard isRental={isRental} />

              {/* Trust Section */}
              <CompactTrustSection />
            </div>

            {/* Right Column - Booking/Inquiry Form (Desktop) - Sticky */}
            <div id="booking-widget" className="hidden lg:block">
              <div className="sticky top-24 space-y-6">
              {isOwner ? (
                <OwnerBanner listingId={listing.id} variant="card" />
              ) : isRental ? (
                <EnhancedBookingSummaryCard
                  listingId={listing.id}
                  listingTitle={listing.title}
                  hostId={listing.host_id}
                  priceDaily={listing.price_daily}
                  priceWeekly={listing.price_weekly}
                  availableFrom={listing.available_from}
                  availableTo={listing.available_to}
                  instantBook={listing.instant_book || false}
                  coverImage={listing.cover_image_url}
                />
              ) : (
                <EnhancedInquiryForm
                  listingId={listing.id}
                  hostId={listing.host_id}
                  listingTitle={listing.title}
                  priceSale={listing.price_sale}
                  fulfillmentType={listing.fulfillment_type}
                  deliveryFee={listing.delivery_fee}
                  deliveryRadiusMiles={listing.delivery_radius_miles}
                  pickupLocation={listing.pickup_location_text || listing.address}
                  vendibookFreightEnabled={listing.vendibook_freight_enabled || false}
                  freightPayer={(listing.freight_payer === 'seller' ? 'seller' : 'buyer') as 'buyer' | 'seller'}
                  originAddress={listing.address}
                  weightLbs={listing.weight_lbs}
                  lengthInches={listing.length_inches}
                  widthInches={listing.width_inches}
                  heightInches={listing.height_inches}
                  freightCategory={listing.freight_category}
                  acceptCardPayment={listing.accept_card_payment ?? true}
                  acceptCashPayment={listing.accept_cash_payment ?? false}
                />
              )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Mobile CTA Bar */}
      <StickyMobileCTA
        listingId={listing.id}
        hostId={listing.host_id}
        isRental={isRental}
        priceDaily={listing.price_daily}
        priceSale={listing.price_sale}
        status={listing.status}
        instantBook={listing.instant_book || false}
        category={listing.category}
        fulfillmentType={listing.fulfillment_type}
        priceWeekly={listing.price_weekly}
        availableFrom={listing.available_from}
        availableTo={listing.available_to}
        pickupLocation={listing.pickup_location_text}
        deliveryFee={listing.delivery_fee}
        deliveryRadiusMiles={listing.delivery_radius_miles}
        listingTitle={listing.title}
      />

      <Footer />
    </div>
  );
};

export default ListingDetail;
