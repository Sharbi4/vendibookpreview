import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Home,
  ChevronRight,
  Share2,
  Heart,
  MapPin,
  ShieldCheck,
  Lock,
  Zap,
  Truck,
  Calendar,
  PackageCheck,
  CheckCircle2,
  Star,
  ShoppingCart,
  Tag,
  HeadphonesIcon,
  CalendarCheck,
  MessageSquare,
  FileText,
  Headphones,
  ExternalLink,
  Building2,
  Box,
  Hash,
  EyeOff,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FavoriteButton } from '@/components/listing/FavoriteButton';
import EnhancedPhotoGallery from '@/components/listing-detail/EnhancedPhotoGallery';
import ListingExplainerVideo from '@/components/listing-detail/ListingExplainerVideo';

import { AmenitiesSection } from '@/components/listing-detail/AmenitiesSection';
import ListingLocationMap from '@/components/listing-detail/ListingLocationMap';
import CollapsibleDescription from '@/components/listing-detail/CollapsibleDescription';
import AudioListingPlayer from '@/components/listing/AudioListingPlayer';
import PromoVideoPlayer from '@/components/listing/PromoVideoPlayer';
import MessageHostForm from '@/components/messaging/MessageHostForm';
import RelatedListings from '@/components/listing-detail/RelatedListings';
import ReviewsSection from '@/components/reviews/ReviewsSection';
import { TellVendibookModal, type LeadCategory } from '@/components/lead/TellVendibookModal';
import { MakeOfferModal } from '@/components/offers/MakeOfferModal';
import { AuthGateOfferModal } from '@/components/offers/AuthGateOfferModal';
import { useAuth } from '@/contexts/AuthContext';
import { CATEGORY_LABELS, type ListingCategory } from '@/types/listing';
import { isListingFeatured } from '@/lib/featured';
import { FeaturedBadge } from '@/components/listing/FeaturedBadge';
import { getPublicDisplayName } from '@/lib/displayName';
import { formatLastActive } from '@/hooks/useActivityTracker';
import { trackLeadEvent } from '@/lib/leadTracking';
import { fulfillmentLabel } from '@/components/listing-detail/FulfillmentTypeBadge';
import { resolveListingBrand, getBrandFieldLabel } from '@/lib/resolveListingBrand';
import { SaleCard } from './SaleCard';
import { FinancingActionPanel } from './FinancingActionPanel';
import { ListingPaymentMethods } from '@/components/listing-detail/ListingPaymentMethods';
import { SaleStickyActionBar } from './SaleStickyActionBar';
import ListingHowItWorks from '@/components/listing-detail/ListingHowItWorks';

interface SaleListingMobileProps {
  listing: any;
  host: any;
  images: string[];
  videos: any[];
  isOwner: boolean;
  ratingData?: { average: number; count: number };
  onShare: () => void;
}

const toLeadCategory = (c?: ListingCategory): LeadCategory | undefined => {
  if (!c) return undefined;
  const s = String(c);
  if (s === 'food_truck') return 'food_truck';
  if (s === 'food_trailer') return 'food_trailer';
  if (s === 'ghost_kitchen' || s.includes('kitchen')) return 'commercial_kitchen';
  if (s === 'vendor_lot' || s === 'vendor_space') return 'vendor_space';
  return undefined;
};

const firstName = (full?: string | null) => (full || '').trim().split(/\s+/)[0] || 'the seller';

export const SaleListingMobile = ({
  listing,
  host,
  images,
  videos,
  isOwner,
  ratingData,
  onShare,
}: SaleListingMobileProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conciergeOpen, setConciergeOpen] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [pendingAction, setPendingAction] = useState<'buy' | 'offer' | null>(null);

  // Mark body so the chat bubble lifts above the sticky bar
  useEffect(() => {
    document.body.setAttribute('data-sale-cta-active', 'true');
    return () => {
      document.body.removeAttribute('data-sale-cta-active');
    };
  }, []);

  const categoryLabel = CATEGORY_LABELS[listing.category as ListingCategory] || 'Listing';
  const sellerName = host ? getPublicDisplayName(host) : 'Seller';
  const sellerFirst = firstName(sellerName);
  const locationShort = [listing.city, listing.state].filter(Boolean).join(', ');
  const isFeatured = isListingFeatured(listing);
  const isAvailable = listing.status === 'published';
  const totalImages = images?.length || 0;
  const memberYear = host?.created_at ? new Date(host.created_at).getFullYear() : null;
  const lastActiveLabel = host?.last_active_at ? formatLastActive(host.last_active_at) : null;
  const respondsQuickly = lastActiveLabel === 'Active now' || /min|hour/i.test(lastActiveLabel || '');

  const fulfillmentLabelText = useMemo(
    () => fulfillmentLabel(listing.fulfillment_type),
    [listing.fulfillment_type],
  );

  const brandValue = resolveListingBrand({
    category: listing.category,
    brand: listing.brand,
    make: listing.make,
    manufacturer: listing.manufacturer,
    host_business_name: host?.business_name,
    host_display_name: host?.full_name || host?.display_name,
  });

  const requireAuth = (action: 'buy' | 'offer') => {
    if (!user) {
      setPendingAction(action);
      setShowAuthGate(true);
      return false;
    }
    return true;
  };

  const handleBuyNow = () => {
    if (!requireAuth('buy')) return;
    navigate(`/checkout/${listing.id}`);
  };

  const handleMakeOffer = () => {
    if (!requireAuth('offer')) return;
    setShowOfferModal(true);
  };

  const handleAuthSuccess = () => {
    setShowAuthGate(false);
    if (pendingAction === 'buy') navigate(`/checkout/${listing.id}`);
    else if (pendingAction === 'offer') setShowOfferModal(true);
    setPendingAction(null);
  };

  const handleAskVendibook = () => {
    trackLeadEvent('vendi_help_listing_click' as any, {
      listing_id: listing.id,
      source: 'sale_concierge_card',
    });
    window.dispatchEvent(new CustomEvent('start-vendi-call', {
      detail: {
        scope: 'listing_help',
        listing_id: listing.id,
        listing_title: listing.title,
      },
    }));
  };

  return (
    <div className="lg:hidden bg-sale-page text-foreground pb-[calc(env(safe-area-inset-bottom)+96px)]">

      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="px-4 pt-4 pb-3 flex items-center gap-1.5 text-xs text-muted-foreground overflow-x-auto whitespace-nowrap scrollbar-none"
      >
        <Link to="/" className="hover:text-foreground inline-flex items-center">
          <Home className="h-3.5 w-3.5" />
        </Link>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <Link to="/search?mode=sale" className="hover:text-foreground">For Sale</Link>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <Link to={`/search?category=${listing.category}&mode=sale`} className="hover:text-foreground">
          {categoryLabel}s
        </Link>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className="text-primary font-medium truncate max-w-[40vw]">{listing.title}</span>
      </nav>

      <div className="px-4 space-y-5">
        {/* GALLERY */}
        <div className="relative">
          <div className="rounded-2xl overflow-hidden ring-glass shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
            <EnhancedPhotoGallery images={images} videos={videos} title={listing.title} />
          </div>
          {isFeatured && (
            <div className="absolute top-3 left-3 z-10">
              <FeaturedBadge listing={listing} size="md" />
            </div>
          )}

          {totalImages > 1 && (
            <div className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/70 backdrop-blur-md ring-hairline text-xs font-medium text-foreground/90">
              1 / {totalImages}
            </div>
          )}
        </div>

        <ListingExplainerVideo mode="sale" listingId={listing.id} />


        {/* HERO DETAILS */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold leading-tight">{listing.title}</h1>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onShare}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-card/60 ring-hairline text-xs font-medium hover:bg-card/80 transition-colors"
                aria-label="Share listing"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </button>
              <div className="inline-flex h-9 items-center px-2.5 rounded-full bg-card/60 ring-hairline">
                <FavoriteButton
                  listingId={listing.id}
                  category={listing.category}
                  size="sm"
                  variant="underline"
                />
              </div>
            </div>
          </div>

          {(listing.subtitle || listing.headline) && (
            <p className="text-sm text-muted-foreground">
              {listing.subtitle || listing.headline}
            </p>
          )}

          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col gap-1.5 text-sm">
              {locationShort && (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {locationShort}{listing.zip_code ? ` ${listing.zip_code}` : ''}
                </span>
              )}
              {lastActiveLabel && (
                <span className="inline-flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${
                    lastActiveLabel === 'Active now' ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-400/60'
                  }`} />
                  <span className="text-emerald-400 font-medium">Active</span>
                  <span className="text-muted-foreground">{lastActiveLabel.replace('Active ', '')}</span>
                </span>
              )}
            </div>
            {listing.price_sale && (
              <div className="text-right">
                <div className="text-3xl font-bold leading-none">
                  ${Number(listing.price_sale).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">USD</div>
              </div>
            )}
          </div>

          {/* Badge row */}
          <div className="flex flex-wrap gap-2">
            {isAvailable && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30 text-xs font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                In stock
              </span>
            )}
            {fulfillmentLabelText && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/60 ring-hairline text-xs font-medium">
                <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                {fulfillmentLabelText}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/60 ring-hairline text-xs font-medium">
              <Box className="h-3.5 w-3.5 text-muted-foreground" />
              {categoryLabel}
            </span>
            {host?.identity_verified && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary ring-1 ring-primary/30 text-xs font-medium">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verified Seller
              </span>
            )}
          </div>
        </div>

        {/* TRUST STRIP */}
        <SaleCard variant="default" padding="md">

          <div className="grid grid-cols-3 gap-3">
            <TrustItem icon={ShieldCheck} title="Detailed Listing" sub="Specs and documents" tone="primary" />
            <TrustItem icon={Lock} title="PayPal Checkout" sub="Processed by PayPal" tone="primary" />
            <TrustItem icon={Zap} title="Responsive Seller" sub="Typically replies fast" tone="primary" />
          </div>
        </SaleCard>

        {/* PRIMARY ACTIONS */}
        {!isOwner && (
          <SaleCard padding="md" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button
                size="lg"
                onClick={handleBuyNow}
                disabled={!isAvailable}
                data-testid="sale-mobile-buy-now"
                className="h-14 gap-2 rounded-2xl bg-cta-primary hover:opacity-95 shadow-cta-primary text-base font-bold text-white border-0"
              >
                <ShoppingCart className="h-5 w-5" />
                Buy Now
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleMakeOffer}
                disabled={!isAvailable || !listing.price_sale}
                className="h-14 gap-2 rounded-2xl border-0 bg-cta-glass hover:bg-white/10 text-base font-bold text-white"
              >
                <Tag className="h-4 w-4" />
                Make Offer
              </Button>

            </div>
            <Button
              size="lg"
              onClick={() => setConciergeOpen(true)}
              className="w-full h-14 gap-2 rounded-2xl bg-cta-cream text-[#1a1a1a] hover:brightness-95 font-bold shadow-[0_8px_24px_rgba(0,0,0,0.25)] border-0"
            >
              <CalendarCheck className="h-5 w-5" />
              Check Availability
            </Button>
          </SaleCard>

        )}

        {/* CONCIERGE CARD */}
        {!isOwner && (
          <SaleCard variant="warm" padding="lg">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-2">
              Vendibook Concierge
            </div>
            <h2 className="text-lg font-semibold leading-snug text-foreground">
              Want help with this listing?
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              Our concierge can confirm availability, answer questions, and coordinate next steps.
            </p>

            <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
              <Button
                size="lg"
                onClick={() => setConciergeOpen(true)}
                className="flex-1 h-11 gap-2 rounded-lg"
              >
                <CalendarCheck className="h-4 w-4" />
                Check Availability
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleAskVendibook}
                className="flex-1 h-11 gap-2 rounded-lg"
              >
                <MessageSquare className="h-4 w-4" />
                Ask for Help
              </Button>
            </div>

            <p className="mt-3 text-[11px] text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3" />
              Replies within 1 business hour · No commitment
            </p>
          </SaleCard>
        )}

        {/* MESSAGE SELLER */}
        {!isOwner && (
          <SaleCard padding="lg">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 mb-3">
              <h2 className="text-base font-semibold">Send a message to {sellerFirst}</h2>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                <Lock className="h-3 w-3" />
                Secure &amp; private
              </span>
            </div>
            <MessageHostForm
              listingId={listing.id}
              hostId={listing.host_id}
              listingTitle={listing.title}
            />
          </SaleCard>
        )}

        {/* SELLER SUMMARY */}
        <SaleCard padding="md">
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-12 h-12 rounded-full bg-primary/10 ring-1 ring-primary/30 flex items-center justify-center text-primary font-bold">
              {sellerName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">Sold by</div>
              <div className="font-semibold truncate">{sellerName}</div>
            </div>
            <div className="flex flex-col gap-1 text-[11px] text-muted-foreground items-end">
              {respondsQuickly && (
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <Zap className="h-3 w-3" /> Responds quickly
                </span>
              )}
              {memberYear && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Since {memberYear}
                </span>
              )}
            </div>
          </div>
        </SaleCard>

        {/* MEET YOUR SELLER */}
        <SaleCard padding="lg">
          <h2 className="text-base font-semibold mb-4">Meet your seller</h2>
          <div className="flex items-start gap-4 mb-4">
            {host?.avatar_url ? (
              <img
                src={host.avatar_url}
                alt={sellerName}
                className="w-16 h-16 rounded-full object-cover ring-2 ring-primary/30"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 ring-2 ring-primary/30 flex items-center justify-center text-primary text-xl font-bold">
                {sellerName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{sellerName}</div>
              {locationShort && (
                <div className="text-sm text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5" /> {locationShort}
                </div>
              )}
              {ratingData && ratingData.count > 0 ? (
                <div className="inline-flex items-center gap-1 mt-1 text-sm">
                  <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                  <span className="font-semibold">{ratingData.average.toFixed(1)}</span>
                  <span className="text-muted-foreground">
                    ({ratingData.count} review{ratingData.count !== 1 ? 's' : ''})
                  </span>
                </div>
              ) : (
                <div className="mt-1 text-xs text-muted-foreground">New seller · No reviews yet</div>
              )}
              {lastActiveLabel && (
                <div className="text-xs text-emerald-400 mt-1 inline-flex items-center gap-1">
                  <Zap className="h-3 w-3" /> Typically responds within 1 hour
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 text-sm">
            {host?.identity_verified ? (
              <VerificationRow label="ID verified" verified />
            ) : (
              <VerificationRow label="ID verification not completed" verified={false} />
            )}
            <VerificationRow label="PayPal checkout supported" verified />
          </div>
        </SaleCard>

        {/* TECHNICAL SPECS */}
        <SaleCard padding="lg">
          <h2 className="text-base font-semibold mb-4">Technical Specifications</h2>
          <div className="grid grid-cols-2 gap-2.5">
            <SpecCell icon={Box} label="Category" value={categoryLabel} />
            <SpecCell icon={Tag} label="Listing Type" value="For Sale" />
            {listing.condition && (
              <SpecCell icon={ShieldCheck} label="Condition" value={String(listing.condition)} className="capitalize" />
            )}
            {brandValue && (
              <SpecCell icon={Building2} label={getBrandFieldLabel(listing.category)} value={brandValue} />
            )}
            {fulfillmentLabelText && (
              <SpecCell icon={Truck} label="Pickup type" value={fulfillmentLabelText} />
            )}
            {locationShort && (
              <SpecCell icon={MapPin} label="Location" value={locationShort} />
            )}
            {listing.year && (
              <SpecCell icon={Calendar} label="Year" value={String(listing.year)} />
            )}
            {(listing as any).vin && (
              <SpecCell icon={Hash} label="VIN" value={String((listing as any).vin).slice(-6).padStart(8, '•')} />
            )}
          </div>
        </SaleCard>

        {/* POLICY CARD */}
        <SaleCard padding="none">
          <PolicyRow
            icon={Truck}
            title="Pickup &amp; Transfer"
            body="Pickup, delivery, or title transfer will be coordinated directly with the seller after purchase."
          />
          <div className="h-px bg-white/[0.06] mx-5" />
          <PolicyRow
            icon={ShieldCheck}
            title="Return Policy"
            body="All asset sales are final. Please review the listing details carefully and confirm terms with the seller before purchase."
          />
        </SaleCard>

        {/* PICKUP AVAILABLE */}
        {locationShort && (
          <SaleCard variant="warm" bronze padding="md">
            <div className="flex items-center gap-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-background/60 ring-bronze flex items-center justify-center">
                <CalendarCheck className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Pickup available</div>
                <div className="text-sm">{locationShort}{listing.zip_code ? ` ${listing.zip_code}` : ''}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Buyer responsible for pickup or shipping.
                </div>
              </div>
              <MapPin className="h-6 w-6 text-primary shrink-0" />
            </div>
          </SaleCard>
        )}

        {/* ABOUT */}
        <SaleCard padding="lg" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">About this listing</h2>
            <PromoVideoPlayer listingId={listing.id} />
          </div>
          <AudioListingPlayer listingId={listing.id} />
          {listing.description && (
            <div className="text-sm leading-relaxed text-foreground/90">
              <CollapsibleDescription description={listing.description} />
            </div>
          )}
        </SaleCard>

        {/* WHAT'S INCLUDED */}
        {listing.amenities && listing.amenities.length > 0 && (
          <SaleCard padding="lg">
            <AmenitiesSection category={listing.category} amenities={listing.amenities} />
          </SaleCard>
        )}

        {/* PRICING */}
        {listing.price_sale && (
          <SaleCard variant="warm" bronze padding="lg">
            <h2 className="text-base font-semibold mb-3">Pricing</h2>
            <div className="rounded-xl p-4 bg-background/40 ring-bronze">
              <div className="text-xs text-muted-foreground mb-1">Sale price</div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">${Number(listing.price_sale).toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">USD</span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                All sales are final after confirmation.
              </div>
            </div>
          </SaleCard>
        )}

        {/* REVIEWS */}
        <SaleCard padding="lg">
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-5 w-5 text-primary fill-primary" />
            <h2 className="text-base font-semibold">Reviews</h2>
          </div>
          {ratingData && ratingData.count > 0 ? (
            <ReviewsSection listingId={listing.id} />
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-muted/40 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">No reviews yet</div>
                <div className="text-sm text-muted-foreground">Be the first to review this listing.</div>
              </div>
            </div>
          )}
        </SaleCard>

        {/* LOCATION MAP */}
        {(listing.latitude || listing.city) && (
          <SaleCard padding="lg" className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-400" />
                Location
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-background/60 ring-hairline text-muted-foreground">
                Approximate area
              </span>
            </div>
            <div className="text-sm">{locationShort}{listing.zip_code ? ` ${listing.zip_code}` : ''}</div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <EyeOff className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Only city, state, and ZIP are shown publicly. The exact street address and pickup details stay private until your purchase is confirmed.
              </span>
            </div>
            <div className="rounded-xl overflow-hidden ring-hairline" style={{ height: 200 }}>
              <ListingLocationMap
                address={null}
                city={listing.city}
                state={listing.state}
                zipCode={listing.zip_code}
                latitude={listing.latitude}
                longitude={listing.longitude}
                className="h-full"
              />
            </div>
          </SaleCard>
        )}

        {/* SAFETY NOTICE */}
        <SaleCard padding="md">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium">All sales are final. Please review all details and ask questions before purchasing.</div>
              <div className="text-xs text-muted-foreground mt-1">
                Payment disputes are handled through PayPal&rsquo;s buyer protection process and Vendibook support.
              </div>
            </div>
          </div>
        </SaleCard>

        {/* PAYMENT METHODS + FINANCING */}
        <ListingPaymentMethods listing={listing} />
        <FinancingActionPanel listing={listing} host={host} />

        {/* SIMILAR LISTINGS */}
        <div>
          <RelatedListings
            listingId={listing.id}
            category={listing.category}
            mode={listing.mode}
            address={listing.address}
            latitude={listing.latitude}
            longitude={listing.longitude}
          />
        </div>

        {/* PURCHASE PROTECTION */}
        <div>
          <h2 className="text-base font-semibold mb-3">How Vendibook supports your purchase</h2>
          <div className="grid grid-cols-2 gap-2.5">
            <ProtectionCard icon={ShieldCheck} title="Identity Verification*" body="Sellers can complete identity verification with Plaid and display a badge. Optional paid add-on." tone="emerald" />
            <ProtectionCard icon={Lock} title="PayPal Checkout" body="Supported payments are processed by PayPal, not handled on Vendibook." tone="primary" />
            <ProtectionCard icon={FileText} title="Document Workflow" body="We help collect and organize documents and important information." tone="blue" />
            <ProtectionCard icon={HeadphonesIcon} title="Dispute Support" body="Our team is here to help if something doesn't go as planned." tone="amber" />
          </div>
        </div>

        {/* BROWSE MORE */}
        <div>
          <h2 className="text-base font-semibold mb-3">Browse More on Vendibook</h2>
          <SaleCard padding="none">
            <BrowseRow to="/search?category=food_truck&mode=sale" icon={Truck} label="Food Trucks for Sale" />
            <Divider />
            <BrowseRow to="/search?category=food_truck&mode=rent" icon={Truck} label="Food Trucks for Rent" />
            <Divider />
            <BrowseRow to="/search?category=food_trailer&mode=sale" icon={Box} label="Food Trailers for Sale" />
            <Divider />
            <BrowseRow to="/search?category=food_trailer&mode=rent" icon={Box} label="Food Trailers for Rent" />
            <Divider />
            <BrowseRow to="/search?category=ghost_kitchen&mode=rent" icon={Building2} label="Shared Kitchens for Rent" />
            <Divider />
            <BrowseRow to="/search?category=vendor_space&mode=rent" icon={MapPin} label="Vendor Spaces for Rent" />
            <Divider />
            <BrowseRow to="/cities" icon={MapPin} label="Browse by City" />
            <Divider />
            <BrowseRow to="/how-it-works" icon={ExternalLink} label="How It Works" />
          </SaleCard>
        </div>
      </div>

      {/* Modals */}
      <TellVendibookModal
        open={conciergeOpen}
        onOpenChange={setConciergeOpen}
        defaultIntent="buy"
        defaultCategory={toLeadCategory(listing.category)}
        defaultCity={listing.city || undefined}
        listingId={listing.id}
        sourcePage="listing_detail_sale_mobile"
      />
      <AuthGateOfferModal
        open={showAuthGate}
        onOpenChange={setShowAuthGate}
        onAuthSuccess={handleAuthSuccess}
      />
      {listing.price_sale && (
        <MakeOfferModal
          open={showOfferModal}
          onOpenChange={setShowOfferModal}
          listingId={listing.id}
          sellerId={listing.host_id}
          listingTitle={listing.title}
          askingPrice={listing.price_sale}
        />
      )}

      {/* Contextual walkthrough — informational, no state changes */}
      <div className="px-4 pb-24">
        <ListingHowItWorks listing={listing as any} isOwner={isOwner} />
      </div>

      {/* Sticky action bar */}
      <SaleStickyActionBar
        listingId={listing.id}
        hostId={listing.host_id}
        priceSale={listing.price_sale}
        status={listing.status}
        listingTitle={listing.title}
        isOwner={isOwner}
      />
    </div>
  );
};

/* ------------------------------ Subcomponents ----------------------------- */

const TrustItem = ({
  icon: Icon, title, sub, tone = 'primary',
}: { icon: any; title: string; sub: string; tone?: 'primary' | 'emerald' }) => {
  const toneCls = tone === 'emerald' ? 'text-emerald-400 bg-emerald-500/10 ring-emerald-500/30' : 'text-primary bg-primary/10 ring-primary/30';
  return (
    <div className="flex flex-col items-start gap-2">
      <div className={`w-9 h-9 rounded-full ring-1 flex items-center justify-center ${toneCls}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="leading-tight">
        <div className="text-xs font-semibold">{title}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
      </div>
    </div>
  );
};

const VerificationRow = ({ label, verified }: { label: string; verified: boolean }) => (
  <div className="flex items-center gap-2">
    {verified ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
    ) : (
      <span className="h-4 w-4 rounded-full ring-1 ring-muted-foreground/40 inline-block" />
    )}
    <span className={verified ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
  </div>
);

const SpecCell = ({
  icon: Icon, label, value, className,
}: { icon: any; label: string; value: string; className?: string }) => (
  <div className="rounded-xl bg-background/40 ring-hairline p-3 flex items-start gap-3">
    <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <div className="min-w-0">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold truncate ${className || ''}`}>{value}</div>
    </div>
  </div>
);

const PolicyRow = ({
  icon: Icon, title, body,
}: { icon: any; title: string; body: string }) => (
  <div className="p-5 flex items-start gap-3">
    <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
      <Icon className="h-4.5 w-4.5 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="font-semibold mb-1" dangerouslySetInnerHTML={{ __html: title }} />
      <div className="text-sm text-muted-foreground leading-relaxed">{body}</div>
    </div>
    <ChevronRight className="h-5 w-5 text-muted-foreground/60 shrink-0" />
  </div>
);

const ProtectionCard = ({
  icon: Icon, title, body, tone,
}: { icon: any; title: string; body: string; tone: 'primary' | 'emerald' | 'blue' | 'amber' }) => {
  const toneCls: Record<typeof tone, string> = {
    primary: 'bg-primary/10 ring-primary/30 text-primary',
    emerald: 'bg-emerald-500/10 ring-emerald-500/30 text-emerald-400',
    blue: 'bg-blue-500/10 ring-blue-500/30 text-blue-400',
    amber: 'bg-amber-500/10 ring-amber-500/30 text-amber-400',
  } as any;
  return (
    <SaleCard padding="md">
      <div className={`w-9 h-9 rounded-full ring-1 flex items-center justify-center mb-3 ${toneCls[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-sm font-semibold mb-1">{title}</div>
      <div className="text-xs text-muted-foreground leading-relaxed">{body}</div>
    </SaleCard>
  );
};

const Divider = () => <div className="h-px bg-white/[0.05] mx-4" />;

const BrowseRow = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
  <Link
    to={to}
    className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.03] transition-colors"
  >
    <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <span className="flex-1 text-sm font-medium">{label}</span>
    <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
  </Link>
);

export default SaleListingMobile;
