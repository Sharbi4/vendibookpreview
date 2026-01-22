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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PhotoGallery from '@/components/listing-detail/PhotoGallery';
import BookingSummaryCard from '@/components/listing-detail/BookingSummaryCard';
import InquiryForm from '@/components/listing-detail/InquiryForm';
import HostCard from '@/components/listing-detail/HostCard';
import ReviewsSection from '@/components/reviews/ReviewsSection';
import RequirementsModal from '@/components/listing-detail/RequirementsModal';
import CollapsibleDescription from '@/components/listing-detail/CollapsibleDescription';
import QuickHighlights from '@/components/listing-detail/QuickHighlights';
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

const ListingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { listing, host, isLoading, error } = useListing(id);
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
        {/* Back Button */}
        <div className="container pt-4">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <Link to="/search">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        </div>

        {/* Photo Gallery - Full width on mobile */}
        <div className="container py-4">
          <PhotoGallery images={images} videos={videos} title={listing.title} />
        </div>

        {/* Main Content */}
        <div className="container pb-24 lg:pb-16">
          {/* Owner Banner - Show prominently if owner is viewing */}
          {isOwner && (
            <div className="mb-6">
              <OwnerBanner listingId={listing.id} variant="inline" />
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title & Key Info - Above the fold */}
              <div className="space-y-3">
                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <CategoryTooltip category={listing.category} side="bottom">
                    <Badge variant="secondary" className="text-xs cursor-help">
                      {CATEGORY_LABELS[listing.category]}
                    </Badge>
                  </CategoryTooltip>
                  <Badge variant={isRental ? 'default' : 'outline'} className="text-xs">
                    For {isRental ? 'Rent' : 'Sale'}
                  </Badge>
                  {listing.instant_book && isRental && (
                    <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                      Instant Book
                    </Badge>
                  )}
                </div>
                
                {/* Title */}
                <div className="flex items-start justify-between gap-3">
                  <h1 className="text-xl md:text-2xl font-bold text-foreground">
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
                
                {/* Location & Rating */}
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {locationShort && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{locationShort}</span>
                    </div>
                  )}
                  
                  {ratingData && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{ratingData.average}</span>
                      <span className="text-muted-foreground">
                        ({ratingData.count})
                      </span>
                    </div>
                  )}

                  {/* Share & Save buttons - Secondary CTAs */}
                  <div className="ml-auto flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-muted-foreground gap-1.5"
                      onClick={handleShare}
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                    <FavoriteButton 
                      listingId={id!} 
                      category={listing.category}
                      size="sm"
                    />
                  </div>
                </div>
              </div>

              {/* Section 1: Overview - Quick Highlights */}
              <div className="p-4 bg-muted/30 rounded-xl">
                <QuickHighlights
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
              </div>

              {/* Section 2: Description - Collapsed by default */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">About</h3>
                <CollapsibleDescription description={listing.description} />
              </div>

              {/* Section 2.5: Amenities */}
              {listing.amenities && listing.amenities.length > 0 && (
                <AmenitiesSection
                  category={listing.category}
                  amenities={listing.amenities}
                />
              )}

              {/* Section 3: Pricing & Fees */}
              <div className="p-4 bg-muted/30 rounded-xl">
                <PricingSection
                  isRental={isRental}
                  priceDaily={listing.price_daily}
                  priceWeekly={listing.price_weekly}
                  priceSale={listing.price_sale}
                  deliveryFee={listing.delivery_fee}
                  fulfillmentType={listing.fulfillment_type}
                  vendibookFreightEnabled={(listing as any).vendibook_freight_enabled}
                />
              </div>

              {/* Section 4: Availability is handled by BookingSummaryCard on desktop and StickyMobileCTA on mobile */}

              {/* Section 5: Requirements - Modal Entry Point (Rentals only) */}
              {isRental && <RequirementsModal listingId={listing.id} />}

              {/* Section 5: Host Card */}
              <HostCard
                hostId={listing.host_id}
                listingId={listing.id}
                hostName={host ? getPublicDisplayName(host) : null}
                hostAvatar={host?.avatar_url}
                isVerified={host?.identity_verified || false}
                memberSince={host?.created_at}
              />

              {/* Section 6: Reviews */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Reviews</h3>
                <ReviewsSection listingId={listing.id} />
              </div>

              {/* Section 7: Cancellation/Refund Policy (compact) */}
              <CancellationPolicyCard isRental={isRental} />

              {/* Section 8: Trust & Safety - Compact Grid with Modals */}
              <CompactTrustSection />
            </div>

            {/* Right Column - Booking/Inquiry Form (Desktop) - Sticky */}
            <div id="booking-widget" className="hidden lg:block">
              <div className="sticky top-24 space-y-6">
              {isOwner ? (
                <OwnerBanner listingId={listing.id} variant="card" />
              ) : isRental ? (
                <BookingSummaryCard
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
                <InquiryForm
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
