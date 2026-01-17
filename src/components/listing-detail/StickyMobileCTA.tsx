import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ShoppingCart, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import BookingWizard from './BookingWizard';
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
}: StickyMobileCTAProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [showBookingSheet, setShowBookingSheet] = useState(false);

  // Show sticky CTA after scrolling past a certain point
  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isAvailable = status === 'published';
  const price = isRental ? priceDaily : priceSale;

  const handlePrimaryCTA = () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (isRental) {
      setShowBookingSheet(true);
    } else {
      // Scroll to inquiry form for sales
      const formElement = document.querySelector('[data-booking-form]');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
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

          {/* Primary CTA */}
          <Button
            variant="gradient"
            size="sm"
            onClick={handlePrimaryCTA}
            disabled={!isAvailable}
            className="gap-1.5 min-w-[120px]"
          >
            {isRental ? (
              <>
                {instantBook ? <Zap className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
                {instantBook ? 'Book Now' : 'Request to Book'}
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                Contact Seller
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Booking Sheet */}
      <Sheet open={showBookingSheet} onOpenChange={setShowBookingSheet}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>
              {instantBook ? 'Book Now' : 'Request to Book'}
            </SheetTitle>
          </SheetHeader>
          
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
          />
        </SheetContent>
      </Sheet>
    </>
  );
};

export default StickyMobileCTA;
