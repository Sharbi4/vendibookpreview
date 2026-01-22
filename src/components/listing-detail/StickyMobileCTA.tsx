import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, ShoppingCart, Zap, Tag, Edit, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { RequestDatesModal } from './RequestDatesModal';
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
  priceWeekly,
  availableFrom,
  availableTo,
  listingTitle = 'Listing',
}: StickyMobileCTAProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  
  // Sale listing states
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [pendingAction, setPendingAction] = useState<'buy' | 'offer' | 'book' | null>(null);

  // Check if user is the owner of this listing
  const isOwner = user?.id === hostId;

  // Show sticky CTA after scrolling past a certain point
  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
              variant="dark-shine"
              size="sm"
              onClick={handleRentalCTA}
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
                variant="dark-shine"
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

      {/* Date Selection Modal for Rentals */}
      <RequestDatesModal
        open={showDateModal}
        onOpenChange={setShowDateModal}
        listingId={listingId}
        availableFrom={availableFrom}
        availableTo={availableTo}
        instantBook={instantBook}
        navigateToBooking={true}
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
