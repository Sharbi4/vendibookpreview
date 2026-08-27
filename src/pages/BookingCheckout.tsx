import { useState, useEffect, useMemo, useRef } from 'react';
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
import { quoteRentalPeriod } from '@/lib/listings/rentalPricing';
import { trackFormSubmitConversion } from '@/lib/gtagConversions';
import { trackRequestStarted, trackRequestSubmitted } from '@/lib/analytics';
import { PayPalPaymentPanel } from '@/components/checkout';

import CheckoutOrderSummary, { type OrderSummaryLine } from '@/components/checkout/CheckoutOrderSummary';
import { isEmbeddedCheckoutEnabled } from '@/lib/featureFlags';
import { parseEdgeError } from '@/lib/edgeErrors';
import { checkoutErrorCopy } from '@/lib/checkoutErrorCopy';
import { FinalReviewSheet } from '@/components/transaction/FinalReviewSheet';
import { useTermsGate } from '@/hooks/useTermsGate';
import { buildTerms } from '@/lib/transactionTerms';
import { cn } from '@/lib/utils';
import { type BookingUserInfo, SlotSelector, BusinessInfoStep, type BusinessInfoData, ContactInfoWizard } from '@/components/booking';
import { BookingDocumentUpload, type StagedDocument } from '@/components/booking/BookingDocumentUpload';
import { useDocumentsOnFile } from '@/hooks/useDocumentsOnFile';
import HourlySelectionSummary from '@/components/booking/HourlySelectionSummary';
import { parseHourlySelections, getSelectedDaysCount, getTotalSelectedHours } from '@/lib/hourlySelections';
import DateSelectionModal from '@/components/listing-detail/DateSelectionModal';
import type { ListingCategory, FulfillmentType } from '@/types/listing';
import type { DocumentType } from '@/types/documents';
import { AuthGateOfferModal } from '@/components/offers/AuthGateOfferModal';
import {
  JourneyProgress,
  PrimaryActionBar,
  type JourneyStep,
} from '@/components/journey';

import { trackLeadEvent } from '@/lib/leadTracking';
import { detectAvailabilityConflict } from '@/lib/availabilityConflict';
import { ReferralCodeField } from '@/components/referrals/ReferralCodeField';
import { useSellerVerifiedBadge } from '@/hooks/useSellerVerifiedBadge';
import { authPath } from '@/lib/auth/returnTo';

type FulfillmentSelection = 'pickup' | 'delivery' | 'on_site';

const BookingCheckout = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { listing, isLoading, error } = useListing(listingId);
  /**
   * Instant Book skips host approval ONLY for identity-verified hosts.
   * Everyone else: payment is taken and the booking waits for the host to
   * accept. Mirrors the server rule in `paypalFinalize`.
   */
  const { verified: hostIdentityVerified } = useSellerVerifiedBadge(listing?.host_id);
  const instantConfirm = !!listing?.instant_book && hostIdentityVerified;
  const { data: ratingData } = useListingAverageRating(listingId);
  const { data: requiredDocs } = useListingRequiredDocuments(listingId || '');
  const requiredDocTypes = requiredDocs?.map(d => d.document_type as string);
  const { data: docsOnFileData } = useDocumentsOnFile(requiredDocTypes);
  const docsOnFile = docsOnFileData?.docsOnFile ?? false;
  const hasRequiredDocs = requiredDocs && requiredDocs.length > 0;
  /**
   * Only requirements the host explicitly configured as due BEFORE booking may
   * block checkout. Everything else (before approval / after approval) is
   * collected later, so Instant Book stays instant.
   */
  const preBookingBlockers = (requiredDocs ?? []).filter(
    (d) => d.is_required && d.deadline_type === 'before_booking_request',
  );

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
  const [referralCode, setReferralCode] = useState<string>('');
  const [referralValid, setReferralValid] = useState<boolean>(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [fulfillmentSelected, setFulfillmentSelected] = useState<FulfillmentSelection>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [message, setMessage] = useState('');
  const [userInfo, setUserInfo] = useState<BookingUserInfo | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paypalCheckout, setPaypalCheckout] = useState<{ bookingId: string; returnUrl: string } | null>(null);
  /** Guards against creating a second booking_request row if the buyer
   *  closes the PayPal panel and hits the submit button again. */
  const createdBookingIdRef = useRef<string | null>(null);
  /** Where /auth should send the buyer back to — the rental flow, never /checkout. */
  const bookingReturnPath = `/book/${listingId ?? ''}${
    searchParams.toString() ? `?${searchParams.toString()}` : ''
  }`;
  const confirmationUrl = (id: string) =>
    `${window.location.origin}/booking-confirmation?booking_id=${id}`;
  const [stagedDocuments, setStagedDocuments] = useState<StagedDocument[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
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
  
  /** Shared period quote (weekly/monthly bundling), also used for the summary line. */
  const rentalQuote = useMemo(
    () =>
      listing && rentalDays > 0
        ? quoteRentalPeriod(rentalDays, {
            price_daily: listing.price_daily,
            price_weekly: listing.price_weekly,
            price_monthly: (listing as { price_monthly?: number | null }).price_monthly,
          })
        : null,
    [listing, rentalDays],
  );

  const calculateBasePrice = () => {
    // For hourly bookings, use hourly rate
    if (isHourlyBooking && (listing as any)?.price_hourly && durationHours > 0) {
      return durationHours * (listing as any).price_hourly;
    }
    
    // For daily bookings — same shared engine the listing-detail widget uses,
    // so the total never changes between the calendar and this page. Handles
    // weekly/monthly-only listings that have no daily rate at all.
    return rentalQuote?.subtotal ?? 0;
  };

  const basePrice = calculateBasePrice();
  const currentDeliveryFee = fulfillmentSelected === 'delivery' && listing?.delivery_fee ? listing.delivery_fee : 0;
  const fees = calculateRentalFees(basePrice, currentDeliveryFee);
  const depositAmount = (listing as any)?.deposit_amount || null;

  // Estimated sales tax — server-computed (TaxJar / state table). The
  // authoritative amount is re-locked at order creation in
  // `paypal-create-order`; this is only so the renter sees the real total
  // before the PayPal window opens.
  const [taxEstimate, setTaxEstimate] = useState<{ tax_cents: number; rate_pct: number; label: string } | null>(null);
  // Quote lifecycle, so the summary can show an explicit tax row
  // ("calculating…" / "calculated at payment") instead of silently omitting
  // tax while the estimate is pending or unavailable.
  const [taxState, setTaxState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  useEffect(() => {
    if (!listing?.id || !fees.customerTotal) { setTaxEstimate(null); setTaxState('idle'); return; }
    const controller = new AbortController();
    setTaxState('loading');
    const t = setTimeout(() => {
      supabase.functions
        .invoke('tax-quote', {
          body: {
            kind: 'rental',
            listing_id: listing.id,
            total_cents: Math.round(fees.customerTotal * 100),
          },
        })
        .then(({ data, error }) => {
          if (controller.signal.aborted) return;
          if (!error && data) {
            setTaxEstimate(data);
            setTaxState('ready');
          } else {
            setTaxEstimate(null);
            setTaxState('error');
          }
        })
        .catch(() => {
          // Estimate is cosmetic; the server re-computes authoritatively.
          if (!controller.signal.aborted) {
            setTaxEstimate(null);
            setTaxState('error');
          }
        });
    }, 350);
    return () => { clearTimeout(t); controller.abort(); };
  }, [listing?.id, fees.customerTotal]);

  const taxAmount = (taxEstimate?.tax_cents ?? 0) / 100;
  const totalChargedToday = fees.customerTotal + taxAmount;

  // Always-visible tax row for the PayPal panel summary: real amount when
  // quoted, an explicit placeholder while calculating or when the estimate
  // is unavailable (the server still adds tax authoritatively at payment).
  const taxSummaryLine: OrderSummaryLine | null = taxAmount > 0
    ? { label: taxEstimate?.label || 'Estimated sales tax', amount: taxAmount }
    : taxState === 'loading'
      ? { label: 'Estimated sales tax', amount: 0, muted: true, valueLabel: 'Calculating…' }
      : taxState === 'error'
        ? { label: 'Sales tax', amount: 0, muted: true, valueLabel: 'Calculated at payment' }
        : null;

  // Step definitions — a single-page slide wizard (one screen at a time).
  // Order: About you (contact) -> Business info (if food) -> Documents (if required)
  //        -> Fulfillment -> Review
  const STEP_CONTACT = 1;
  const STEP_BUSINESS_INFO = requiresBusinessInfo ? 2 : -1;
  const STEP_DOCUMENTS = hasRequiredDocs ? (requiresBusinessInfo ? 3 : 2) : -1;
  const STEP_FULFILLMENT = 2 + (requiresBusinessInfo ? 1 : 0) + (hasRequiredDocs ? 1 : 0);
  const STEP_REVIEW = STEP_FULFILLMENT + 1;

  const steps = [
    { id: STEP_CONTACT, label: 'About you', icon: CheckCircle2 },
    ...(requiresBusinessInfo ? [{ id: STEP_BUSINESS_INFO, label: 'Business information', icon: Building2 }] : []),
    ...(hasRequiredDocs ? [{ id: STEP_DOCUMENTS, label: 'Documents & insurance', icon: FileCheck }] : []),
    { id: STEP_FULFILLMENT, label: 'Fulfillment & details', icon: Truck },
    { id: STEP_REVIEW, label: 'Review & submit', icon: CheckCircle2 },
  ];

  // Set initial active step
  useEffect(() => {
    if (activeStep === null) setActiveStep(STEP_CONTACT);
  }, []);

  // Check step completion
  const isStepContactComplete = Boolean(userInfo?.agreedToTerms);
  // Business info is complete when all required fields are filled
  const isBusinessInfoComplete = !requiresBusinessInfo || (
    businessInfo?.licenseType &&
    (businessInfo.licenseType !== 'other' || businessInfo.licenseTypeOther) &&
    businessInfo.employeeCount &&
    businessInfo.intendedUse?.trim() &&
    businessInfo.cuisineType?.trim()
  );
  const isStepBusinessInfoComplete = isBusinessInfoComplete && completedSteps.includes(STEP_BUSINESS_INFO);
  // Documents step is complete when all required docs are staged OR docs are on file
  const allDocsStaged = !hasRequiredDocs || docsOnFile || preBookingBlockers.every(req =>
    stagedDocuments.some(doc => doc.documentType === req.document_type)
  );
  const isStepDocsComplete = !hasRequiredDocs || (completedSteps.includes(STEP_DOCUMENTS) && allDocsStaged);
  const isFulfillmentComplete = Boolean(userInfo?.agreedToTerms) &&
    (fulfillmentSelected !== 'delivery' || Boolean(deliveryAddress.trim()));
  const isStepFulfillmentComplete = isFulfillmentComplete;

  // Determine which step can be accessed (no longer blocked by auth)
  const canAccessStep = (stepId: number): boolean => {
    if (stepId === STEP_CONTACT) return true;
    if (stepId === STEP_BUSINESS_INFO) return isStepContactComplete;
    if (stepId === STEP_DOCUMENTS) return isStepContactComplete && (!requiresBusinessInfo || isStepBusinessInfoComplete);
    if (stepId === STEP_FULFILLMENT) return isStepContactComplete && (!requiresBusinessInfo || isStepBusinessInfoComplete) && (!hasRequiredDocs || isStepDocsComplete);
    if (stepId === STEP_REVIEW) return Boolean(isStepFulfillmentComplete);
    return true;
  };

  const goToStep = (stepId: number) => {
    setActiveStep(stepId);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBackStep = () => {
    const idx = steps.findIndex((s) => s.id === activeStep);
    if (idx > 0) goToStep(steps[idx - 1].id);
  };


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

  const termsGate = useTermsGate();

  const buildCurrentTerms = () => {
    if (!listing || !listingId || !startDate || !endDate) return null;
    return buildTerms({
      listing: {
        id: listingId,
        title: listing.title,
        host_id: listing.host_id,
        cover_image_url: listing.cover_image_url ?? null,
        mode: 'rent',
        category: listing.category ?? null,
        cancellation_policy: (listing as { cancellation_policy?: string | null }).cancellation_policy ?? null,
        rules: (listing as { rules?: string | null }).rules ?? null,
        city: listing.city ?? null,
        state: listing.state ?? null,
        price_daily: listing.price_daily ?? null,
        price_weekly: listing.price_weekly ?? null,
        price_hourly: (listing as { price_hourly?: number | null }).price_hourly ?? null,
        security_deposit: listing.deposit_amount ?? null,
        accept_paypal_checkout: listing.accept_paypal_checkout ?? true,
      },
      selection: {
        mode: 'rent',
        paymentMethod: 'paypal_checkout',
        basePriceDollars: fees.subtotal - currentDeliveryFee,
        deliveryFeeDollars: currentDeliveryFee,
        depositDollars: depositAmount,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        startTime: isHourlyBooking ? (startTime ?? null) : null,
        endTime: isHourlyBooking ? (endTime ?? null) : null,
        fulfillmentType: fulfillmentSelected,
        slotNumber: hasMultipleSlots && selectedSlot ? selectedSlot : null,
      },
      buyer: {
        id: user?.id ?? null,
        email: user?.email ?? null,
        name: userInfo ? `${userInfo.firstName} ${userInfo.lastName}`.trim() || null : null,
      },
    });
  };

  const handleSubmit = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!startDate || !endDate || !userInfo || !listing) {
      toast({ title: 'Missing information', description: 'Please complete all required fields.', variant: 'destructive' });
      return;
    }
    if (user.id === listing.host_id) {
      toast({ title: 'Cannot book your own listing', description: 'You cannot rent your own listing.', variant: 'destructive' });
      return;
    }
    const t = buildCurrentTerms();
    if (!t) return;
    await termsGate.prepare(t);
  };

  const runSubmit = async () => {
    if (!user) {
      // Show inline auth modal instead of redirecting
      setShowAuthModal(true);
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
    const wantsEmbedded = isEmbeddedCheckoutEnabled() && (listing?.instant_book ?? false);
    const checkoutWindow = !wantsEmbedded && isInIframe ? window.open('about:blank', '_blank') : null;

    setIsSubmitting(true);

    try {
      // Convert hourlySelections map to array format for storage
      const hourlySlots = isHourlyBooking && Object.keys(hourlySelections).length > 0
        ? Object.entries(hourlySelections).map(([date, slots]) => ({
            date,
            slots: slots.sort(),
          }))
        : null;

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
        // Multi-day hourly slots stored as JSON
        hourly_slots: hourlySlots,
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

      // Reuse the already-created request instead of double-booking the dates,
      // but re-sync it with the buyer's current selection so PayPal (which
      // prices server-side from the row) can never charge stale dates/amounts.
      if (createdBookingIdRef.current) {
        const existingId = createdBookingIdRef.current;
        const { error: syncError } = await supabase
          .from('booking_requests')
          .update({
            ...(bookingData as any),
            delivery_address: fulfillmentSelected === 'delivery' ? deliveryAddress.trim() : null,
            delivery_fee_snapshot: fulfillmentSelected === 'delivery' ? (listing.delivery_fee || null) : null,
          })
          .eq('id', existingId)
          .eq('shopper_id', user.id)
          .neq('payment_status', 'paid');

        if (syncError) throw syncError;

        if (checkoutWindow) checkoutWindow.close();
        setPaypalCheckout({
          bookingId: existingId,
          returnUrl: confirmationUrl(existingId),
        });
        setIsSubmitting(false);
        return;
      }


      const { data: bookingResult, error: bookingError } = await supabase
        .from('booking_requests')
        .insert(bookingData as any)
        .select('id')
        .single();

      if (bookingError) throw bookingError;
      createdBookingIdRef.current = bookingResult.id;

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

      // PayPal checkout happens in-page, so the pre-opened popup isn't needed.
      if (checkoutWindow) checkoutWindow.close();

      // Availability is enforced by the database trigger on booking insert, so
      // reaching this point means the slot is still held for this guest.


      setPaypalCheckout({
        bookingId: bookingResult.id,
        returnUrl: confirmationUrl(bookingResult.id),
      });

      // Fire tracking calls asynchronously so they never block the payment panel.
      const formType = listing.instant_book ? 'instant_book' : 'booking_request_hold';
      setTimeout(() => {
        trackFormSubmitConversion({ form_type: formType, listing_id: listingId });
        trackRequestSubmitted(listingId || '', listing.instant_book || false);
      }, 0);

      // NOTE: Do NOT send booking notifications here — they are sent only after
      // the payment capture is verified server-side.
      setIsSubmitting(false);
      return;

    } catch (error) {
      // Close the pre-opened window if there was an error
      if (checkoutWindow) checkoutWindow.close();
      console.error('Error submitting booking:', error);
      const parsed = await parseEdgeError(error);
      const copy = checkoutErrorCopy(parsed);
      toast({
        title: copy.title,
        description: copy.description,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
      termsGate.reset();
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
              <Button onClick={() => setShowDateModal(true)} variant="cta" size="lg">
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

  // The old "$500 intro screen" was pure friction — the review step already
  // shows everything it did, so high-value rentals go straight to the wizard.

  const cancellationPolicyText =
    ((listing as { cancellation_policy?: string | null }).cancellation_policy || '').trim() || null;



  return (

    <div className="min-h-screen flex flex-col bg-background bg-[radial-gradient(1100px_520px_at_50%_-6%,hsl(var(--primary)/0.06),transparent_70%)]">
      <Header />
      
      <main className="flex-1 container py-8 lg:py-14">
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

        {/* Editorial title block — matches the How It Works type scale */}
        <div className="mb-10 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Vendibook checkout
          </p>
          <h1 className="mt-2 text-3xl lg:text-4xl font-semibold tracking-tight text-foreground">
            {instantConfirm ? 'Book instantly' : 'Request to book'}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            {instantConfirm
              ? 'Confirm your dates and details — your booking is confirmed as soon as payment goes through.'
              : 'Send your dates and details to the host. Nothing is charged until your request is accepted.'}
          </p>
        </div>


        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Left Column - Steps */}
          <div className="lg:col-span-3 space-y-4">
            {/* Persistent roadmap — mirrors the dynamic accordion steps */}
            <JourneyProgress
              steps={steps.map((s): JourneyStep => ({
                id: String(s.id),
                label: s.label,
              }))}
              currentIndex={Math.max(
                0,
                steps.findIndex((s) => s.id === activeStep),
              )}
              estimate="About 3 minutes"
            />
            {/* Auth Status Banner - informational only, not blocking */}
            {user ? (
              <div className="border border-border/70 rounded-[22px] overflow-hidden bg-card shadow-[0_1px_2px_rgba(24,20,16,0.04),0_28px_64px_-40px_rgba(24,20,16,0.45)] p-5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <p className="text-sm text-muted-foreground">
                    Logged in as <span className="font-medium text-foreground">{user?.email}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="border border-primary/40 rounded-2xl overflow-hidden bg-primary/[0.06] p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Sign in to complete your booking</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Sign in now so we keep your details when you return — no need to retype anything.
                    </p>
                  </div>
                  <Link
                    to={authPath(bookingReturnPath)}
                    className="shrink-0 inline-flex items-center justify-center h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    Sign in / Create account
                  </Link>
                </div>
              </div>
            )}


            {/* Step 2: Business Info (for food-related categories) */}
            {requiresBusinessInfo && (
              <div className="border border-border/70 rounded-[22px] overflow-hidden bg-card shadow-[0_1px_2px_rgba(24,20,16,0.04),0_28px_64px_-40px_rgba(24,20,16,0.45)]">
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
                          category={listing.category}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Step: Documents (if required) */}
            {hasRequiredDocs && (
              <div className="border border-border/70 rounded-[22px] overflow-hidden bg-card shadow-[0_1px_2px_rgba(24,20,16,0.04),0_28px_64px_-40px_rgba(24,20,16,0.45)]">
                <button
                  onClick={() => canAccessStep(STEP_DOCUMENTS) && setActiveStep(activeStep === STEP_DOCUMENTS ? null : STEP_DOCUMENTS)}
                  disabled={!canAccessStep(STEP_DOCUMENTS)}
                  className={cn(
                    "w-full p-5 flex items-center justify-between text-left",
                    !canAccessStep(STEP_DOCUMENTS) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-semibold">{STEP_DOCUMENTS}. Documents & insurance</span>
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
                          docsOnFile={docsOnFile}
                          onFileExpiresAt={docsOnFileData?.expiresAt}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Step: Fulfillment & Details */}
            <div className="border border-border/70 rounded-[22px] overflow-hidden bg-card shadow-[0_1px_2px_rgba(24,20,16,0.04),0_28px_64px_-40px_rgba(24,20,16,0.45)]">
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

                      {/* Your info — step-by-step contact onboarding */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Your information</Label>
                        {userInfo?.agreedToTerms && !showInfoModal ? (
                          <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                            <div className="flex items-center gap-3">
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                              <div>
                                <span className="font-medium text-emerald-700 dark:text-emerald-300">
                                  {userInfo.firstName} {userInfo.lastName}
                                </span>
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 block">
                                  Contact details saved
                                </span>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setShowInfoModal(true)}>
                              Edit
                            </Button>
                          </div>
                        ) : (
                          <ContactInfoWizard
                            listingId={listingId}
                            initialData={userInfo || undefined}
                            onPartialChange={(partial) => setUserInfo(partial)}
                            onComplete={(info) => {
                              setUserInfo(info);
                              setShowInfoModal(false);
                            }}
                          />
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
            <div className="border border-border/70 rounded-[22px] overflow-hidden bg-card shadow-[0_1px_2px_rgba(24,20,16,0.04),0_28px_64px_-40px_rgba(24,20,16,0.45)]">
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

                      {/* Referral code */}
                      <div className="p-3 border border-border rounded-lg">
                        <ReferralCodeField
                          programType="rental"
                          value={referralCode}
                          onChange={(code, valid) => { setReferralCode(code); setReferralValid(valid); }}
                          autoFillFromCookie
                        />
                      </div>

                      {/* How this payment works — factual, no protection promises */}
                      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium text-foreground">How this payment works</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {instantConfirm
                            ? 'PayPal processes your payment now. Your booking is confirmed as soon as the payment completes, and the full record is saved to your account.'
                            : 'PayPal processes your payment now and your dates are held. The host still has to accept the request — if they decline or do not respond, Vendibook refunds the payment to your original payment method.'}
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Vendibook records the transaction and releases host payouts after the rental begins. Vendibook does not hold funds in escrow.
                        </p>
                      </div>

                      {/* Submit button */}
                      <Button
                        variant="cta"
                        className="w-full h-14 text-base"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            Processing...
                          </>
                        ) : instantConfirm ? (
                          <>
                            <Zap className="h-5 w-5 mr-2" />
                            Confirm and pay ${totalChargedToday.toLocaleString()}
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-5 w-5 mr-2" />
                            Continue to payment · ${totalChargedToday.toLocaleString()}
                          </>
                        )}
                      </Button>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sticky mobile-first primary path */}
            <PrimaryActionBar
              sticky
              helper={
                activeStep === STEP_REVIEW
                  ? 'Confirm and pay using the panel above.'
                  : 'Complete each step above to unlock review & payment.'
              }
              primary={{
                label:
                  activeStep === STEP_REVIEW
                    ? instantConfirm
                      ? 'Confirm and pay'
                      : 'Continue to payment'
                    : 'Jump to review',
                onClick: () => {
                  if (activeStep === STEP_REVIEW) {
                    handleSubmit();
                  } else {
                    setActiveStep(STEP_REVIEW);
                  }
                },
                disabled:
                  activeStep === STEP_REVIEW
                    ? isSubmitting
                    : !canAccessStep(STEP_REVIEW),
              }}
              secondary={{
                label: 'Back to listing',
                onClick: () => navigate(`/listing/${listingId}`),
              }}
            />
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

                {/* Cancellation policy — listing-specific, never a blanket promise */}
                <div className="flex items-start gap-2 mb-4">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-sm font-medium">Cancellation policy</span>
                    <p className="text-xs text-muted-foreground">
                      {cancellationPolicyText ?? (
                        <>
                          This host hasn't published a custom policy, so Vendibook's standard
                          rental policy applies: cancel before the host accepts for a full
                          refund; after acceptance, refunds follow the terms you accept at
                          payment.{' '}
                          <Link to={`/listing/${listingId}#terms`} className="underline underline-offset-2">
                            See rental terms
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                </div>


                {/* Dates / Hours summary */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {isHourlyBooking ? 'Scheduled Hours' : 'Dates'}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowDateModal(true)}
                    >
                      Change
                    </Button>
                  </div>

                  {isHourlyBooking ? (
                    <>
                      <p className="text-sm text-muted-foreground mb-2">
                        {durationHours} hour{durationHours === 1 ? '' : 's'}
                        {selectedHourlyDays > 0
                          ? ` across ${selectedHourlyDays} day${selectedHourlyDays === 1 ? '' : 's'}`
                          : ''}
                      </p>
                      <HourlySelectionSummary selections={hourlySelections} variant="compact" />
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {format(startDate, 'MMM d')} – {format(endDate, 'MMM d, yyyy')}
                    </p>
                  )}
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
                      <>{rentalQuote?.breakdown || `${rentalDays} day${rentalDays > 1 ? 's' : ''}`}</>
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

                {taxAmount > 0 ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{taxEstimate?.label || 'Estimated sales tax'}</span>
                    <span>${taxAmount.toLocaleString()}</span>
                  </div>
                ) : taxState === 'loading' ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Estimated sales tax</span>
                    <span className="text-muted-foreground">Calculating…</span>
                  </div>
                ) : taxState === 'error' ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Sales tax</span>
                    <span className="text-muted-foreground">Calculated at payment</span>
                  </div>
                ) : null}

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="font-semibold">Total charged today</span>
                  <span className="font-semibold">${totalChargedToday.toLocaleString()}</span>
                </div>

                {depositAmount ? (
                  <div className="flex items-start justify-between text-sm pt-2">
                    <span className="text-muted-foreground flex items-center gap-1">
                      Security deposit
                      <InfoTooltip
                        content="This host requires a security deposit. It is arranged directly with the host and is not part of today's Vendibook charge. Refund terms are set by the host."
                        side="top"
                      />
                    </span>
                    <span className="text-muted-foreground">${depositAmount.toLocaleString()}</span>
                  </div>
                ) : null}

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


      {/* Auth Gate Modal - shown when guest tries to submit */}
      <AuthGateOfferModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onAuthSuccess={() => {
          setShowAuthModal(false);
          // Auto-submit after successful auth — small delay to let auth state propagate
          toast({
            title: 'Signed in!',
            description: 'Submitting your booking now…',
          });
          setTimeout(() => {
            handleSubmit();
          }, 500);
        }}
      />
      {termsGate.terms ? (
        <FinalReviewSheet
          terms={termsGate.terms}
          termsId={termsGate.termsId}
          open={termsGate.open}
          onOpenChange={termsGate.setOpen}
          onConfirm={runSubmit}
          submitting={isSubmitting || termsGate.preparing}
          confirmLabel="Continue to secure payment"
        />
      ) : null}
      {paypalCheckout ? (
        <PayPalPaymentPanel
          target={{ kind: 'booking', id: paypalCheckout.bookingId }}
          returnUrl={paypalCheckout.returnUrl}
          onClose={() => setPaypalCheckout(null)}
          totalUsd={totalChargedToday}

          summary={
            <CheckoutOrderSummary
              variant="rental"
              coverImageUrl={listing?.cover_image_url || listing?.image_urls?.[0]}
              title={listing?.title || 'Rental booking'}
              subtitle={listing?.category ?? undefined}
              lines={[
                { label: 'Rental subtotal', amount: fees.subtotal - currentDeliveryFee },
                ...(currentDeliveryFee > 0
                  ? [{ label: 'Delivery', amount: currentDeliveryFee }]
                  : []),
                { label: 'Service fee', amount: fees.renterFee },
                ...(taxSummaryLine ? [taxSummaryLine] : []),
              ]}
              total={totalChargedToday}
            />
          }
        />
      ) : null}

    </div>
  );
};

export default BookingCheckout;
