import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays, eachDayOfInterval } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useBlockedDates } from '@/hooks/useBlockedDates';
import { useBookingDraft } from '@/hooks/useBookingDraft';
import { useListingRequiredDocuments } from '@/hooks/useRequiredDocuments';
import { calculateRentalFees } from '@/lib/commissions';
import { trackFormSubmitConversion } from '@/lib/gtagConversions';
import { trackRequestStarted, trackRequestSubmitted } from '@/lib/analytics';
import type { ListingCategory, FulfillmentType } from '@/types/listing';
import type { DocumentType } from '@/types/documents';
import type { TablesInsert } from '@/integrations/supabase/types';
import type { Json } from '@/integrations/supabase/types';

// Shared components
import { WizardHeader, type WizardStep } from '@/components/shared';

// Step components
import BookingStepDates from './steps/BookingStepDates';
import BookingStepRequirements from './steps/BookingStepRequirements';
import BookingStepBusinessInfo, { emptyBusinessInfo, type BusinessInfoData } from './steps/BookingStepBusinessInfo';
import BookingStepDocumentUpload from './steps/BookingStepDocumentUpload';
import BookingStepDetails from './steps/BookingStepDetails';
import BookingStepReview from './steps/BookingStepReview';
import BookingStepConfirmation from './steps/BookingStepConfirmation';

import type { BookingUserInfo } from '@/components/booking';

// Type for files staged for upload
interface StagedFile {
  documentType: DocumentType;
  file: File;
  preview?: string;
}

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
  depositAmount?: number | null;
  // Pre-selected dates from modal
  initialStartDate?: Date;
  initialEndDate?: Date;
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
  depositAmount = null,
  initialStartDate,
  initialEndDate,
}: BookingWizardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isDateUnavailable } = useBlockedDates({ listingId });
  const { draft, saveDraft, clearDraft, isLoaded: draftLoaded } = useBookingDraft({ listingId });
  
  // Check if user is the owner of this listing
  const isOwner = user?.id === hostId;
  
  // Check if listing has required documents
  const { data: requiredDocs } = useListingRequiredDocuments(listingId);
  const hasRequiredDocs = requiredDocs && requiredDocs.length > 0;
  
  // Check if this category requires business info
  const requiresBusinessInfo = ['food_truck', 'food_trailer', 'ghost_kitchen'].includes(category);

  // Wizard state - add extra steps if needed
  // Start at step 2 (Requirements) if dates are pre-selected
  const hasPreselectedDates = initialStartDate && initialEndDate;
  const [currentStep, setCurrentStep] = useState(hasPreselectedDates ? 2 : 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  
  // Document upload state
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  
  // Business info state
  const [businessInfo, setBusinessInfo] = useState<BusinessInfoData>(emptyBusinessInfo);

  // Form state - initialize from initial dates or draft if available
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialStartDate || (draft?.startDate ? new Date(draft.startDate) : undefined)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    initialEndDate || (draft?.endDate ? new Date(draft.endDate) : undefined)
  );
  const [fulfillmentSelected, setFulfillmentSelected] = useState<FulfillmentSelection>(
    draft?.fulfillmentSelected || (category === 'ghost_kitchen' || category === 'vendor_lot' ? 'on_site' : 
    fulfillmentType === 'delivery' ? 'delivery' : 'pickup')
  );
  const [deliveryAddress, setDeliveryAddress] = useState(draft?.deliveryAddress || '');
  const [message, setMessage] = useState(draft?.message || '');
  const [userInfo, setUserInfo] = useState<BookingUserInfo | null>(null);

  // Save draft when form state changes
  useEffect(() => {
    if (!draftLoaded) return;
    saveDraft({
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      fulfillmentSelected,
      deliveryAddress,
      message,
    });
  }, [startDate, endDate, fulfillmentSelected, deliveryAddress, message, saveDraft, draftLoaded]);

  const isMobileAsset = category === 'food_truck' || category === 'food_trailer';
  
  // Dynamic step calculation
  // Steps: Dates -> Requirements -> [BusinessInfo?] -> [DocUpload?] -> Details -> Review
  const totalSteps = 4 + (requiresBusinessInfo ? 1 : 0) + (hasRequiredDocs ? 1 : 0);

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
      // Track when user starts the booking flow (step 1 -> 2)
      if (currentStep === 1) {
        trackRequestStarted(listingId);
      }
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

    // Prevent owners from booking their own listings
    if (isOwner) {
      toast({
        title: 'Cannot book your own listing',
        description: 'You cannot rent your own listing.',
        variant: 'destructive',
      });
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

    const isInIframe = (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();

    // For Instant Book: open a blank tab BEFORE any awaits to avoid popup blockers in iframe environments.
    const checkoutWindow = instantBook && isInIframe ? window.open('about:blank', '_blank') : null;

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
        deposit_amount: depositAmount,
        business_info: requiresBusinessInfo ? (businessInfo as unknown as Json) : null,
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
            deposit_amount: depositAmount,
          },
        });

        if (checkoutError) throw checkoutError;
        if (!checkoutData?.url) throw new Error('Failed to create checkout session');

        trackFormSubmitConversion({ form_type: 'instant_book', listing_id: listingId });
        clearDraft(); // Clear saved draft on successful submission

        if (checkoutWindow) {
          checkoutWindow.location.href = checkoutData.url;
          return;
        }

        if (isInIframe) {
          // Popup blocked: attempt to escape the iframe.
          try {
            window.top?.location.assign(checkoutData.url);
          } catch {
            window.location.assign(checkoutData.url);
          }
          return;
        }

        window.location.href = checkoutData.url;
        return;
      }

      // Request to Book: send notification
      supabase.functions.invoke('send-booking-notification', {
        body: { booking_id: bookingResult.id, event_type: 'submitted' },
      }).catch(console.error);

      trackFormSubmitConversion({ form_type: 'booking_request', listing_id: listingId });
      trackRequestSubmitted(listingId, instantBook);
      clearDraft(); // Clear saved draft on successful submission
      setBookingComplete(true);
    } catch (error) {
      if (checkoutWindow) checkoutWindow.close();
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
        listingId={listingId}
      />
    );
  }

  // Build step labels dynamically based on features
  const buildStepLabels = (): WizardStep[] => {
    let stepNum = 1;
    const steps: WizardStep[] = [
      { step: stepNum++, label: 'Select Dates', short: 'Dates' },
      { step: stepNum++, label: 'Requirements', short: 'Info' },
    ];
    
    if (requiresBusinessInfo) {
      steps.push({ step: stepNum++, label: 'Business Info', short: 'Business' });
    }
    
    if (hasRequiredDocs) {
      steps.push({ step: stepNum++, label: 'Upload Docs', short: 'Upload' });
    }
    
    steps.push(
      { step: stepNum++, label: 'Details', short: 'Details' },
      { step: stepNum++, label: 'Review', short: 'Review' }
    );
    
    return steps;
  };
  
  const stepLabels = buildStepLabels();
  
  // Calculate which step number corresponds to which component
  const getStepNumber = (stepName: 'dates' | 'requirements' | 'business' | 'docs' | 'details' | 'review'): number => {
    switch (stepName) {
      case 'dates': return 1;
      case 'requirements': return 2;
      case 'business': return requiresBusinessInfo ? 3 : -1;
      case 'docs': return hasRequiredDocs ? (requiresBusinessInfo ? 4 : 3) : -1;
      case 'details': return 2 + (requiresBusinessInfo ? 1 : 0) + (hasRequiredDocs ? 1 : 0) + 1;
      case 'review': return 2 + (requiresBusinessInfo ? 1 : 0) + (hasRequiredDocs ? 1 : 0) + 2;
      default: return -1;
    }
  };

  const stepVariants = {
    enter: { opacity: 0, x: 20 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="rounded-2xl border-0 shadow-xl bg-card overflow-hidden">
      {/* Premium Wizard Header */}
      <WizardHeader
        mode="booking"
        currentStep={currentStep}
        totalSteps={totalSteps}
        steps={stepLabels}
        instantBook={instantBook}
        listingTitle={listingTitle}
        priceDaily={priceDaily}
        priceWeekly={priceWeekly}
      />

      {/* Step content with animations */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {currentStep === getStepNumber('dates') && (
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

            {currentStep === getStepNumber('requirements') && (
              <BookingStepRequirements
                listingId={listingId}
                onContinue={handleNext}
                onBack={handleBack}
              />
            )}

            {requiresBusinessInfo && currentStep === getStepNumber('business') && (
              <BookingStepBusinessInfo
                data={businessInfo}
                onChange={setBusinessInfo}
                onContinue={handleNext}
                onBack={handleBack}
              />
            )}

            {hasRequiredDocs && currentStep === getStepNumber('docs') && (
              <BookingStepDocumentUpload
                listingId={listingId}
                uploadedFiles={stagedFiles}
                onFilesChange={setStagedFiles}
                onContinue={handleNext}
                onBack={handleBack}
              />
            )}

            {currentStep === getStepNumber('details') && (
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

            {currentStep === getStepNumber('review') && (
              <BookingStepReview
                listingTitle={listingTitle}
                startDate={startDate!}
                endDate={endDate!}
                rentalDays={rentalDays}
                priceDaily={priceDaily!}
                basePrice={basePrice}
                deliveryFee={fulfillmentSelected === 'delivery' ? currentDeliveryFee : 0}
                depositAmount={depositAmount}
                fees={fees}
                fulfillmentSelected={fulfillmentSelected}
                instantBook={instantBook}
                isSubmitting={isSubmitting}
                onSubmit={handleSubmit}
                onBack={handleBack}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BookingWizard;
