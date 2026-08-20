import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { trackEventToDb } from '@/hooks/useAnalyticsEvents';
import { usePageTracking } from '@/hooks/usePageTracking';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

import { ReportIssueButton } from '@/components/support/ReportIssueButton';

import { StickyMobileCTA } from '@/components/listing-detail/StickyMobileCTA';
import SaleListingLayout from '@/components/listing-detail/sale/SaleListingLayout';
import RentalListingLayout from '@/components/listing-detail/rental/RentalListingLayout';

import { VendorSlotAvailability } from '@/components/listing-detail/VendorSlotAvailability';

import { ListingHighlightsCard } from '@/components/transaction';
import OwnerBanner from '@/components/listing-detail/OwnerBanner';
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
import SEO from '@/components/SEO';
import { listingShareUrl, listingShareText, shareOrCopy } from '@/lib/share';
import JsonLd, { generateProductSchema, generateListingBreadcrumbSchema, generateListingLocalBusinessSchema, generateListingFAQSchema } from '@/components/JsonLd';
import { getPublicDisplayName } from '@/lib/displayName';
import { resolveListingBrand } from '@/lib/resolveListingBrand';
import { isListingFeatured } from '@/lib/featured';

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

  // Share URL uses a pretty, query-free public route on vendibook.com.
  // Social bots hitting /share/listing/:id get prerendered listing OG tags;
  // humans are redirected to the canonical /listing/:id SPA route.
  const shareUrl = listingShareUrl(id || '');

  // Handle share listing
  const handleShare = async () => {
    trackEventToDb('share_listing', 'listing_detail', { listing_id: id });

    const outcome = await shareOrCopy({
      url: shareUrl,
      title: listing?.title || 'Vendibook listing',
      text: listingShareText(listing?.title),
    });

    if (outcome === 'copied') {
      toast({ title: 'Link copied', description: 'Public listing link copied to your clipboard.' });
    } else if (outcome === 'failed') {
      toast({ title: 'Could not copy link', description: shareUrl, variant: 'destructive' });
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
    <div className="min-h-screen flex flex-col bg-sale-page text-foreground">

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

      {/* Rentals now use the same simplified premium layout as for-sale. */}
      {isRental && (
        <RentalListingLayout
          listing={listing}
          host={host}
          images={images}
          videos={videos}
          isOwner={!!isOwner}
          hostVerified={sellerIdentityVerified}
          ratingData={ratingData}
          onShare={handleShare}
        />
      )}


      {/* For-sale listings use one simplified layout at every breakpoint. */}
      {!isRental && (
        <SaleListingLayout
          listing={listing}
          host={host}
          images={images}
          videos={videos}
          isOwner={!!isOwner}
          sellerVerified={sellerIdentityVerified}
          ratingData={ratingData}
          onShare={handleShare}
        />
      )}


      {/* SEO: Crawlable internal links for deep crawl paths */}
      <nav className={`container py-8 border-t border-border ${!isRental ? 'hidden' : ''}`} aria-label="Browse more listings">
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
