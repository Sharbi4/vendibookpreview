import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { format, parseISO, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  FileCheck, 
  CreditCard, 
  ChevronDown, 
  CheckCircle2, 
  Zap,
  Shield,
  Truck,
  Clock,
  Info,
  Loader2,
  Star,
  Building2,
} from 'lucide-react';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useListing } from '@/hooks/useListing';
import { useBlockedDates } from '@/hooks/useBlockedDates';
import { useListingRequiredDocuments } from '@/hooks/useRequiredDocuments';
import { useListingAverageRating } from '@/hooks/useReviews';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { calculateRentalFees } from '@/lib/commissions';
import { trackFormSubmitConversion } from '@/lib/gtagConversions';
import { trackRequestStarted, trackRequestSubmitted } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { BookingInfoModal, type BookingUserInfo, SlotSelector, BusinessInfoStep, type BusinessInfoData } from '@/components/booking';
import { BookingDocumentUpload, type StagedDocument } from '@/components/booking/BookingDocumentUpload';
import HourlySelectionSummary from '@/components/booking/HourlySelectionSummary';
import { parseHourlySelections, getSelectedDaysCount, getTotalSelectedHours } from '@/lib/hourlySelections';
import DateSelectionModal from '@/components/listing-detail/DateSelectionModal';
import type { ListingCategory, FulfillmentType } from '@/types/listing';
import type { DocumentType } from '@/types/documents';
import { AffirmBadge } from '@/components/ui/AffirmBadge';
import { AfterpayBadge } from '@/components/ui/AfterpayBadge';

type FulfillmentSelection = 'pickup' | 'delivery' | 'on_site';

const BookingCheckout = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { listing, host, isLoading, error } = useListing(listingId);
  const { data: ratingData } = useListingAverageRating(listingId);
  const { data: requiredDocs } = useListingRequiredDocuments(listingId || '');
  const hasRequiredDocs = requiredDocs && requiredDocs.length > 0;

  // Parse dates from URL params
  const startDateParam = searchParams.get('start');
  const endDateParam = searchParams.get('end');
  
  // Parse hourly booking params
  const hourlyDataParam = searchParams.get('hourlyData');
  const timeSlotsParam = searchParams.get('timeSlots');

  const startTimeParam = searchParams.get('startTime');
  const endTimeParam = searchParams.get('endTime');
  const hoursParam = searchParams.get('hours');

  const hourlySelections = useMemo(
    () =>
      parseHourlySelections({
        startDate: startDateParam,
        hourlyData: hourlyDataParam,
        timeSlots: timeSlotsParam,
      }),
    [startDateParam, hourlyDataParam, timeSlotsParam]
  );

  const hoursParamValue = hoursParam ? Number(hoursParam) : 0;
  const hoursFromSelections = useMemo(() => getTotalSelectedHours(hourlySelections), [hourlySelections]);
  const durationHours = hoursParamValue > 0 ? hoursParamValue : hoursFromSelections;
  const selectedHourlyDays = useMemo(() => getSelectedDaysCount(hourlySelections), [hourlySelections]);

  const isHourlyBooking =
    durationHours > 0 &&
    (Boolean(hourlyDataParam || timeSlotsParam) || Boolean(startTimeParam && endTimeParam));

  // State
  const [startDate, setStartDate] = useState<Date | undefined>(
    startDateParam ? parseISO(startDateParam) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    endDateParam ? parseISO(endDateParam) : undefined
  );
  const [startTime, setStartTime] = useState<string | undefined>(startTimeParam || undefined);
  const [endTime, setEndTime] = useState<string | undefined>(endTimeParam || undefined);
  const [showDateModal, setShowDateModal] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [fulfillmentSelected, setFulfillmentSelected] = useState<FulfillmentSelection>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [message, setMessage] = useState('');
  const [userInfo, setUserInfo] = useState<BookingUserInfo | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stagedDocuments, setStagedDocuments] = useState<StagedDocument[]>([]);
  
  // Business info state for food-related categories
  const [businessInfo, setBusinessInfo] = useState<BusinessInfoData | null>(null);
  
  // Slot selection state for vendor spaces
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [selectedSlotName, setSelectedSlotName] = useState<string | null>(null);

  const isMobileAsset = listing?.category === 'food_truck' || listing?.category === 'food_trailer';
  const isStaticLocation = listing?.category === 'ghost_kitchen' || listing?.category === 'vendor_lot' || listing?.category === 'vendor_space';
  // Categories that require business info (food-related)
  const requiresBusinessInfo = ['food_truck', 'food_trailer', 'ghost_kitchen'].includes(listing?.category || '');
  // Categories that support multiple slots/spaces
  const supportsMultipleSlots = ['vendor_lot', 'vendor_space', 'ghost_kitchen', 'food_truck', 'food_trailer'].includes(listing?.category || '');
  const hasMultipleSlots = supportsMultipleSlots && ((listing as any)?.total_slots ?? 1) > 1;

  // Set initial fulfillment based on listing
  useEffect(() => {
    if (listing) {
      if (isStaticLocation) {
        setFulfillmentSelected('on_site');
      } else if (listing.fulfillment_type === 'delivery') {
        setFulfillmentSelected('delivery');
      } else {
        setFulfillmentSelected('pickup');
      }
    }
  }, [listing, isStaticLocation]);

  // Calculate pricing - supports both hourly and daily
  // Inclusive day counting: same start/end = 1 day
  const rentalDays = startDate && endDate ? differenceInDays(endDate, startDate) + 1 : 0;
  
  const calculateBasePrice = () => {
    // For hourly bookings, use hourly rate
    if (isHourlyBooking && (listing as any)?.price_hourly && durationHours > 0) {
      return durationHours * (listing as any).price_hourly;
    }
    
    // For daily bookings
    if (!listing?.price_daily || rentalDays <= 0) return 0;
    const weeks = Math.floor(rentalDays / 7);
    const remainingDays = rentalDays % 7;
    if (listing.price_weekly && weeks > 0) {
      return (weeks * listing.price_weekly) + (remainingDays * listing.price_daily);
    }
    return rentalDays * listing.price_daily;
  };

  const basePrice = calculateBasePrice();
  const currentDeliveryFee = fulfillmentSelected === 'delivery' && listing?.delivery_fee ? listing.delivery_fee : 0;
  const fees = calculateRentalFees(basePrice, currentDeliveryFee);
  const depositAmount = (listing as any)?.deposit_amount || null;

  // Step definitions - dynamic based on listing requirements
  // Step order: Login -> Business Info (if food) -> Documents (if required) -> Fulfillment -> Review
  const getStepNumber = (baseStep: number) => {
    let offset = 0;
    if (baseStep > 1 && requiresBusinessInfo) offset++; // Add 1 for business info step
    if (baseStep > 2 && hasRequiredDocs) offset++; // Add 1 for documents step
    return baseStep + offset;
  };

  const STEP_LOGIN = 1;
  const STEP_BUSINESS_INFO = requiresBusinessInfo ? 2 : -1; // -1 means skip
  const STEP_DOCUMENTS = hasRequiredDocs ? (requiresBusinessInfo ? 3 : 2) : -1;
  const STEP_FULFILLMENT = 1 + (requiresBusinessInfo ? 1 : 0) + (hasRequiredDocs ? 1 : 0) + 1;
  const STEP_REVIEW = STEP_FULFILLMENT + 1;

  const steps = [
    { id: STEP_LOGIN, label: 'Log in or sign up', icon: CreditCard },
    ...(requiresBusinessInfo ? [{ id: STEP_BUSINESS_INFO, label: 'Business information', icon: Building2 }] : []),
    ...(hasRequiredDocs ? [{ id: STEP_DOCUMENTS, label: 'Required documents', icon: FileCheck }] : []),
    { id: STEP_FULFILLMENT, label: 'Fulfillment & details', icon: Truck },
    { id: STEP_REVIEW, label: 'Review your request', icon: CheckCircle2 },
  ];

  // Check step completion
  const isStep1Complete = !!user;
  // Business info is complete when all required fields are filled
  const isBusinessInfoComplete = !requiresBusinessInfo || (
    businessInfo?.licenseType &&
    (businessInfo.licenseType !== 'other' || businessInfo.licenseTypeOther) &&
    businessInfo.employeeCount &&
    businessInfo.intendedUse?.trim() &&
    businessInfo.cuisineType?.trim()
  );
  const isStepBusinessInfoComplete = isBusinessInfoComplete && completedSteps.includes(STEP_BUSINESS_INFO);
  // Documents step is complete when all required docs are staged
  const allDocsStaged = !hasRequiredDocs || (requiredDocs?.every(req =>
    stagedDocuments.some(doc => doc.documentType === req.document_type)
  ) ?? false);
  const isStepDocsComplete = !hasRequiredDocs || (completedSteps.includes(STEP_DOCUMENTS) && allDocsStaged);
  const isFulfillmentComplete = userInfo?.agreedToTerms && 
    (fulfillmentSelected !== 'delivery' || deliveryAddress.trim());
  const isStepFulfillmentComplete = isFulfillmentComplete;

  // Determine which step can be accessed
  const canAccessStep = (stepId: number): boolean => {
    if (stepId === STEP_LOGIN) return true;
    if (stepId === STEP_BUSINESS_INFO) return isStep1Complete;
    if (stepId === STEP_DOCUMENTS) return isStep1Complete && (!requiresBusinessInfo || isStepBusinessInfoComplete);
    if (stepId === STEP_FULFILLMENT) return isStep1Complete && (!requiresBusinessInfo || isStepBusinessInfoComplete) && (!hasRequiredDocs || isStepDocsComplete);
    if (stepId === STEP_REVIEW) return Boolean(isStepFulfillmentComplete);
    return false;
  };

  // Mark step 1 as complete when user logs in
  useEffect(() => {
    if (user && !completedSteps.includes(1)) {
      setCompletedSteps(prev => [...prev, 1]);
      // Auto-advance to next step
      if (requiresBusinessInfo) {
        setActiveStep(STEP_BUSINESS_INFO);
      } else if (hasRequiredDocs) {
        setActiveStep(STEP_DOCUMENTS);
      } else {
        setActiveStep(STEP_FULFILLMENT);
      }
    }
  }, [user, requiresBusinessInfo, hasRequiredDocs, completedSteps]);

  const handleDatesSelected = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
    // Switching dates inside checkout should reset any hourly-only URL params
    setStartTime(undefined);
    setEndTime(undefined);

    // Update URL
    const params = new URLSearchParams(searchParams);
    ['startTime', 'endTime', 'hours', 'hourlyData', 'timeSlots'].forEach((key) => params.delete(key));
    params.set('start', format(start, 'yyyy-MM-dd'));
    params.set('end', format(end, 'yyyy-MM-dd'));
    navigate(`/book/${listingId}?${params.toString()}`, { replace: true });
  };

  const handleCompleteStep = (stepId: number) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps(prev => [...prev, stepId]);
    }
    // Move to next step
    const nextStep = steps.find(s => s.id > stepId);
    if (nextStep) {
      setActiveStep(nextStep.id);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!startDate || !endDate || !userInfo || !listing) {
      toast({
        title: 'Missing information',
        description: 'Please complete all required fields.',
        variant: 'destructive',
      });
      return;
    }

    // Prevent owners from booking their own listings
    if (user.id === listing.host_id) {
      toast({
        title: 'Cannot book your own listing',
        description: 'You cannot rent your own listing.',
        variant: 'destructive',
      });
      return;
    }

    // Check if we're in an iframe
    const isInIframe = (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();

    // Pre-open a blank window BEFORE async calls to avoid popup blockers
    const checkoutWindow = isInIframe ? window.open('about:blank', '_blank') : null;

    setIsSubmitting(true);

    try {
      const bookingData = {
        listing_id: listingId,
        host_id: listing.host_id,
        shopper_id: user.id,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        message: message.trim() || null,
        total_price: fees.customerTotal,
        fulfillment_selected: fulfillmentSelected,
        is_instant_book: listing.instant_book || false,
        deposit_amount: depositAmount,
        // Hourly booking fields
        is_hourly_booking: isHourlyBooking,
        start_time: isHourlyBooking ? (startTime ?? null) : null,
        end_time: isHourlyBooking ? (endTime ?? null) : null,
        duration_hours: isHourlyBooking ? durationHours : null,
        // Slot selection for vendor spaces
        slot_number: hasMultipleSlots && selectedSlot ? selectedSlot : null,
        slot_name: hasMultipleSlots && selectedSlotName ? selectedSlotName : null,
        // Business info for food-related categories (cast to Json for Supabase)
        business_info: requiresBusinessInfo && businessInfo ? (businessInfo as unknown as Record<string, unknown>) : null,
        ...(fulfillmentSelected === 'delivery' && {
          delivery_address: deliveryAddress.trim(),
          delivery_fee_snapshot: listing.delivery_fee || null,
        }),
      };

      const { data: bookingResult, error: bookingError } = await supabase
        .from('booking_requests')
        .insert(bookingData as any)
        .select('id')
        .single();

      if (bookingError) throw bookingError;

      // Upload staged documents if any
      if (stagedDocuments.length > 0) {
        for (const stagedDoc of stagedDocuments) {
          try {
            const fileExt = stagedDoc.file.name.split('.').pop();
            const fileName = `${stagedDoc.documentType}_${Date.now()}.${fileExt}`;
            const filePath = `${bookingResult.id}/${fileName}`;

            // Upload file to storage
            const { error: uploadError } = await supabase.storage
              .from('booking-documents')
              .upload(filePath, stagedDoc.file, {
                cacheControl: '3600',
                upsert: false,
              });

            if (uploadError) {
              console.error('Error uploading document:', uploadError);
              continue;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
              .from('booking-documents')
              .getPublicUrl(filePath);

            // Create document record
            await supabase
              .from('booking_documents')
              .insert({
                booking_id: bookingResult.id,
                document_type: stagedDoc.documentType,
                file_url: urlData.publicUrl,
                file_name: stagedDoc.file.name,
                status: 'pending',
              });

            // Send notification for document uploaded
            supabase.functions.invoke('send-document-notification', {
              body: {
                booking_id: bookingResult.id,
                document_type: stagedDoc.documentType,
                event_type: 'uploaded',
              },
            }).catch(console.error);
          } catch (docError) {
            console.error('Error processing document:', docError);
          }
        }
      }

      // Create authorization hold checkout - payment is held until host approves
      // For Instant Book: use regular checkout (immediate capture)
      // For Request to Book: use authorization hold (capture on approval)
      const checkoutFunction = listing.instant_book ? 'create-checkout' : 'create-booking-hold';
      
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(checkoutFunction, {
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

      // Fire tracking calls asynchronously to not block the redirect
      const formType = listing.instant_book ? 'instant_book' : 'booking_request_hold';
      setTimeout(() => {
        trackFormSubmitConversion({ form_type: formType, listing_id: listingId });
        trackRequestSubmitted(listingId || '', listing.instant_book || false);
      }, 0);
      
      // NOTE: Do NOT send booking notification here - notifications are sent
      // ONLY after payment is confirmed via the stripe-webhook function
      
      // Redirect to Stripe checkout IMMEDIATELY (don't wait for tracking)
      if (checkoutWindow) {
        // Use pre-opened window to bypass popup blockers in iframe
        checkoutWindow.location.href = checkoutData.url;
        return;
      }

      if (isInIframe) {
        // Fallback: try to escape the iframe
        try {
          window.top?.location.assign(checkoutData.url);
        } catch {
          window.location.assign(checkoutData.url);
        }
        return;
      }

      // Standard navigation for non-iframe contexts
      window.location.href = checkoutData.url;
    } catch (error) {
      // Close the pre-opened window if there was an error
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

  if (error || !listing) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 container py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Listing not found</h1>
          <Button asChild>
            <Link to="/search">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Search
            </Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  // For vendor spaces with multiple slots, require slot selection before dates
  if (hasMultipleSlots && !selectedSlot) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container py-8 max-w-2xl">
          <Button 
            variant="ghost" 
            size="sm" 
            asChild 
            className="mb-6 text-muted-foreground hover:text-foreground"
          >
            <Link to={`/listing/${listingId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to listing
            </Link>
          </Button>
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Select your space</h1>
            <p className="text-muted-foreground">Choose which space or station you'd like to book, then select your dates</p>
          </div>
          
          {/* Listing preview */}
          <div className="flex gap-4 p-4 bg-card border border-border rounded-xl mb-6">
            <img
              src={listing.cover_image_url || listing.image_urls?.[0] || '/placeholder.svg'}
              alt={listing.title}
              className="w-20 h-16 object-cover rounded-lg"
            />
            <div>
              <h3 className="font-semibold text-foreground text-sm line-clamp-1">{listing.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {(listing as any).total_slots || 1} spaces available
              </p>
            </div>
          </div>
          
          {/* Slot selector - no dates required yet */}
          <div className="bg-card border border-border rounded-xl p-6">
            <Label className="text-sm font-medium flex items-center gap-2 mb-4">
              <MapPin className="h-4 w-4 text-primary" />
              Available Spaces
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: (listing as any).total_slots || 1 }, (_, i) => {
                const slotNumber = i + 1;
                const slotNames = (listing as any).slot_names as string[] | null;
                const slotName = slotNames && slotNames[i] ? slotNames[i] : `Spot ${slotNumber}`;
                const isSelected = selectedSlot === slotNumber;
                
                return (
                  <button
                    key={slotNumber}
                    type="button"
                    onClick={() => {
                      setSelectedSlot(slotNumber);
                      setSelectedSlotName(slotName);
                    }}
                    className={cn(
                      "relative p-4 rounded-xl border-2 transition-all duration-200 text-left group",
                      isSelected
                        ? "glass-premium border-primary shadow-md shadow-primary/10"
                        : "bg-card border-border hover:border-primary/50 hover:shadow-sm"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                    )}
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted group-hover:bg-primary/10 text-foreground group-hover:text-primary"
                          )}
                        >
                          <MapPin className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium text-foreground">{slotName}</span>
                      </div>
                      {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          
          {selectedSlot && (
            <div className="mt-6 text-center">
              <Button onClick={() => setShowDateModal(true)} variant="dark-shine" size="lg">
                <Calendar className="h-4 w-4 mr-2" />
                Continue to Select Dates
              </Button>
            </div>
          )}
          
          <DateSelectionModal
            open={showDateModal}
            onOpenChange={setShowDateModal}
            listingId={listingId!}
            availableFrom={listing.available_from}
            availableTo={listing.available_to}
            priceDaily={listing.price_daily}
            priceWeekly={listing.price_weekly}
            priceMonthly={listing.price_monthly}
            priceHourly={listing.price_hourly}
            hourlyEnabled={(listing.hourly_enabled || false) || (typeof listing.price_hourly === 'number' && listing.price_hourly > 0)}
            dailyEnabled={listing.daily_enabled !== false}
            onDatesSelected={handleDatesSelected}
          />
        </main>
        <Footer />
      </div>
    );
  }

  if (!startDate || !endDate) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 container py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Select your dates</h1>
          <p className="text-muted-foreground mb-8">Please select your rental dates to continue</p>
          <Button onClick={() => setShowDateModal(true)}>
            <Calendar className="h-4 w-4 mr-2" />
            Select Dates
          </Button>
          <DateSelectionModal
            open={showDateModal}
            onOpenChange={setShowDateModal}
            listingId={listingId!}
            availableFrom={listing.available_from}
            availableTo={listing.available_to}
            priceDaily={listing.price_daily}
            priceWeekly={listing.price_weekly}
            priceMonthly={listing.price_monthly}
            priceHourly={listing.price_hourly}
            hourlyEnabled={(listing.hourly_enabled || false) || (typeof listing.price_hourly === 'number' && listing.price_hourly > 0)}
            dailyEnabled={listing.daily_enabled !== false}
            onDatesSelected={handleDatesSelected}
          />
        </div>
        <Footer />
      </div>
    );
  }

  const coverImage = listing.cover_image_url || listing.image_urls?.[0] || '/placeholder.svg';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container py-6 lg:py-10">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          asChild 
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <Link to={`/listing/${listingId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to listing
          </Link>
        </Button>

        {/* Title */}
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-8">
          {listing.instant_book ? 'Book instantly' : 'Request to book'}
        </h1>

        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Left Column - Steps */}
          <div className="lg:col-span-3 space-y-4">
            {/* Step 1: Login */}
            <div className="border border-border rounded-2xl overflow-hidden bg-card">
              <button
                onClick={() => setActiveStep(activeStep === STEP_LOGIN ? null : STEP_LOGIN)}
                className="w-full p-5 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-4">
                  <span className="text-lg font-semibold">1. Log in or sign up</span>
                  {isStep1Complete && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  )}
                </div>
                {!isStep1Complete && (
                  <Button variant="dark-shine" size="sm" asChild onClick={(e) => e.stopPropagation()}>
                    <Link
                      to={`/auth?redirect=${encodeURIComponent(`/book/${listingId}?${searchParams.toString()}`)}`}
                    >
                      Continue
                    </Link>
                  </Button>
                )}
                {isStep1Complete && (
                  <ChevronDown className={cn(
                    "h-5 w-5 text-muted-foreground transition-transform",
                    activeStep === STEP_LOGIN && "rotate-180"
                  )} />
                )}
              </button>
              <AnimatePresence>
                {activeStep === STEP_LOGIN && isStep1Complete && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border"
                  >
                    <div className="p-5 bg-muted/30">
                      <p className="text-sm text-muted-foreground">
                        Logged in as <span className="font-medium text-foreground">{user?.email}</span>
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Step 2: Business Info (for food-related categories) */}
            {requiresBusinessInfo && (
              <div className="border border-border rounded-2xl overflow-hidden bg-card">
                <button
                  onClick={() => canAccessStep(STEP_BUSINESS_INFO) && setActiveStep(activeStep === STEP_BUSINESS_INFO ? null : STEP_BUSINESS_INFO)}
                  disabled={!canAccessStep(STEP_BUSINESS_INFO)}
                  className={cn(
                    "w-full p-5 flex items-center justify-between text-left",
                    !canAccessStep(STEP_BUSINESS_INFO) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-semibold">{STEP_BUSINESS_INFO}. Business information</span>
                    {isStepBusinessInfoComplete && (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    )}
                  </div>
                  <ChevronDown className={cn(
                    "h-5 w-5 text-muted-foreground transition-transform",
                    activeStep === STEP_BUSINESS_INFO && "rotate-180"
                  )} />
                </button>
                <AnimatePresence>
                  {activeStep === STEP_BUSINESS_INFO && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border"
                    >
                      <div className="p-5">
                        <p className="text-sm text-muted-foreground mb-4">
                          Help the host understand your business and how you'll use the kitchen.
                        </p>
                        <BusinessInfoStep
                          businessInfo={businessInfo}
                          onBusinessInfoChange={setBusinessInfo}
                          onComplete={() => handleCompleteStep(STEP_BUSINESS_INFO)}
                          disabled={isSubmitting}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Step: Documents (if required) */}
            {hasRequiredDocs && (
              <div className="border border-border rounded-2xl overflow-hidden bg-card">
                <button
                  onClick={() => canAccessStep(STEP_DOCUMENTS) && setActiveStep(activeStep === STEP_DOCUMENTS ? null : STEP_DOCUMENTS)}
                  disabled={!canAccessStep(STEP_DOCUMENTS)}
                  className={cn(
                    "w-full p-5 flex items-center justify-between text-left",
                    !canAccessStep(STEP_DOCUMENTS) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-semibold">{STEP_DOCUMENTS}. Required documents</span>
                    {isStepDocsComplete && (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    )}
                  </div>
                  <ChevronDown className={cn(
                    "h-5 w-5 text-muted-foreground transition-transform",
                    activeStep === STEP_DOCUMENTS && "rotate-180"
                  )} />
                </button>
                <AnimatePresence>
                  {activeStep === STEP_DOCUMENTS && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border"
                    >
                      <div className="p-5">
                        <BookingDocumentUpload
                          requiredDocs={requiredDocs || []}
                          stagedDocuments={stagedDocuments}
                          onDocumentsChange={setStagedDocuments}
                          onComplete={() => handleCompleteStep(STEP_DOCUMENTS)}
                          disabled={isSubmitting}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Step: Fulfillment & Details */}
            <div className="border border-border rounded-2xl overflow-hidden bg-card">
              <button
                onClick={() => canAccessStep(STEP_FULFILLMENT) && setActiveStep(activeStep === STEP_FULFILLMENT ? null : STEP_FULFILLMENT)}
                disabled={!canAccessStep(STEP_FULFILLMENT)}
                className={cn(
                  "w-full p-5 flex items-center justify-between text-left",
                  !canAccessStep(STEP_FULFILLMENT) && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-4">
                  <span className="text-lg font-semibold">{STEP_FULFILLMENT}. Fulfillment & details</span>
                  {isStepFulfillmentComplete && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  )}
                </div>
                <ChevronDown className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform",
                  activeStep === STEP_FULFILLMENT && "rotate-180"
                )} />
              </button>
              <AnimatePresence>
                {activeStep === STEP_FULFILLMENT && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border"
                  >
                    <div className="p-5 space-y-6">
                      {/* Fulfillment Options - Mobile assets only */}
                      {isMobileAsset && listing.fulfillment_type === 'both' && (
                        <div>
                          <Label className="text-sm font-medium mb-3 block">Fulfillment method</Label>
                          <RadioGroup
                            value={fulfillmentSelected}
                            onValueChange={(val) => setFulfillmentSelected(val as FulfillmentSelection)}
                            className="space-y-2"
                          >
                            <div className={cn(
                              "flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer",
                              fulfillmentSelected === 'pickup' ? 'border-primary bg-primary/5' : 'border-border'
                            )}>
                              <RadioGroupItem value="pickup" id="checkout-pickup" />
                              <Label htmlFor="checkout-pickup" className="flex-1 cursor-pointer">
                                <span className="font-medium block">Pickup</span>
                                <span className="text-xs text-muted-foreground">Collect from host location</span>
                              </Label>
                            </div>
                            <div className={cn(
                              "flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer",
                              fulfillmentSelected === 'delivery' ? 'border-primary bg-primary/5' : 'border-border'
                            )}>
                              <RadioGroupItem value="delivery" id="checkout-delivery" />
                              <Label htmlFor="checkout-delivery" className="flex-1 cursor-pointer">
                                <span className="font-medium block">Delivery</span>
                                <span className="text-xs text-muted-foreground">Delivered to your location</span>
                              </Label>
                              {listing.delivery_fee && (
                                <span className="text-sm font-medium text-primary">+${listing.delivery_fee}</span>
                              )}
                            </div>
                          </RadioGroup>
                        </div>
                      )}

                      {/* Pickup info */}
                      {(fulfillmentSelected === 'pickup' || isStaticLocation) && (
                        <div className="p-4 bg-muted/50 rounded-xl">
                          <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                {isStaticLocation ? 'Location' : 'Pickup Location'}
                              </span>
                              <p className="text-sm font-medium text-foreground mt-1">
                                {isStaticLocation 
                                  ? 'Exact address will be sent after confirmation'
                                  : listing.pickup_location_text || 'Address will be provided after confirmation'
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Delivery address */}
                      {fulfillmentSelected === 'delivery' && (
                        <div>
                          <Label htmlFor="delivery-addr" className="text-sm font-medium mb-2 block">
                            Delivery address
                          </Label>
                          <Input
                            id="delivery-addr"
                            placeholder="Enter your full address"
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            className="h-12"
                          />
                        </div>
                      )}

                      {/* Message */}
                      <div>
                        <Label htmlFor="msg" className="text-sm font-medium mb-2 block">
                          Message to host (optional)
                        </Label>
                        <Textarea
                          id="msg"
                          placeholder="Tell them about your event or how you'll use this rental..."
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          rows={3}
                        />
                      </div>

                      {/* Your info */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Your information</Label>
                        {userInfo?.agreedToTerms ? (
                          <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                            <div className="flex items-center gap-3">
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                              <div>
                                <span className="font-medium text-emerald-700 dark:text-emerald-300">
                                  {userInfo.firstName} {userInfo.lastName}
                                </span>
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 block">
                                  Information complete
                                </span>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setShowInfoModal(true)}>
                              Edit
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            className="w-full h-12 border-dashed"
                            onClick={() => setShowInfoModal(true)}
                          >
                            Complete your information
                          </Button>
                        )}
                      </div>

                      <Button 
                        onClick={() => handleCompleteStep(STEP_FULFILLMENT)}
                        disabled={!isStepFulfillmentComplete}
                        className="w-full"
                      >
                        Continue to review
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Step: Review */}
            <div className="border border-border rounded-2xl overflow-hidden bg-card">
              <button
                onClick={() => canAccessStep(STEP_REVIEW) && setActiveStep(activeStep === STEP_REVIEW ? null : STEP_REVIEW)}
                disabled={!canAccessStep(STEP_REVIEW)}
                className={cn(
                  "w-full p-5 flex items-center justify-between text-left",
                  !canAccessStep(STEP_REVIEW) && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className="text-lg font-semibold">{STEP_REVIEW}. Review your request</span>
                <ChevronDown className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform",
                  activeStep === STEP_REVIEW && "rotate-180"
                )} />
              </button>
              <AnimatePresence>
                {activeStep === STEP_REVIEW && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border"
                  >
                    <div className="p-5 space-y-4">
                      {/* Summary */}
                      <div className="space-y-3">
                        {hasMultipleSlots && selectedSlotName && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Space</span>
                            <span className="font-medium">{selectedSlotName}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Dates</span>
                          <span className="font-medium">
                            {format(startDate, 'MMM d')} – {format(endDate, 'MMM d, yyyy')}
                          </span>
                        </div>
                        {isHourlyBooking ? (
                          <>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Hours</span>
                              <span className="font-medium">
                                {durationHours} hour{durationHours === 1 ? '' : 's'}
                                {selectedHourlyDays > 0
                                  ? ` across ${selectedHourlyDays} day${selectedHourlyDays === 1 ? '' : 's'}`
                                  : ''}
                              </span>
                            </div>

                            {startTime && endTime ? (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Time</span>
                                <span className="font-medium">
                                  {startTime} – {endTime}
                                </span>
                              </div>
                            ) : null}

                            <HourlySelectionSummary selections={hourlySelections} />
                          </>
                        ) : (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Duration</span>
                            <span className="font-medium">{rentalDays} day{rentalDays > 1 ? 's' : ''}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Fulfillment</span>
                          <span className="font-medium capitalize">{fulfillmentSelected.replace('_', ' ')}</span>
                        </div>
                      </div>

                      {/* Trust badges */}
                      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="text-xs text-muted-foreground">
                          Your payment is protected by Vendibook
                        </span>
                      </div>

                      {/* Submit button */}
                      <Button
                        variant="dark-shine"
                        className="w-full h-14 text-base"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            Processing...
                          </>
                        ) : listing.instant_book ? (
                          <>
                            <Zap className="h-5 w-5 mr-2" />
                            Confirm and pay ${(fees.customerTotal + (depositAmount || 0)).toLocaleString()}
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-5 w-5 mr-2" />
                            Continue to payment · ${(fees.customerTotal + (depositAmount || 0)).toLocaleString()}
                          </>
                        )}
                      </Button>

                      {!listing.instant_book && (
                        <p className="text-xs text-center text-muted-foreground">
                          You'll enter card details on the next page. Your card will be authorized but not charged until the host approves.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Column - Summary Card */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 border border-border rounded-2xl p-5 bg-card space-y-4">
              {/* Listing preview */}
              <div className="flex gap-4">
                <img
                  src={coverImage}
                  alt={listing.title}
                  className="w-24 h-20 object-cover rounded-xl"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground line-clamp-2 text-sm">
                    {listing.title}
                  </h3>
                  {ratingData && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-medium">{ratingData.average}</span>
                      <span className="text-xs text-muted-foreground">({ratingData.count})</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-border pt-4">
                {/* Selected slot for vendor spaces */}
                {hasMultipleSlots && selectedSlotName && (
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-sm font-medium">Space</span>
                      <p className="text-sm text-muted-foreground">{selectedSlotName}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      <MapPin className="h-3 w-3 mr-1" />
                      Selected
                    </Badge>
                  </div>
                )}

                {/* Free cancellation */}
                <div className="flex items-start gap-2 mb-4">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-sm font-medium">Free cancellation</span>
                    <p className="text-xs text-muted-foreground">
                      Cancel within 24 hours for a full refund.
                    </p>
                  </div>
                </div>

                {/* Dates */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-sm font-medium">Dates</span>
                    <p className="text-sm text-muted-foreground">
                      {format(startDate, 'MMM d')} – {format(endDate, 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowDateModal(true)}
                  >
                    Change
                  </Button>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <h4 className="font-medium text-sm">Price details</h4>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {isHourlyBooking ? (
                      <>
                        {durationHours} hr × ${listing.price_hourly?.toLocaleString()}
                      </>
                    ) : (
                      <>
                        {rentalDays} day{rentalDays > 1 ? 's' : ''} × ${listing.price_daily?.toLocaleString()}
                      </>
                    )}
                  </span>
                  <span>${basePrice.toLocaleString()}</span>
                </div>

                {currentDeliveryFee > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Delivery fee</span>
                    <span>${currentDeliveryFee.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Service fee</span>
                  <span>${fees.renterFee.toLocaleString()}</span>
                </div>

                {depositAmount && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      Security deposit
                      <InfoTooltip 
                        content="Your security deposit will be returned within 24 hours after your booking ends, minus any charges for damages or late returns."
                        side="top"
                      />
                    </span>
                    <span>${depositAmount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold">${(fees.customerTotal + (depositAmount || 0)).toLocaleString()}</span>
                </div>

                {/* Financing badges for rentals */}
                {!isHourlyBooking && listing.price_daily && (
                  <div className="flex items-center gap-2 pt-3 flex-wrap">
                    <AfterpayBadge price={listing.price_daily * 7} showEstimate={false} />
                    <AffirmBadge price={listing.price_daily * 30} showEstimate={false} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Modals */}
      <DateSelectionModal
        open={showDateModal}
        onOpenChange={setShowDateModal}
        listingId={listingId!}
        availableFrom={listing.available_from}
        availableTo={listing.available_to}
        priceDaily={listing.price_daily}
        priceWeekly={listing.price_weekly}
        priceMonthly={listing.price_monthly}
        priceHourly={listing.price_hourly}
        hourlyEnabled={(listing.hourly_enabled || false) || (typeof listing.price_hourly === 'number' && listing.price_hourly > 0)}
        dailyEnabled={listing.daily_enabled !== false}
        onDatesSelected={handleDatesSelected}
      />

      <BookingInfoModal
        open={showInfoModal}
        onOpenChange={setShowInfoModal}
        onComplete={(info) => {
          setUserInfo(info);
          setShowInfoModal(false);
        }}
        initialData={userInfo || undefined}
      />
    </div>
  );
};

export default BookingCheckout;
