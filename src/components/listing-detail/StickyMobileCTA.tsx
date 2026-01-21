import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ShoppingCart, Zap, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useAuth } from '@/contexts/AuthContext';
import BookingWizard from './BookingWizard';
import { BookingOnboardingModal, useBookingOnboarding } from '@/components/booking/BookingOnboardingModal';
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
  // Additional props for booking wizard
  category?: ListingCategory;
  fulfillmentType?: FulfillmentType;
  priceWeekly?: number | null;
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
  category = 'food_truck',
  fulfillmentType = 'pickup',
  priceWeekly,
  availableFrom,
  availableTo,
  pickupLocation,
  deliveryFee,
  deliveryRadiusMiles,
  listingTitle = 'Listing',
  depositAmount = null,
}: StickyMobileCTAProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [showBookingDrawer, setShowBookingDrawer] = useState(false);
  const { shouldShow: showOnboarding, setShouldShow: setShowOnboarding } = useBookingOnboarding();
  const [pendingBooking, setPendingBooking] = useState(false);
  
  // Sale listing states
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [pendingAction, setPendingAction] = useState<'buy' | 'offer' | null>(null);

  // Show sticky CTA after scrolling past a certain point
  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Open booking drawer after onboarding completes
  useEffect(() => {
    if (pendingBooking && !showOnboarding) {
      setShowBookingDrawer(true);
      setPendingBooking(false);
    }
  }, [pendingBooking, showOnboarding]);

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

  const handleAuthSuccess = () => {
    setShowAuthGate(false);
    if (pendingAction === 'buy') {
      navigate(`/checkout/${listingId}`);
    } else if (pendingAction === 'offer') {
      setShowOfferModal(true);
    }
    setPendingAction(null);
  };

  const handlePrimaryCTA = () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (isRental) {
      // Show onboarding first if not seen
      if (showOnboarding) {
        setShowOnboarding(true);
        setPendingBooking(true);
      } else {
        setShowBookingDrawer(true);
      }
    }
  };

  const handleOnboardingClose = (open: boolean) => {
    setShowOnboarding(open);
    if (!open && pendingBooking) {
      // Onboarding was closed, open the drawer
      setShowBookingDrawer(true);
      setPendingBooking(false);
    }
  };

  if (!isVisible) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/95 backdrop-blur-md border-t border-border shadow-lg safe-area-pb">
        <div className="container py-3 flex items-center justify-between gap-3">
          {/* Price Display */}
          <div className="flex-shrink-0">
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-foreground">
                ${price?.toLocaleString() || '—'}
              </span>
              {isRental && <span className="text-sm text-muted-foreground">/day</span>}
            </div>
          </div>

          {/* Rental CTA */}
          {isRental ? (
            <Button
              variant="gradient"
              size="sm"
              onClick={handlePrimaryCTA}
              disabled={!isAvailable}
              className="gap-1.5 min-w-[120px]"
            >
              {instantBook ? <Zap className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
              {instantBook ? 'Book Now' : 'Request to Book'}
            </Button>
          ) : (
            /* Sale CTAs - Buy Now & Make Offer */
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMakeOffer}
                disabled={!isAvailable}
                className="gap-1.5"
              >
                <Tag className="h-4 w-4" />
                <span className="hidden xs:inline">Make Offer</span>
                <span className="xs:hidden">Offer</span>
              </Button>
              <Button
                variant="gradient"
                size="sm"
                onClick={handleBuyNow}
                disabled={!isAvailable}
                className="gap-1.5"
              >
                <ShoppingCart className="h-4 w-4" />
                Buy Now
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Onboarding Modal */}
      <BookingOnboardingModal
        open={showOnboarding && pendingBooking}
        onOpenChange={handleOnboardingClose}
        instantBook={instantBook}
      />

      {/* Full-screen Mobile Booking Drawer */}
      <Drawer open={showBookingDrawer} onOpenChange={setShowBookingDrawer}>
        <DrawerContent className="h-[95vh] max-h-[95vh]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>
              {instantBook ? 'Book Now' : 'Request to Book'}
            </DrawerTitle>
          </DrawerHeader>
          
          <div className="overflow-y-auto flex-1 pb-safe">
            <BookingWizard
              listingId={listingId}
              hostId={hostId}
              category={category}
              fulfillmentType={fulfillmentType}
              priceDaily={priceDaily}
              priceWeekly={priceWeekly || null}
              availableFrom={availableFrom}
              availableTo={availableTo}
              pickupLocation={pickupLocation}
              deliveryFee={deliveryFee}
              deliveryRadiusMiles={deliveryRadiusMiles}
              instantBook={instantBook}
              listingTitle={listingTitle}
              depositAmount={depositAmount}
            />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Auth Gate for Sale Actions */}
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
