import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, ShoppingCart, Zap, Tag, Edit, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { MakeOfferModal } from '@/components/offers/MakeOfferModal';
import { AuthGateOfferModal } from '@/components/offers/AuthGateOfferModal';
import { RentalBookingWidget } from './RentalBookingWidget';
import { trackLeadEvent } from '@/lib/leadTracking';
import type { ListingCategory, FulfillmentType } from '@/types/listing';

interface StickyMobileCTAProps {
  listingId: string;
  hostId: string;
  isRental: boolean;
  priceDaily: number | null;
  priceSale: number | null;
  status: 'draft' | 'published' | 'paused' | 'archived';
  instantBook?: boolean;
  hostIdentityVerified?: boolean;
  // Additional props for booking
  category?: ListingCategory;
  fulfillmentType?: FulfillmentType;
  priceWeekly?: number | null;
  priceMonthly?: number | null;
  priceHourly?: number | null;
  hourlyEnabled?: boolean;
  dailyEnabled?: boolean;
  availableFrom?: string | null;
  availableTo?: string | null;
  pickupLocation?: string | null;
  deliveryFee?: number | null;
  deliveryRadiusMiles?: number | null;
  listingTitle?: string;
  depositAmount?: number | null;
  // Multi-slot support
  totalSlots?: number;
  slotNames?: string[] | null;
  minHours?: number | null;
  minDays?: number | null;
  minNoticeHours?: number | null;
}

export const StickyMobileCTA = ({
  listingId,
  hostId,
  isRental,
  priceDaily,
  priceSale,
  status,
  instantBook = false,
  hostIdentityVerified = false,
  category,
  fulfillmentType = 'pickup',
  priceWeekly,
  priceMonthly,
  priceHourly,
  hourlyEnabled = false,
  dailyEnabled = true,
  availableFrom,
  availableTo,
  deliveryFee,
  listingTitle = 'Listing',
  totalSlots = 1,
  slotNames,
  minHours,
  minDays,
  minNoticeHours,
}: StickyMobileCTAProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  
  // Sale listing states
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [pendingAction, setPendingAction] = useState<'buy' | 'offer' | 'book' | null>(null);

  // Check if user is the owner of this listing
  const isOwner = user?.id === hostId;

  // Always show sticky CTA on mobile/tablet
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Show owner banner instead of CTA buttons
  if (isOwner && isVisible) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-amber-50 border-t border-amber-200 shadow-lg safe-area-pb">
        <div className="container py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>This is your listing</span>
          </div>
          <Button asChild size="sm" variant="outline" className="h-8">
            <Link to={`/edit-listing/${listingId}`}>
              <Edit className="h-4 w-4 mr-1.5" />
              Edit
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!isVisible) return null;

  const isAvailable = status === 'published';
  const price = isRental ? priceDaily : priceSale;

  const handleBuyNow = () => {
    if (!user) {
      setPendingAction('buy');
      setShowAuthGate(true);
      return;
    }
    navigate(`/checkout/${listingId}`);
  };

  const handleMakeOffer = () => {
    if (!user) {
      setPendingAction('offer');
      setShowAuthGate(true);
      return;
    }
    setShowOfferModal(true);
  };

  const handleRentalCTA = () => {
    trackLeadEvent('check_availability_click', {
      listing_id: listingId,
      source: 'sticky_mobile_cta',
      instant_book: instantBook && hostIdentityVerified,
    });
    // Open unified booking modal
    setShowBookingModal(true);
  };

  const handleAuthSuccess = () => {
    setShowAuthGate(false);
    if (pendingAction === 'buy') {
      navigate(`/checkout/${listingId}`);
    } else if (pendingAction === 'offer') {
      setShowOfferModal(true);
    } else if (pendingAction === 'book') {
      setShowBookingModal(true);
    }
    setPendingAction(null);
  };

  return (
    <>
      <div
        id="mobile-sticky-cta"
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden safe-area-pb gpu-layer"
        style={{
          background: 'linear-gradient(180deg, rgba(18,22,28,0.78) 0%, rgba(12,15,19,0.92) 100%)',
          backdropFilter: 'blur(22px) saturate(140%)',
          WebkitBackdropFilter: 'blur(22px) saturate(140%)',
          borderTop: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 -18px 50px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        <div className="container py-3 flex items-center justify-between gap-4">
          {/* Price Display - Enhanced */}
          <div className="flex-shrink-0">
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold text-white">
                ${price?.toLocaleString() || '—'}
              </span>
              {isRental && (
                <span className="text-xs text-white/60">
                  {hourlyEnabled && priceHourly ? 'per hour' : 'per day'}
                </span>
              )}
              {!isRental && <span className="text-xs text-emerald-400 font-medium">Ready to buy</span>}
            </div>
          </div>

          {/* Rental CTA */}
          {isRental ? (
            <Button
              id="sticky-mobile-cta-primary"
              variant="cta"
              size="lg"
              onClick={handleRentalCTA}
              disabled={!isAvailable}
              data-testid="sticky-mobile-rent-cta"
              data-instant-book={instantBook && hostIdentityVerified ? 'true' : 'false'}
              className="gap-2 min-w-[150px] h-12 text-base"
            >
              {instantBook && hostIdentityVerified ? <Zap className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
              {instantBook && hostIdentityVerified ? 'Book Now' : 'Request to Book'}
            </Button>
          ) : (

            /* Sale CTAs - Buy Now (prominent) & Make Offer */
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                size="default"
                onClick={handleMakeOffer}
                disabled={!isAvailable}
                className="gap-1.5 h-10 sm:h-12 px-3 sm:px-4"
              >
                <Tag className="h-4 w-4" />
                <span className="hidden xs:inline">Make Offer</span>
                <span className="xs:hidden">Offer</span>
              </Button>
              <Button
                variant="dark-shine"
                size="lg"
                onClick={handleBuyNow}
                disabled={!isAvailable}
                data-testid="sticky-mobile-buy-now"
                className="gap-2 h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg font-bold shadow-xl no-tap-highlight"
              >
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
                Buy Now
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* RENTAL BOOKING MODAL - Unified Duration-First Flow */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Book {listingTitle}</DialogTitle>
          </DialogHeader>
          
          {/* Close button */}
          <button
            onClick={() => setShowBookingModal(false)}
            className="absolute right-4 top-4 z-50 rounded-full p-1.5 bg-background/80 backdrop-blur-sm hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          
          <RentalBookingWidget
            listingId={listingId}
            listingTitle={listingTitle}
            hostId={hostId}
            isOwner={false}
            category={category || 'food_truck'}
            priceDaily={priceDaily}
            priceWeekly={priceWeekly}
            priceMonthly={priceMonthly}
            priceHourly={priceHourly}
            availableFrom={availableFrom}
            availableTo={availableTo}
            instantBook={instantBook}
            hostIdentityVerified={hostIdentityVerified}
            hourlyEnabled={hourlyEnabled}
            dailyEnabled={dailyEnabled}
            totalSlots={totalSlots}
            slotNames={slotNames}
            minHours={minHours}
            minDays={minDays}
            minNoticeHours={minNoticeHours}
            fulfillmentType={fulfillmentType}
            deliveryFee={deliveryFee}
          />
        </DialogContent>
      </Dialog>

      {/* Auth Gate for Actions */}
      <AuthGateOfferModal
        open={showAuthGate}
        onOpenChange={setShowAuthGate}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Make Offer Modal */}
      {priceSale && (
        <MakeOfferModal
          open={showOfferModal}
          onOpenChange={setShowOfferModal}
          listingId={listingId}
          sellerId={hostId}
          listingTitle={listingTitle}
          askingPrice={priceSale}
        />
      )}
    </>
  );
};

export default StickyMobileCTA;
