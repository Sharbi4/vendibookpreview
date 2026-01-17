import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays, eachDayOfInterval } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useBlockedDates } from '@/hooks/useBlockedDates';
import { calculateRentalFees } from '@/lib/commissions';
import { trackFormSubmitConversion } from '@/lib/gtagConversions';
import type { ListingCategory, FulfillmentType } from '@/types/listing';
import type { TablesInsert } from '@/integrations/supabase/types';

// Step components
import BookingStepDates from './steps/BookingStepDates';
import BookingStepRequirements from './steps/BookingStepRequirements';
import BookingStepDetails from './steps/BookingStepDetails';
import BookingStepReview from './steps/BookingStepReview';
import BookingStepConfirmation from './steps/BookingStepConfirmation';

import type { BookingUserInfo } from '@/components/booking';

export interface BookingWizardProps {
  listingId: string;
  hostId: string;
  category: ListingCategory;
  fulfillmentType: FulfillmentType;
  priceDaily: number | null;
  priceWeekly: number | null;
  availableFrom?: string | null;
  availableTo?: string | null;
  pickupLocation?: string | null;
  deliveryFee?: number | null;
  deliveryRadiusMiles?: number | null;
  instantBook?: boolean;
  listingTitle: string;
}

export type FulfillmentSelection = 'pickup' | 'delivery' | 'on_site';

const BookingWizard = ({
  listingId,
  hostId,
  category,
  fulfillmentType,
  priceDaily,
  priceWeekly,
  availableFrom,
  availableTo,
  pickupLocation,
  deliveryFee,
  deliveryRadiusMiles,
  instantBook = false,
  listingTitle,
}: BookingWizardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isDateUnavailable } = useBlockedDates({ listingId });

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  // Form state
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [fulfillmentSelected, setFulfillmentSelected] = useState<FulfillmentSelection>(
    category === 'ghost_kitchen' || category === 'vendor_lot' ? 'on_site' : 
    fulfillmentType === 'delivery' ? 'delivery' : 'pickup'
  );
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [message, setMessage] = useState('');
  const [userInfo, setUserInfo] = useState<BookingUserInfo | null>(null);

  const isMobileAsset = category === 'food_truck' || category === 'food_trailer';
  const totalSteps = instantBook ? 4 : 4;

  // Calculate pricing
  const rentalDays = startDate && endDate ? differenceInDays(endDate, startDate) : 0;
  
  const calculateBasePrice = () => {
    if (!priceDaily || rentalDays <= 0) return 0;
    const weeks = Math.floor(rentalDays / 7);
    const remainingDays = rentalDays % 7;
    if (priceWeekly && weeks > 0) {
      return (weeks * priceWeekly) + (remainingDays * priceDaily);
    }
    return rentalDays * priceDaily;
  };

  const basePrice = calculateBasePrice();
  const currentDeliveryFee = fulfillmentSelected === 'delivery' && deliveryFee ? deliveryFee : 0;
  const fees = calculateRentalFees(basePrice, currentDeliveryFee);

  // Check for unavailable dates in range
  const hasUnavailableDatesInRange = (): boolean => {
    if (!startDate || !endDate) return false;
    const datesInRange = eachDayOfInterval({ start: startDate, end: endDate });
    return datesInRange.some(date => isDateUnavailable(date));
  };

  // Load saved profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone_number, address1, address2, city, state, zip_code')
          .eq('id', user.id)
          .single();

        if (profile && (profile.phone_number || profile.address1)) {
          const nameParts = (profile.full_name || '').split(' ');
          setUserInfo({
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            phoneNumber: profile.phone_number || '',
            address1: profile.address1 || '',
            address2: profile.address2 || '',
            city: profile.city || '',
            state: profile.state || '',
            zipCode: profile.zip_code || '',
            agreedToTerms: false,
            acknowledgedInsurance: false,
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    fetchProfile();
  }, [user]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!startDate || !endDate || !userInfo) {
      toast({
        title: 'Missing information',
        description: 'Please complete all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const bookingData: TablesInsert<'booking_requests'> = {
        listing_id: listingId,
        host_id: hostId,
        shopper_id: user.id,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        message: message.trim() || null,
        total_price: fees.customerTotal,
        fulfillment_selected: fulfillmentSelected,
        is_instant_book: instantBook,
      };

      if (fulfillmentSelected === 'delivery') {
        bookingData.delivery_address = deliveryAddress.trim();
        bookingData.delivery_fee_snapshot = deliveryFee || null;
      }

      const { data: bookingResult, error } = await supabase
        .from('booking_requests')
        .insert(bookingData)
        .select('id')
        .single();

      if (error) throw error;
      setBookingId(bookingResult.id);

      // For Instant Book: redirect to payment
      if (instantBook) {
        const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout', {
          body: {
            booking_id: bookingResult.id,
            listing_id: listingId,
            mode: 'rent',
            amount: fees.subtotal,
            delivery_fee: currentDeliveryFee,
          },
        });

        if (checkoutError) throw checkoutError;
        if (!checkoutData?.url) throw new Error('Failed to create checkout session');

        trackFormSubmitConversion({ form_type: 'instant_book', listing_id: listingId });
        window.location.href = checkoutData.url;
        return;
      }

      // Request to Book: send notification
      supabase.functions.invoke('send-booking-notification', {
        body: { booking_id: bookingResult.id, event_type: 'submitted' },
      }).catch(console.error);

      trackFormSubmitConversion({ form_type: 'booking_request', listing_id: listingId });
      setBookingComplete(true);
    } catch (error) {
      console.error('Error submitting booking:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit booking. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show confirmation screen
  if (bookingComplete) {
    return (
      <BookingStepConfirmation
        instantBook={instantBook}
        bookingId={bookingId}
        listingTitle={listingTitle}
      />
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
      {/* Progress indicator */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-xs text-muted-foreground">
            {instantBook ? 'Instant Book' : 'Request to Book'}
          </span>
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="p-6">
        {currentStep === 1 && (
          <BookingStepDates
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            availableFrom={availableFrom}
            availableTo={availableTo}
            isDateUnavailable={isDateUnavailable}
            rentalDays={rentalDays}
            priceDaily={priceDaily}
            onContinue={handleNext}
            hasUnavailableDates={hasUnavailableDatesInRange()}
          />
        )}

        {currentStep === 2 && (
          <BookingStepRequirements
            listingId={listingId}
            onContinue={handleNext}
            onBack={handleBack}
          />
        )}

        {currentStep === 3 && (
          <BookingStepDetails
            isMobileAsset={isMobileAsset}
            fulfillmentType={fulfillmentType}
            fulfillmentSelected={fulfillmentSelected}
            onFulfillmentChange={setFulfillmentSelected}
            deliveryAddress={deliveryAddress}
            onDeliveryAddressChange={setDeliveryAddress}
            deliveryFee={deliveryFee}
            deliveryRadiusMiles={deliveryRadiusMiles}
            pickupLocation={pickupLocation}
            message={message}
            onMessageChange={setMessage}
            userInfo={userInfo}
            onUserInfoChange={setUserInfo}
            onContinue={handleNext}
            onBack={handleBack}
          />
        )}

        {currentStep === 4 && (
          <BookingStepReview
            listingTitle={listingTitle}
            startDate={startDate!}
            endDate={endDate!}
            rentalDays={rentalDays}
            priceDaily={priceDaily!}
            basePrice={basePrice}
            deliveryFee={fulfillmentSelected === 'delivery' ? currentDeliveryFee : 0}
            fees={fees}
            fulfillmentSelected={fulfillmentSelected}
            instantBook={instantBook}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
};

export default BookingWizard;
