import { deliveryRateLabel } from '@/lib/fulfillment/delivery';
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
import EnhancedHostCard from '@/components/listing-detail/EnhancedHostCard';
import MessageHostForm from '@/components/messaging/MessageHostForm';
import ReviewsSection from '@/components/reviews/ReviewsSection';
import RequirementsModal from '@/components/listing-detail/RequirementsModal';
import CollapsibleDescription from '@/components/listing-detail/CollapsibleDescription';
import AudioListingPlayer from '@/components/listing/AudioListingPlayer';
import PromoVideoPlayer from '@/components/listing/PromoVideoPlayer';
import EnhancedQuickHighlights from '@/components/listing-detail/EnhancedQuickHighlights';
import PricingSection from '@/components/listing-detail/PricingSection';
import { AmenitiesSection } from '@/components/listing-detail/AmenitiesSection';
import EquipmentReadinessSummary from '@/components/listing-detail/EquipmentReadinessSummary';

import { ReportIssueButton } from '@/components/support/ReportIssueButton';

import { StickyMobileCTA } from '@/components/listing-detail/StickyMobileCTA';
import ListingConciergeBox from '@/components/listing-detail/ListingConciergeBox';
import { FavoriteButton } from '@/components/listing/FavoriteButton';
import CompactTrustSection from '@/components/trust/CompactTrustSection';
import CancellationPolicyCard from '@/components/trust/CancellationPolicyCard';
import { ListingEventsSection } from '@/components/storefront';
import ListingLocationMap from '@/components/listing-detail/ListingLocationMap';
import RelatedListings from '@/components/listing-detail/RelatedListings';
import { TechSpecsGrid } from '@/components/listing-detail/TechSpecsGrid';
import CommercialProductBar from '@/components/listing-detail/CommercialProductBar';
import SellerTrustPanel from '@/components/listing-detail/SellerTrustPanel';
import KeySpecsStrip from '@/components/listing-detail/KeySpecsStrip';
import SaleListingMobile from '@/components/listing-detail/sale/SaleListingMobile';
import { FinancingActionPanel } from '@/components/listing-detail/sale/FinancingActionPanel';
import { ListingPaymentMethods } from '@/components/listing-detail/ListingPaymentMethods';
import { SaleTrustStrip, SaleProtectionSection, SaleLocationCard, SaleBrowseMore } from '@/components/listing-detail/sale/SaleSharedSections';

import { VendorSlotAvailability } from '@/components/listing-detail/VendorSlotAvailability';
import { WeeklyHoursDisplay } from '@/components/listing-detail/WeeklyHoursDisplay';
import { RentalBookingWidget } from '@/components/listing-detail/RentalBookingWidget';
import { BookingWidget } from '@/components/listing-detail/BookingWidget';
import ListingHowItWorks from '@/components/listing-detail/ListingHowItWorks';
import ListingExplainerVideo from '@/components/listing-detail/ListingExplainerVideo';

import { ListingHighlightsCard } from '@/components/transaction';
import OwnerBanner from '@/components/listing-detail/OwnerBanner';
import { GetVerifiedButton } from '@/components/verification/GetVerifiedButton';
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { useSellerIdentityBadgeMap } from '@/hooks/useSellerIdentityBadgeMap';
import { useListing } from '@/hooks/useListing';
import ListingUnavailable from '@/components/listing-detail/ListingUnavailable';
import { isListingPubliclyVisible } from '@/lib/listings/publicVisibility';
import { useListingAverageRating, useListingReviews } from '@/hooks/useReviews';
import { useTrackListingView } from '@/hooks/useListingAnalytics';
import { useAuth } from '@/contexts/AuthContext';
import { CATEGORY_LABELS } from '@/types/listing';
import { useEffect, useMemo } from 'react';
import { trackListingViewed } from '@/lib/analytics';
import { CategoryTooltip } from '@/components/categories/CategoryGuide';
import SEO from '@/components/SEO';
import JsonLd, { generateProductSchema, generateListingBreadcrumbSchema, generateListingLocalBusinessSchema, generateListingFAQSchema } from '@/components/JsonLd';
import { getPublicDisplayName } from '@/lib/displayName';
import { formatLastActive } from '@/hooks/useActivityTracker';
import { resolveListingBrand, getBrandFieldLabel } from '@/lib/resolveListingBrand';
import { isListingFeatured } from '@/lib/featured';
import { FeaturedBadge } from '@/components/listing/FeaturedBadge';

const ListingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { listing, host, isLoading, error } = useListing(id);

  /**
   * Paid Identity Verified state for the seller/host, read from the sanitized
   * server function — never the legacy profiles.identity_verified column.
   */
  const sellerBadges = useSellerIdentityBadgeMap([listing?.host_id]);
  const sellerIdentityVerified = !!(listing?.host_id && sellerBadges[listing.host_id]?.verified);
  
  // Track page views with Google Analytics
  usePageTracking();
  const { data: ratingData } = useListingAverageRating(id);
  const { data: reviews } = useListingReviews(id);
  const { trackView } = useTrackListingView();

  // Check if user is the owner of this listing
  const isOwner = user?.id && listing?.host_id && user.id === listing.host_id;

  // Admins keep access to the private management view of unavailable listings.
  const { data: isAdminViewer = false } = useQuery({
    queryKey: ['is-admin', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.rpc('is_admin', { user_id: user!.id });
      return Boolean(data);
    },
  });

  // Share URL uses a pretty route on vendibook.com
  // The /share/listing/:id route redirects humans to the SPA
  // Social bots get routed to the edge function for rich OG tags + JSON-LD
  const shareUrl = `https://vendibook.com/share/listing/${id}`;

  // Handle share listing
  const handleShare = async () => {
    trackEventToDb('share_listing', 'listing_detail', { listing_id: id });
    
    // Try native share on mobile
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: listing?.title || 'Check out this listing on Vendibook',
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or share failed, fallback to copy
      }
    }
    
    // Fallback to clipboard copy
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Link copied!' });
    } catch {
      toast({ title: 'Failed to copy link', variant: 'destructive' });
    }
  };

  // Generate structured data for Google Shopping / Search
  // IMPORTANT: Physical locations (kitchens/lots/spaces) use LocalBusiness ONLY
  // Trucks/trailers/equipment use Product ONLY — never both on same page
  const physicalCategories = ['ghost_kitchen', 'vendor_lot', 'vendor_space'];
  const isPhysicalLocation = listing ? physicalCategories.includes(listing.category) : false;

  const productSchema = useMemo(() => {
    if (!listing || isPhysicalLocation) return null;
    return generateProductSchema({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      category: listing.category,
      mode: listing.mode as 'rent' | 'sale',
      price_daily: listing.price_daily,
      price_weekly: listing.price_weekly,
      price_monthly: (listing as any).price_monthly ?? null,
      price_sale: listing.price_sale,
      condition: ((listing as any).condition as 'new' | 'used' | 'refurbished' | null) ?? null,
      cover_image_url: listing.cover_image_url,
      image_urls: listing.image_urls || [],
      address: listing.address,
      status: listing.status,
      host_name: getPublicDisplayName(host, 'Host'),
      host_business_name: host?.business_name,
      brand: (listing as any).brand ?? null,
      make: (listing as any).make ?? null,
      manufacturer: (listing as any).manufacturer ?? null,
      average_rating: ratingData?.average,
      review_count: ratingData?.count,
      reviews: reviews || [],
      length_inches: listing.length_inches,
      width_inches: listing.width_inches,
      height_inches: listing.height_inches,
      weight_lbs: listing.weight_lbs,
    });
  }, [listing, host, ratingData, reviews, isPhysicalLocation]);

  const breadcrumbSchema = useMemo(() => {
    if (!listing) return null;
    return generateListingBreadcrumbSchema({
      id: listing.id,
      title: listing.title,
      category: listing.category,
      mode: listing.mode as 'rent' | 'sale',
    });
  }, [listing]);

  // LocalBusiness schema ONLY for physical locations (kitchens, vendor spaces/lots)
  const localBusinessSchema = useMemo(() => {
    if (!listing || !isPhysicalLocation) return null;
    return generateListingLocalBusinessSchema({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      category: listing.category,
      mode: listing.mode as 'rent' | 'sale',
      address: listing.address,
      latitude: listing.latitude,
      longitude: listing.longitude,
      price_daily: listing.price_daily,
      price_weekly: listing.price_weekly,
      price_sale: listing.price_sale,
    });
  }, [listing, isPhysicalLocation]);

  // FAQ schema auto-generated from listing attributes
  const faqSchema = useMemo(() => {
    if (!listing) return null;
    return generateListingFAQSchema({
      category: listing.category,
      mode: listing.mode as 'rent' | 'sale',
      status: listing.status,
      address: listing.address,
      price_daily: listing.price_daily,
      price_weekly: listing.price_weekly,
      price_sale: listing.price_sale,
      instant_book: listing.instant_book,
      fulfillment_type: listing.fulfillment_type,
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

  // Unavailable listings: owners and admins keep the private management view
  // (labelled by OwnerBanner); everyone else gets a neutral page with no
  // private details and no purchase controls.
  if (listing && !isListingPubliclyVisible(listing) && !isOwner && !isAdminViewer) {
    return <ListingUnavailable />;
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SEO
          title="Listing Not Found"
          description="This listing may have been removed or is no longer available on Vendibook."
          noindex={true}
        />
        <Header />
        <div className="flex-1 container py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            {error || 'Listing not found'}
          </h1>
          <p className="text-muted-foreground mb-8">
            This listing may have been removed or is no longer available.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="dark-shine" asChild>
              <Link to="/search">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Search
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/search?category=food_truck&mode=sale">
                Browse Food Trucks for Sale
              </Link>
            </Button>
          </div>
          {/* Crawlable internal links for SEO */}
          <nav className="mt-12 text-sm text-muted-foreground" aria-label="Browse categories">
            <p className="mb-3 font-medium">Browse by category:</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/search?category=food_truck&mode=rent" className="underline hover:text-primary">Food Trucks for Rent</Link>
              <Link to="/search?category=food_truck&mode=sale" className="underline hover:text-primary">Food Trucks for Sale</Link>
              <Link to="/search?category=food_trailer&mode=sale" className="underline hover:text-primary">Food Trailers for Sale</Link>
              <Link to="/search?category=ghost_kitchen&mode=rent" className="underline hover:text-primary">Shared Kitchens</Link>
              <Link to="/search?category=vendor_space&mode=rent" className="underline hover:text-primary">Vendor Spaces</Link>
            </div>
          </nav>
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
  const isFeatured = isListingFeatured(listing as any);



  // Extract city/state from address for compact display
  const locationShort = location?.split(',').slice(-2).join(',').trim() || location;

  // SEO: Build keyword-rich meta title & description
  const categoryLabel = CATEGORY_LABELS[listing.category as keyof typeof CATEGORY_LABELS] || 'Listing';
  const modeLabel = listing.mode === 'rent' ? 'for Rent' : 'for Sale';
  const priceText = listing.mode === 'rent'
    ? (listing.price_daily ? `$${listing.price_daily}/day` : listing.price_weekly ? `$${listing.price_weekly}/week` : '')
    : (listing.price_sale ? `$${listing.price_sale.toLocaleString()}` : '');
  
  // Title: "Food Truck for Rent in Tampa, FL | $150/day - Vendibook" (under 60 chars ideal)
  const seoTitle = [
    listing.title,
    modeLabel,
    locationShort ? `in ${locationShort}` : '',
  ].filter(Boolean).join(' ');

  // Description: keyword-rich, under 160 chars, action-oriented
  const descSnippet = listing.description?.replace(/\s+/g, ' ').slice(0, 80)?.trim() || '';
  const metaDescription = [
    `${listing.mode === 'rent' ? 'Rent' : 'Buy'} this ${categoryLabel.toLowerCase()}`,
    locationShort ? `in ${locationShort}` : '',
    priceText ? `starting at ${priceText}` : '',
    '— book instantly on Vendibook.',
    descSnippet,
  ].filter(Boolean).join(' ').slice(0, 160);

  // Determine listing price for OG product tags
  const listingPrice = listing.mode === 'rent'
    ? (listing.price_daily || listing.price_weekly || undefined)
    : (listing.price_sale || undefined);

  // Resolve brand for OG meta
  const listingBrand = resolveListingBrand({
    category: listing.category,
    brand: (listing as any).brand ?? null,
    make: (listing as any).make ?? null,
    manufacturer: (listing as any).manufacturer ?? null,
    host_business_name: host?.business_name ?? null,
    host_display_name: host ? getPublicDisplayName(host, 'Host') : null,
  });

  // Resolve condition for OG meta
  const listingCondition = ((listing as any).condition as 'new' | 'used' | 'refurbished') || 'used';

  // Glass card styling applied to desktop sale-page sections
  const saleGlass = !isRental ? 'rounded-[24px] bg-sale-card ring-hairline p-5 sm:p-6' : '';

  // Build comprehensive JSON-LD schemas array
  const schemas: object[] = [];
  if (productSchema) schemas.push(productSchema);
  if (breadcrumbSchema) schemas.push(breadcrumbSchema);
  if (localBusinessSchema) schemas.push(localBusinessSchema);
  if (faqSchema) schemas.push(faqSchema);

  return (
    <div className={`min-h-screen flex flex-col ${!isRental ? 'bg-sale-page text-foreground' : 'bg-background'}`}>

      <SEO
        title={seoTitle}
        description={metaDescription}
        canonical={`/listing/${listing.id}`}
        image={listing.cover_image_url || undefined}
        type="product"
        product={listingPrice ? {
          price: listingPrice,
          currency: 'USD',
          availability: listing.status === 'published' ? 'in_stock' : 'out_of_stock',
          condition: listingCondition,
          brand: listingBrand,
          retailerItemId: listing.id,
        } : undefined}
      />
      {schemas.length > 0 && (
        <JsonLd schema={schemas} />
      )}
      <Header />

      {/* Commercial product bar — Amazon/Best Buy style.
          Hidden on sale mobile because SaleListingMobile mounts its own breadcrumb + share/favorite row
          (prevents duplicate breadcrumb, duplicate Save button, and clipped content under the sticky header). */}
      <div className={!isRental ? 'hidden lg:block' : ''}>
        <CommercialProductBar
          listingId={listing.id}
          category={listing.category}
          mode={listing.mode as 'rent' | 'sale'}
          title={listing.title}
          rating={ratingData?.average}
          reviewCount={ratingData?.count}
          onShare={handleShare}
        />
      </div>

      {!isRental && (
        <SaleListingMobile
          listing={listing}
          host={host}
          images={images}
          videos={videos}
          isOwner={!!isOwner}
          ratingData={ratingData}
          onShare={handleShare}
        />
      )}

      <main className={`flex-1 ${!isRental ? 'hidden lg:block' : ''}`}>
        {/* Photo Gallery - Full bleed on mobile, contained on desktop */}
        <div className="md:container md:pt-4">
          <div className="md:px-0">
            <EnhancedPhotoGallery images={images} videos={videos} title={listing.title} />
          </div>
          <div className="px-4 md:px-0">
            <ListingExplainerVideo mode={listing.mode as 'rent' | 'sale'} listingId={listing.id} />
          </div>
        </div>


        {/* Main Content */}
        <div className="container pt-4 pb-24 lg:pb-16">
          {/* Owner Banner - Show prominently if owner is viewing */}
          {isOwner && (
            <div className="mb-6">
              <OwnerBanner listingId={listing.id} variant="inline" status={listing.status as any} />
            </div>
          )}

          {/* Mobile-only: contextual How-It-Works guidance for rentals.
              (Sale mobile mounts its own copy inside SaleListingMobile.) */}
          {isRental && (
            <div className="lg:hidden mb-5" id="howitworks-mobile-anchor">
              <ListingHowItWorks listing={listing as any} isOwner={!!isOwner} />
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6 lg:gap-10">
            {/* Left Column - Details */}
            <div className="lg:col-span-2 space-y-5">

              {/* Title Section - Airbnb Style */}
              <div className="space-y-2">
                {/* Title */}
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-2xl md:text-3xl font-semibold text-foreground leading-tight">
                    {listing.title}
                    {locationShort && (
                      <span className="text-muted-foreground font-normal text-lg md:text-xl block mt-1">
                        {categoryLabel} {modeLabel} in {locationShort}
                      </span>
                    )}
                  </h1>
                  {isOwner && (
                    <div className="flex items-center gap-2 shrink-0">
                      <GetVerifiedButton size="sm" showPrice={false} />
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/edit-listing/${listing.id}`}>
                          <Edit className="h-4 w-4 mr-1.5" />
                          Edit
                        </Link>
                      </Button>
                    </div>
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

                {/* Key specs at-a-glance — commercial style */}
                <KeySpecsStrip
                  category={listing.category}
                  mode={listing.mode as 'rent' | 'sale'}
                  fulfillmentType={listing.fulfillment_type}
                  instantBook={listing.instant_book || false}
                  deliveryFee={listing.delivery_fee}
                  inStock={listing.status === 'published'}
                />

                {/* Action Buttons Row */}
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-foreground gap-2 underline underline-offset-2 hover:bg-muted/50 px-2"
                    onClick={handleShare}
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                  {!isOwner && (
                    <Link
                      to={`/referral?source=listing_share&listing=${id}`}
                      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1"
                    >
                      Share & earn a referral reward →
                    </Link>
                  )}
                  <FavoriteButton 
                    listingId={id!} 
                    category={listing.category}
                    size="sm"
                    variant="underline"
                  />
                  
                  {/* Badges - More subtle placement */}
                  <div className="ml-auto flex items-center gap-2">
                    {isFeatured && (
                      <FeaturedBadge listing={listing as any} size="md" />
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

                {/* Trust strip — premium glass, sale listings */}
                {!isRental && <SaleTrustStrip />}

                {/* Vendibook Concierge Box — soft-conversion above the fold.
                    "Check Availability" opens the TellVendibook concierge modal (low-friction lead);
                    the booking widget further down remains the high-intent secondary path. */}
                {!isOwner && (
                  <ListingConciergeBox
                    listingId={listing.id}
                    listingTitle={listing.title}
                    city={listing.city || undefined}
                    category={listing.category}
                    isOwner={isOwner || false}
                  />
                )}

                {/* Inline Message Form */}
                {!isOwner && (
                  <div className={saleGlass || undefined}>
                    <MessageHostForm
                      listingId={listing.id}
                      hostId={listing.host_id}
                      listingTitle={listing.title}
                    />
                  </div>
                )}

                {/* Divider */}
                {isRental && <div className="border-t border-border" />}

                {/* Seller Trust Panel — Why buy from this seller */}
                <div className={saleGlass || undefined}>
                  <SellerTrustPanel
                    hostId={listing.host_id}
                    hostName={host ? getPublicDisplayName(host) : null}
                    isVerified={sellerIdentityVerified}
                    memberSince={host?.created_at}
                    lastActiveAt={host?.last_active_at}
                    city={listing.city || (host as any)?.public_city}
                    state={listing.state || (host as any)?.public_state}
                    averageRating={ratingData?.average}
                    reviewCount={ratingData?.count}
                    isRental={isRental}
                  />
                </div>

                {/* Host/Seller Detailed Section */}
                <div className={saleGlass || undefined}>
                  <EnhancedHostCard
                    hostId={listing.host_id}
                    listingId={listing.id}
                    hostName={host ? getPublicDisplayName(host) : null}
                    hostAvatar={host?.avatar_url}
                    isVerified={sellerIdentityVerified}
                    memberSince={host?.created_at}
                    lastActiveAt={host?.last_active_at}
                    isRental={isRental}
                    listingTitle={listing.title}
                  />
                </div>

                {/* Divider */}
                {isRental && <div className="border-t border-border" />}


              {/* Technical Specifications - NEW */}
              <div className={`${saleGlass} ${!isRental ? 'space-y-5' : 'space-y-5'}`.trim()}>
              <TechSpecsGrid
                category={listing.category}
                lengthInches={listing.length_inches}
                widthInches={listing.width_inches}
                heightInches={listing.height_inches}
                weightLbs={listing.weight_lbs}
                amenities={listing.amenities}
              />

              {/* Listing Details — visible schema-matching info for Google compliance */}
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">Listing Details</h2>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">{getBrandFieldLabel(listing.category)}</dt>
                    <dd className="font-medium text-foreground">
                      {resolveListingBrand({
                        category: listing.category,
                        brand: (listing as any).brand,
                        make: (listing as any).make,
                        manufacturer: (listing as any).manufacturer,
                        host_business_name: host?.business_name,
                        host_display_name: getPublicDisplayName(host, 'Host'),
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Category</dt>
                    <dd className="font-medium text-foreground">{categoryLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Listing Type</dt>
                    <dd className="font-medium text-foreground">{isRental ? 'For Rent' : 'For Sale'}</dd>
                  </div>
                  {!isRental && (
                    <div>
                      <dt className="text-muted-foreground">Condition</dt>
                      <dd className="font-medium text-foreground capitalize">
                        {(listing as any).condition || 'Used'}
                      </dd>
                    </div>
                  )}
                  {locationShort && (
                    <div>
                      <dt className="text-muted-foreground">Location</dt>
                      <dd className="font-medium text-foreground">{locationShort}</dd>
                    </div>
                  )}
                  {!isRental && (
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">Pickup &amp; delivery</dt>
                      <dd className="text-foreground space-y-1">
                        {(listing.fulfillment_type === 'pickup' || listing.fulfillment_type === 'both') && (
                          <p>
                            Pickup{locationShort ? ` near ${locationShort}` : ''} — the exact pickup address unlocks for the buyer right after payment, then you and the seller confirm the pickup.
                          </p>
                        )}
                        {(listing.fulfillment_type === 'delivery' || listing.fulfillment_type === 'both') && (
                          <p>
                            Seller delivers{listing.delivery_radius_miles ? ` within ${listing.delivery_radius_miles} miles` : ''}
                            {deliveryRateLabel(listing.delivery_fee, (listing as any).delivery_fee_type)
                              ? ` — ${deliveryRateLabel(listing.delivery_fee, (listing as any).delivery_fee_type)}`
                              : ''}. You enter your delivery address at checkout.
                          </p>
                        )}
                        {!listing.fulfillment_type && (
                          <p>Pickup, delivery, or transfer details are coordinated directly with the seller.</p>
                        )}
                      </dd>
                    </div>
                  )}
                  {!isRental && (
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">Return Policy</dt>
                      <dd className="text-foreground">
                        All asset sales are final. Review listing details and confirm terms with the seller before purchase.
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
              </div>

              {isRental && <div className="border-t border-border" />}

              {/* Quick Highlights - Clean grid */}
              <div className={saleGlass || undefined}>
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
              </div>

              {/* Divider */}
              {isRental && <div className="border-t border-border" />}

              {/* About Section */}
              <div className={`${saleGlass} space-y-3`.trim()}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold text-foreground">About this listing</h2>
                  <PromoVideoPlayer listingId={listing.id} />
                </div>
                <AudioListingPlayer listingId={listing.id} />
                <CollapsibleDescription description={listing.description} />
              </div>

              {/* Divider */}
              {isRental && <div className="border-t border-border" />}

              {/* Amenities / What's Included */}
              {listing.amenities && listing.amenities.length > 0 && (
                <>
                  <div className={saleGlass || undefined}>
                    <AmenitiesSection
                      category={listing.category}
                      amenities={listing.amenities}
                    />
                  </div>
                  {isRental && <div className="border-t border-border" />}
                </>
              )}

              {/* Seller-confirmed equipment specs and readiness */}
              <EquipmentReadinessSummary
                listingId={listing.id}
                category={listing.category}
                mode={listing.mode}
              />



              {/* Pricing Section */}
              <div className={saleGlass || undefined}>
                <PricingSection
                  isRental={isRental}
                  priceHourly={listing.price_hourly}
                  priceDaily={listing.price_daily}
                  priceWeekly={listing.price_weekly}
                  priceMonthly={listing.price_monthly}
                  priceSale={listing.price_sale}
                  deliveryFee={listing.delivery_fee}
                  fulfillmentType={listing.fulfillment_type}
                  vendibookFreightEnabled={(listing as any).vendibook_freight_enabled}
                />
                <ListingHighlightsCard listing={listing as any} />
              </div>

              {/* Divider */}
              {isRental && <div className="border-t border-border" />}

              {/* Requirements - Rentals only */}
              {isRental && (
                <>
                  <RequirementsModal listingId={listing.id} />
                  <div className="border-t border-border" />
                </>
              )}


              {/* Weekly Operating Hours - Show for hourly listings */}
              {isRental && (listing as any).hourly_enabled && (listing as any).hourly_schedule && (
                <>
                  <WeeklyHoursDisplay schedule={(listing as any).hourly_schedule} />
                  <div className="border-t border-border" />
                </>
              )}

              {/* Slot Availability - Show for categories with multiple slots */}
              {['vendor_lot', 'vendor_space', 'ghost_kitchen', 'food_truck', 'food_trailer'].includes(listing.category) && 
               listing.total_slots && listing.total_slots > 1 && (
                <>
                  <VendorSlotAvailability
                    listingId={listing.id}
                    totalSlots={listing.total_slots}
                    slotNames={listing.slot_names}
                  />
                  <div className="border-t border-border" />
                </>
              )}

              {/* Events & Updates Section - Vendor Spaces / Locations */}
              {(listing.category === 'vendor_lot' || listing.category === 'vendor_space' || listing.category === 'ghost_kitchen') && (
                <ListingEventsSection
                  listingId={listing.id}
                  hostId={listing.host_id}
                  isOwner={isOwner || false}
                />
              )}

              {/* Divider */}
              {isRental && <div className="border-t border-border" />}

              {/* Reviews Section */}
              <div className={`${saleGlass} space-y-2`.trim()}>
                <h2 className="text-lg font-semibold text-foreground">Reviews</h2>
                <ReviewsSection listingId={listing.id} />
              </div>

              {/* Location */}
              {!isRental ? (
                <SaleLocationCard
                  city={listing.city}
                  state={listing.state}
                  zipCode={(listing as any).zip_code}
                  latitude={listing.latitude}
                  longitude={listing.longitude}
                />
              ) : (
                location && locationShort && (
                  <>
                    <div className="border-t border-border" />
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold text-foreground">Where you'll be</h2>
                      <p className="text-muted-foreground text-sm flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        {locationShort}
                      </p>
                    </div>
                    <div className="border-t border-border" />
                  </>
                )
              )}

              {/* Policies */}
              <CancellationPolicyCard isRental={isRental} />

              {/* Related Listings - Internal Linking for SEO */}
              <RelatedListings
                listingId={listing.id}
                category={listing.category}
                mode={listing.mode}
                address={listing.address}
                latitude={listing.latitude}
                longitude={listing.longitude}
              />

              {/* Payment methods — every listing (sale and rent) */}
              <ListingPaymentMethods listing={listing} />

              {/* Purchase protection + browse — sale listings */}
              {!isRental && (
                <>
                  <FinancingActionPanel listing={listing} host={host} />
                  <SaleProtectionSection />
                  <SaleBrowseMore />
                </>
              )}

              {/* Trust Section */}
              {isRental && <CompactTrustSection />}
            </div>

            {/* Right Column - Booking/Inquiry Widget (Desktop) - Sticky */}
            <div id="booking-widget" className="hidden lg:block">
              <div className="sticky top-24 space-y-6">
                <ListingHowItWorks listing={listing as any} isOwner={!!isOwner} />
                {isRental ? (
                  <RentalBookingWidget
                    listingId={listing.id}
                    listingTitle={listing.title}
                    hostId={listing.host_id}
                    isOwner={isOwner || false}
                    category={listing.category}
                    priceDaily={listing.price_daily}
                    priceWeekly={listing.price_weekly}
                    priceMonthly={listing.price_monthly}
                    priceHourly={(listing as any).price_hourly}
                    availableFrom={listing.available_from}
                    availableTo={listing.available_to}
                    instantBook={listing.instant_book || false}
                    hourlyEnabled={(listing as any).hourly_enabled || false}
                    dailyEnabled={(listing as any).daily_enabled !== false}
                    totalSlots={listing.total_slots || 1}
                    slotNames={listing.slot_names}
                    fulfillmentType={listing.fulfillment_type}
                    deliveryFee={listing.delivery_fee}
                  />
                ) : (
                  <BookingWidget
                    listingId={listing.id}
                    listingTitle={listing.title}
                    hostId={listing.host_id}
                    isOwner={isOwner || false}
                    isRental={false}
                    priceSale={listing.price_sale}
                    fulfillmentType={listing.fulfillment_type}
                    deliveryFee={listing.delivery_fee}
                    vendibookFreightEnabled={listing.vendibook_freight_enabled || false}
                    freightPayer={(listing.freight_payer === 'seller' ? 'seller' : 'buyer') as 'buyer' | 'seller'}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Mobile CTA Bar */}
      {/* Sticky Mobile CTA Bar (rental only — sale uses SaleStickyActionBar inside SaleListingMobile) */}
      {isRental && (
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
        priceMonthly={listing.price_monthly}
        priceHourly={(listing as any).price_hourly}
        hourlyEnabled={(listing as any).hourly_enabled || false}
        dailyEnabled={(listing as any).daily_enabled !== false}
        availableFrom={listing.available_from}
        availableTo={listing.available_to}
        pickupLocation={listing.pickup_location_text}
        deliveryFee={listing.delivery_fee}
        deliveryRadiusMiles={listing.delivery_radius_miles}
        listingTitle={listing.title}
        totalSlots={listing.total_slots || 1}
        slotNames={listing.slot_names}
      />
      )}

      {/* SEO: Crawlable internal links for deep crawl paths */}
      <nav className={`container py-8 border-t border-border ${!isRental ? 'hidden lg:block' : ''}`} aria-label="Browse more listings">
        <h2 className="text-lg font-semibold text-foreground mb-4">Browse More on Vendibook</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Link to="/search?category=food_truck&mode=sale" className="text-muted-foreground hover:text-primary underline underline-offset-2">Food Trucks for Sale</Link>
          <Link to="/search?category=food_truck&mode=rent" className="text-muted-foreground hover:text-primary underline underline-offset-2">Food Trucks for Rent</Link>
          <Link to="/search?category=food_trailer&mode=sale" className="text-muted-foreground hover:text-primary underline underline-offset-2">Food Trailers for Sale</Link>
          <Link to="/search?category=food_trailer&mode=rent" className="text-muted-foreground hover:text-primary underline underline-offset-2">Food Trailers for Rent</Link>
          <Link to="/search?category=ghost_kitchen&mode=rent" className="text-muted-foreground hover:text-primary underline underline-offset-2">Shared Kitchens for Rent</Link>
          <Link to="/search?category=vendor_space&mode=rent" className="text-muted-foreground hover:text-primary underline underline-offset-2">Vendor Spaces for Rent</Link>
          <Link to="/cities" className="text-muted-foreground hover:text-primary underline underline-offset-2">Browse by City</Link>
          <Link to="/how-it-works" className="text-muted-foreground hover:text-primary underline underline-offset-2">How It Works</Link>
        </div>
      </nav>



      <div className="container pb-8 flex justify-center">
        <ReportIssueButton
          variant="ghost"
          size="sm"
          label="Report this listing"
          showIcon={false}
          className="text-xs text-muted-foreground hover:text-foreground"
          context={{
            featureArea: 'listing_page',
            defaultCategory: 'listing_report',
            related: { listing_id: listing.id },
          }}
        />
      </div>

      <Footer />
    </div>
  );
};

export default ListingDetail;
