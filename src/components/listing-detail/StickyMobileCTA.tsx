import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, ShoppingCart, Zap, Tag, Edit, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import DateSelectionModal from './DateSelectionModal';
import { MakeOfferModal } from '@/components/offers/MakeOfferModal';
import { AuthGateOfferModal } from '@/components/offers/AuthGateOfferModal';
import type { ListingCategory, FulfillmentType } from '@/types/listing';

interface StickyMobileCTAProps {
  listingId: string;
  hostId: string;
  isRental: boolean;
  priceDaily: number | null;
  priceSale: number | null;
  status: 'draft' | 'published' | 'paused';
  instantBook?: boolean;
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
}

export const StickyMobileCTA = ({
  listingId,
  hostId,
  isRental,
  priceDaily,
  priceSale,
  status,
  instantBook = false,
  category,
  priceWeekly,
  priceMonthly,
  priceHourly,
  hourlyEnabled = false,
  dailyEnabled = true,
  availableFrom,
  availableTo,
  listingTitle = 'Listing',
}: StickyMobileCTAProps) => {
  // Check if this is a vendor space listing (supports multi-mode booking flow)
  const isVendorSpace = category === 'vendor_space' || category === 'vendor_lot';
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true); // Always visible on mobile/tablet
  const [showDateModal, setShowDateModal] = useState(false);
  
  // Sale listing states
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [pendingAction, setPendingAction] = useState<'buy' | 'offer' | 'book' | null>(null);

  // Check if user is the owner of this listing
  const isOwner = user?.id === hostId;

  // Always show sticky CTA on mobile/tablet (no scroll requirement)
  useEffect(() => {
    // Keep visible always for better conversion on mobile
    setIsVisible(true);
  }, []);

  // Show owner banner instead of CTA buttons (always visible for owners after scroll)
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
    // Show date selection first, auth happens when navigating to checkout
    setShowDateModal(true);
  };

  const handleAuthSuccess = () => {
    setShowAuthGate(false);
    if (pendingAction === 'buy') {
      navigate(`/checkout/${listingId}`);
    } else if (pendingAction === 'offer') {
      setShowOfferModal(true);
    } else if (pendingAction === 'book') {
      setShowDateModal(true);
    }
    setPendingAction(null);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/98 backdrop-blur-lg border-t-2 border-primary/20 shadow-2xl safe-area-pb">
        <div className="container py-4 flex items-center justify-between gap-4">
          {/* Price Display - Enhanced */}
          <div className="flex-shrink-0">
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold text-foreground">
                ${price?.toLocaleString() || '—'}
              </span>
              {isRental && <span className="text-xs text-muted-foreground">per day</span>}
              {!isRental && <span className="text-xs text-green-600 font-medium">Ready to buy</span>}
            </div>
          </div>

          {/* Rental CTA */}
          {isRental ? (
            <Button
              variant="dark-shine"
              size="lg"
              onClick={handleRentalCTA}
              disabled={!isAvailable}
              className="gap-2 min-w-[140px] h-12 text-base font-semibold shadow-lg"
            >
              {instantBook ? <Zap className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
              {instantBook ? 'Book Now' : 'Request to Book'}
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
                className="gap-2 h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg font-bold shadow-xl animate-pulse-subtle"
              >
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
                Buy Now
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Date Selection Modal for Rentals */}
      <DateSelectionModal
        open={showDateModal}
        onOpenChange={setShowDateModal}
        listingId={listingId}
        availableFrom={availableFrom}
        availableTo={availableTo}
        priceDaily={priceDaily}
        priceWeekly={priceWeekly}
        priceMonthly={priceMonthly}
        priceHourly={priceHourly}
        hourlyEnabled={hourlyEnabled}
        dailyEnabled={dailyEnabled}
        instantBook={instantBook}
        navigateToBooking={true}
        isVendorSpace={isVendorSpace}
      />

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
