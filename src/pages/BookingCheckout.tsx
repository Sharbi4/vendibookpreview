import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  FileCheck,
  CreditCard,
  CheckCircle2,
  Zap,
  Shield,
  Truck,
  Clock,
  Info,
  Loader2,
  Star,
  Building2,
  ShieldCheck,
  Lock,
  Pencil,
} from 'lucide-react';
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
import { calculateRentalFees, formatCurrency } from '@/lib/commissions';
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
import { type BookingUserInfo, SlotSelector, BusinessInfoStep, type BusinessInfoData, ContactInfoWizard, TowingHandoffPanel, DisclosureStep } from '@/components/booking';
import { BookingDocumentUpload, type StagedDocument } from '@/components/booking/BookingDocumentUpload';
import { useDocumentsOnFile } from '@/hooks/useDocumentsOnFile';
import HourlySelectionSummary from '@/components/booking/HourlySelectionSummary';
import { parseHourlySelections, getSelectedDaysCount, getTotalSelectedHours } from '@/lib/hourlySelections';
import DateSelectionModal from '@/components/listing-detail/DateSelectionModal';
import type { ListingCategory, FulfillmentType } from '@/types/listing';
import type { DocumentType } from '@/types/documents';
import { AuthGateOfferModal } from '@/components/offers/AuthGateOfferModal';

import { trackLeadEvent } from '@/lib/leadTracking';
import { detectAvailabilityConflict } from '@/lib/availabilityConflict';
import { ReferralCodeField } from '@/components/referrals/ReferralCodeField';
import { useSellerVerifiedBadge } from '@/hooks/useSellerVerifiedBadge';
import { authPath } from '@/lib/auth/returnTo';
import { useSellerPaymentReadiness } from '@/hooks/useSellerPaymentReadiness';
import { PayPalMonogram } from '@/components/brand/ProviderLogos';
import SEO from '@/components/SEO';

import TransactionCheckoutShell from '@/components/transaction/checkout/TransactionCheckoutShell';
import CheckoutSection from '@/components/transaction/checkout/CheckoutSection';
import ListingCheckoutSummary from '@/components/transaction/checkout/ListingCheckoutSummary';
import MoneyBreakdown, { type MoneyLine } from '@/components/transaction/checkout/MoneyBreakdown';
import PayPalEmbeddedPayment from '@/components/transaction/checkout/PayPalEmbeddedPayment';
import CheckoutLegalConsent from '@/components/legal/CheckoutLegalConsent';
import ProtectionDisclosure from '@/components/checkout/ProtectionDisclosure';

type FulfillmentSelection = 'pickup' | 'delivery' | 'on_site';

interface BookingCheckoutProps {
  /** Rendered inside the dashboard workspace: no site header/footer chrome. */
  embedded?: boolean;
}

const BookingCheckout = ({ embedded = false }: BookingCheckoutProps = {}) => {
  const { listingId } = useParams<{ listingId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { listing, isLoading, error } = useListing(listingId);
  /** Keeps date edits on whichever route this flow is mounted on. */
  const checkoutBasePath = embedded ? '/dashboard/bookings/new' : '/book';
  /** Page frame: full site chrome publicly, bare column inside the dashboard. */
  const Frame = ({ children }: { children: React.ReactNode }) =>
    embedded ? (
      <div className="sale-light v2-commerce v2-wizard-embed flex flex-col">{children}</div>
    ) : (
      <div className="sale-light v2-commerce min-h-screen flex flex-col bg-background">
        <Header />
        {children}
        <Footer />
      </div>
    );
  /**
   * Instant Book skips host approval ONLY for identity-verified hosts.
   * Everyone else: payment is taken and the booking waits for the host to
   * accept. Mirrors the server rule in `paypalFinalize`.
   */
  const { verified: hostIdentityVerified } = useSellerVerifiedBadge(listing?.host_id);
  /** Hides the functional PayPal action if the host hasn't finished payment
   *  setup. Never blocks bookings when gating isn't active for this host. */
  const paymentReadiness = useSellerPaymentReadiness(listing?.host_id);
  const paymentSetupBlocked = paymentReadiness.gatingActive && !paymentReadiness.ready;
  // The widget can downgrade an instant listing to a request (e.g. limited
  // spots left on a selected day) and signals that with ?flow=request.
  const requestedFlow = searchParams.get('flow');
  const instantConfirm =
    !!listing?.instant_book && hostIdentityVerified && requestedFlow !== 'request';
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
  const [fulfillmentSelected, setFulfillmentSelected] = useState<FulfillmentSelection>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [message, setMessage] = useState('');
  const [userInfo, setUserInfo] = useState<BookingUserInfo | null>(null);
  const [editingContact, setEditingContact] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** Checkout acceptance of Terms + Payments Terms + Privacy. Never pre-ticked. */
  const [legalAccepted, setLegalAccepted] = useState(false);
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
  const [businessInfoDone, setBusinessInfoDone] = useState(false);
  const [docsStepDone, setDocsStepDone] = useState(false);
  const [disclosureDone, setDisclosureDone] = useState(false);
  /** What the disclosure step recorded server-side, surfaced on review. */
  const [disclosureRecord, setDisclosureRecord] = useState<{
    attestedAt: string | null;
    documentVersion: string | null;
    identityStatus: string | null;
    insuranceAnswer: 'yes' | 'no' | 'unsure' | null;
  } | null>(null);

  // Slot selection state for vendor spaces
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [selectedSlotName, setSelectedSlotName] = useState<string | null>(null);

  const isMobileAsset = listing?.category === 'food_truck' || listing?.category === 'food_trailer';
  /** Host-provided towing/handoff columns (may be absent on older listings). */
  const towingFields = useMemo(() => {
    const l = (listing ?? {}) as Record<string, unknown>;
    const s = (k: string) => (typeof l[k] === 'string' ? (l[k] as string) : null);
    return {
      hitch_ball_size: s('hitch_ball_size'),
      coupler_type: s('coupler_type'),
      trailer_plug_type: s('trailer_plug_type'),
      renter_provides_tow_vehicle:
        typeof l.renter_provides_tow_vehicle === 'boolean' ? (l.renter_provides_tow_vehicle as boolean) : null,
      tow_vehicle_requirement: s('tow_vehicle_requirement'),
      return_instructions: s('return_instructions'),
    };
  }, [listing]);
  const isStaticLocation = listing?.category === 'ghost_kitchen' || listing?.category === 'vendor_lot' || listing?.category === 'vendor_space';
  // Categories that require business info (food-related)
  const requiresBusinessInfo = ['food_truck', 'food_trailer', 'ghost_kitchen'].includes(listing?.category || '');
  // Categories that support multiple slots/spaces
  const supportsMultipleSlots = ['vendor_lot', 'vendor_space', 'ghost_kitchen', 'food_truck', 'food_trailer'].includes(listing?.category || '');
  const hasMultipleSlots = supportsMultipleSlots && ((listing as any)?.total_slots ?? 1) > 1;
  const supportsFulfillmentChoice = isMobileAsset && listing?.fulfillment_type === 'both';

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
  // The refundable security deposit is charged today alongside the rental and
  // held by the platform; it is refunded (minus any damages/fees) after the
  // rental ends, so it is part of today's charge.
  const totalChargedToday = fees.customerTotal + taxAmount + (depositAmount ?? 0);

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

  /** Human rate line for the review breakdown (never invents a rate). */
  const reviewRateLabel = isHourlyBooking && (listing as any)?.price_hourly
    ? `${formatCurrency((listing as any).price_hourly)} × ${durationHours} hour${durationHours === 1 ? '' : 's'}`
    : rentalQuote?.breakdown
      ? rentalQuote.breakdown
      : rentalDays > 0 && listing?.price_daily
        ? `${formatCurrency(listing.price_daily)} × ${rentalDays} day${rentalDays > 1 ? 's' : ''}`
        : 'Rental subtotal';

  /** Explicit host-provided handoff facts only — no assumptions. */
  const reviewHandoffFacts = [
    towingFields.hitch_ball_size && { label: 'Hitch ball size', value: towingFields.hitch_ball_size },
    towingFields.coupler_type && { label: 'Coupler type', value: towingFields.coupler_type },
    towingFields.trailer_plug_type && { label: 'Trailer plug', value: towingFields.trailer_plug_type },
    towingFields.renter_provides_tow_vehicle !== null && {
      label: 'Tow vehicle',
      value: towingFields.renter_provides_tow_vehicle ? 'You provide it' : 'Host provides it',
    },
    towingFields.tow_vehicle_requirement && {
      label: 'Tow requirement',
      value: towingFields.tow_vehicle_requirement,
    },
    towingFields.return_instructions && { label: 'Return', value: towingFields.return_instructions },
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  // Completeness — used to gate the review/payment section. No step wizard:
  // every section is always visible and each tracks its own completion.
  const isStepContactComplete = Boolean(userInfo?.agreedToTerms);
  const isBusinessInfoComplete = !requiresBusinessInfo || Boolean(
    businessInfo?.licenseType &&
    (businessInfo.licenseType !== 'other' || businessInfo.licenseTypeOther) &&
    businessInfo.employeeCount &&
    businessInfo.intendedUse?.trim() &&
    businessInfo.cuisineType?.trim()
  );
  const isStepBusinessInfoComplete = isBusinessInfoComplete && (!requiresBusinessInfo || businessInfoDone);
  // Documents step is complete when all required docs are staged OR docs are on file
  const allDocsStaged = !hasRequiredDocs || docsOnFile || preBookingBlockers.every(req =>
    stagedDocuments.some(doc => doc.documentType === req.document_type)
  );
  const isStepDocsComplete = !hasRequiredDocs || (docsStepDone && allDocsStaged);
  const isFulfillmentComplete = Boolean(userInfo?.agreedToTerms) &&
    (fulfillmentSelected !== 'delivery' || Boolean(deliveryAddress.trim()));
  const isStepFulfillmentComplete = isFulfillmentComplete;
  // The server records the attestation; this only tracks that the step was passed.
  const isStepDisclosureComplete = disclosureDone;

  const canSubmit =
    isStepContactComplete &&
    isStepBusinessInfoComplete &&
    isStepDocsComplete &&
    isStepFulfillmentComplete &&
    isStepDisclosureComplete;

  const nextIncompleteReason = !isStepContactComplete
    ? 'Add your contact details above to continue.'
    : !isStepBusinessInfoComplete
      ? 'Finish your business details above to continue.'
      : !isStepDocsComplete
        ? 'Upload the required documents above to continue.'
        : !isStepFulfillmentComplete
          ? 'Complete pickup/delivery details above to continue.'
          : !isStepDisclosureComplete
            ? 'Review and accept the terms above to continue.'
            : null;

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
    navigate(`${checkoutBasePath}/${listingId}?${params.toString()}`, { replace: true });
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
      <Frame>
        <div className="flex-1 flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-foreground" />
        </div>
      </Frame>
    );
  }

  if (error || !listing) {
    return (
      <Frame>
        <div className="flex-1 container py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Listing not found</h1>
          <Button asChild>
            <Link to="/search">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Search
            </Link>
          </Button>
        </div>
      </Frame>
    );
  }

  // For vendor spaces with multiple slots, require slot selection before dates
  if (hasMultipleSlots && !selectedSlot) {
    return (
      <Frame>
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
              <Button onClick={() => setShowDateModal(true)} size="lg" className="bg-foreground text-background hover:bg-foreground/90 rounded-xl font-semibold">
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
            contentClassName="v2-checkout-dialog"
          />
        </main>
      </Frame>
    );
  }

  if (!startDate || !endDate) {
    return (
      <TransactionCheckoutShell
        eyebrow="Vendibook"
        title="Choose your rental dates"
        subtitle="Pick the dates you need and we'll show the rate, fees and anything this listing requires."
        exitHref={`/listing/${listingId}`}
      >
        <CheckoutSection
          title="Dates & rate"
          description="Availability comes straight from this listing's calendar."
        >
          <button type="button" className="v2-btn" onClick={() => setShowDateModal(true)}>
            <Calendar className="h-4 w-4 mr-2" />
            Select dates
          </button>
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
            contentClassName="v2-checkout-dialog"
          />
        </CheckoutSection>
      </TransactionCheckoutShell>
    );
  }

  const coverImage = listing.cover_image_url || listing.image_urls?.[0] || '/placeholder.svg';
  const listingHref = `/listing/${listingId}`;
  const listingLocation = [listing.city, listing.state].filter(Boolean).join(', ') || null;

  const cancellationPolicyText =
    ((listing as { cancellation_policy?: string | null }).cancellation_policy || '').trim() || null;

  const dateLabel = isHourlyBooking
    ? `${format(startDate, 'MMM d, yyyy')}${startTime && endTime ? ` · ${startTime}–${endTime}` : ''}`
    : `${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d, yyyy')}`;
  const durationLabel = isHourlyBooking
    ? `${durationHours} hour${durationHours === 1 ? '' : 's'}${
        selectedHourlyDays > 0 ? ` across ${selectedHourlyDays} day${selectedHourlyDays === 1 ? '' : 's'}` : ''
      }`
    : `${rentalDays} day${rentalDays > 1 ? 's' : ''}`;

  // Real money lines only — never invented, always derived from the same
  // engine that prices the request server-side.
  const moneyLines: MoneyLine[] = [
    { label: reviewRateLabel, value: formatCurrency(basePrice) },
    ...(currentDeliveryFee > 0 ? [{ label: 'Delivery fee', value: formatCurrency(currentDeliveryFee) }] : []),
    {
      label: 'Vendibook service fee',
      value: formatCurrency(fees.renterFee),
      note: 'Covers payment processing, support and platform costs.',
    },
    ...(taxSummaryLine
      ? [{
          label: taxSummaryLine.label,
          value: taxSummaryLine.valueLabel ?? formatCurrency(taxSummaryLine.amount),
          muted: taxSummaryLine.muted,
        }]
      : []),
    ...(depositAmount
      ? [{
          label: 'Security deposit (held)',
          value: formatCurrency(depositAmount),
          note: 'Charged today, held by Vendibook, and refunded (minus any damages or fees) after your rental.',
          muted: true,
        }]
      : []),
  ];

  const summaryMeta = [
    { label: isHourlyBooking ? 'Scheduled hours' : 'Dates', value: dateLabel },
    { label: 'Duration', value: durationLabel },
    ...(hasMultipleSlots && selectedSlotName ? [{ label: 'Space', value: selectedSlotName }] : []),
    { label: 'Fulfillment', value: fulfillmentSelected === 'delivery' ? 'Delivery' : fulfillmentSelected === 'on_site' ? 'On-site' : 'Pickup' },
  ];

  const railSummary = (
    <ListingCheckoutSummary
      imageUrl={coverImage}
      title={listing.title}
      typeLabel={listing.category ? listing.category.replace('_', ' ') : null}
      location={listingLocation}
      priceLabel={formatCurrency(totalChargedToday)}
      priceNote="Total due today"
      meta={summaryMeta}
    >
      <MoneyBreakdown
        lines={moneyLines}
        total={formatCurrency(totalChargedToday)}
        totalLabel="Total due today"
      />
    </ListingCheckoutSummary>
  );

  const mobileSummary = (
    <ListingCheckoutSummary
      imageUrl={coverImage}
      title={listing.title}
      location={listingLocation}
      priceLabel={formatCurrency(totalChargedToday)}
      priceNote="Total due today"
      meta={[{ label: isHourlyBooking ? 'Hours' : 'Dates', value: dateLabel }]}
    />
  );

  const primaryStickyAction = paypalCheckout ? null : (
    <Button
      className="h-12 px-6 rounded-xl font-semibold bg-foreground text-background hover:bg-foreground/90"
      onClick={handleSubmit}
      disabled={isSubmitting || paymentSetupBlocked || !legalAccepted}
      title={!canSubmit ? nextIncompleteReason ?? undefined : undefined}
    >
      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
      {instantConfirm ? 'Confirm & pay' : 'Continue to payment'}
    </Button>
  );

  return (
    <div
      className={
        embedded
          ? 'sale-light v2-commerce v2-wizard-embed flex flex-col'
          : 'sale-light v2-commerce min-h-screen flex flex-col bg-background'
      }
    >
      <SEO
        title={`Book ${listing.title} | Vendibook`}
        description={`Complete your booking for ${listing.title}.`}
      />
      <TransactionCheckoutShell
        eyebrow="Vendibook rental"
        title="Complete your booking"
        subtitle={listing.title}
        exitHref={listingHref}
        exitLabel="Back to listing"
        summary={railSummary}
        mobileSummary={mobileSummary}
        stickyAction={
          <div className="v2-checkout-sticky-inner">
            <div className="v2-checkout-sticky-total">
              <span>Total due today</span>
              <strong>{formatCurrency(totalChargedToday)}</strong>
            </div>
            {primaryStickyAction}
          </div>
        }
      >
        {!user && (
          <div className="v2-checkout-section" style={{ padding: '16px 20px' }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Sign in to complete your booking</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sign in now so we keep your details when you return — no need to retype anything.
                </p>
              </div>
              <Link
                to={authPath(bookingReturnPath)}
                className="v2-btn shrink-0"
              >
                Sign in / Create account
              </Link>
            </div>
          </div>
        )}

        {/* 1. Dates & rate */}
        <CheckoutSection
          title="Dates & rate"
          description="Your selected dates, the applicable rate and any refundable deposit."
          aside={
            <button type="button" className="v2-btn-quiet" onClick={() => setShowDateModal(true)}>
              Change dates
            </button>
          }
        >
          <div className="flex gap-4">
            <img src={coverImage} alt={listing.title} className="w-24 h-20 object-cover rounded-xl shrink-0" />
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground line-clamp-2 text-sm">{listing.title}</h3>
              {listingLocation && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3" /> {listingLocation}
                </p>
              )}
              {ratingData && (
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-medium">{ratingData.average}</span>
                  <span className="text-xs text-muted-foreground">({ratingData.count})</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            {isHourlyBooking ? (
              <>
                <p className="text-sm text-muted-foreground mb-2">{durationLabel}</p>
                <HourlySelectionSummary selections={hourlySelections} variant="compact" />
              </>
            ) : (
              <p className="text-sm text-foreground font-medium">{dateLabel} · {durationLabel}</p>
            )}
            {hasMultipleSlots && selectedSlotName && (
              <p className="text-sm text-muted-foreground mt-2">Space: {selectedSlotName}</p>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <MoneyBreakdown lines={moneyLines} total={formatCurrency(totalChargedToday)} totalNote="Due today" />
          </div>
        </CheckoutSection>

        {/* 2. Pickup or delivery */}
        <CheckoutSection
          title="Pickup or delivery"
          description="How you'll get the rental, and where."
        >
          <div className="space-y-5">
            {supportsFulfillmentChoice && (
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
                    {listing.delivery_fee ? (
                      <span className="text-sm font-medium text-primary">+${listing.delivery_fee}</span>
                    ) : null}
                  </div>
                </RadioGroup>
              </div>
            )}

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
                        : listing.pickup_location_text || 'Address will be provided after confirmation'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isMobileAsset && fulfillmentSelected === 'pickup' && listingId && (
              <TowingHandoffPanel
                listingId={listingId}
                category={listing.category}
                hitchBallSize={towingFields.hitch_ball_size}
                couplerType={towingFields.coupler_type}
                trailerPlugType={towingFields.trailer_plug_type}
                renterProvidesTowVehicle={towingFields.renter_provides_tow_vehicle}
                towVehicleRequirement={towingFields.tow_vehicle_requirement}
                pickupInstructions={listing.pickup_instructions}
                returnInstructions={towingFields.return_instructions}
              />
            )}

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
          </div>
        </CheckoutSection>

        {/* 3. Your business details */}
        <CheckoutSection
          title="Your business details"
          description="Who the host is renting to, and (for food categories) your business info."
          aside={isStepContactComplete && !editingContact ? (
            <button type="button" className="v2-btn-quiet" onClick={() => setEditingContact(true)}>
              <Pencil aria-hidden /> Edit
            </button>
          ) : undefined}
        >
          <div className="space-y-6">
            {isStepContactComplete && !editingContact ? (
              <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <div>
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">
                      {userInfo?.firstName} {userInfo?.lastName}
                    </span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 block">
                      Contact details saved
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <ContactInfoWizard
                listingId={listingId}
                initialData={userInfo || undefined}
                onPartialChange={(partial) => setUserInfo(partial)}
                onComplete={(info) => {
                  setUserInfo(info);
                  setEditingContact(false);
                }}
              />
            )}

            {requiresBusinessInfo && (
              <div className="pt-2 border-t border-border">
                <p className="text-sm text-muted-foreground mb-4 mt-4">
                  Help the host understand your business and how you'll use the space.
                </p>
                <BusinessInfoStep
                  businessInfo={businessInfo}
                  onBusinessInfoChange={setBusinessInfo}
                  onComplete={() => setBusinessInfoDone(true)}
                  disabled={isSubmitting}
                  category={listing.category}
                />
              </div>
            )}
          </div>
        </CheckoutSection>

        {/* 4. Documents & compliance */}
        {hasRequiredDocs && (
          <CheckoutSection
            title="Documents & compliance"
            description="Documents this host requires before your request can be reviewed."
            aside={
              <span className="text-xs">
                {docsOnFile
                  ? 'On file'
                  : `${preBookingBlockers.filter((req) => stagedDocuments.some((doc) => doc.documentType === req.document_type)).length} of ${preBookingBlockers.length} ready`}
              </span>
            }
          >
            <BookingDocumentUpload
              requiredDocs={requiredDocs || []}
              stagedDocuments={stagedDocuments}
              onDocumentsChange={setStagedDocuments}
              onComplete={() => setDocsStepDone(true)}
              disabled={isSubmitting}
              docsOnFile={docsOnFile}
              onFileExpiresAt={docsOnFileData?.expiresAt}
            />
          </CheckoutSection>
        )}

        {/* 5. Terms & cancellation */}
        <CheckoutSection
          title="Terms & cancellation"
          description="Review the policy, agree to the terms, and complete identity verification."
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Clock className="h-4 w-4 text-foreground" />
                <span className="text-sm font-medium text-foreground">Cancellation policy</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {cancellationPolicyText ?? (
                  <>
                    This host hasn't published a custom policy, so Vendibook's standard rental
                    policy applies: cancel before the host accepts for a full refund; after
                    acceptance, refunds follow the terms you accept at payment.{' '}
                    <Link to={`/listing/${listingId}#terms`} className="underline underline-offset-2">
                      See rental terms
                    </Link>
                  </>
                )}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1.5">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-foreground" />
                <span className="text-sm font-medium text-foreground">How this payment works</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {instantConfirm
                  ? 'PayPal processes your payment now. Your booking is confirmed as soon as the payment completes, and the full record is saved to your account.'
                  : 'PayPal processes your payment now and your dates are held. The host still has to accept the request — if they decline or do not respond, Vendibook refunds the payment to your original payment method.'}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Vendibook records the transaction and reviews host payouts after the rental begins. Payments are
                processed by PayPal; Vendibook does not hold or control your funds.
              </p>
            </div>

            <ProtectionDisclosure
              category={listing?.category ?? null}
              mode="rent"
              fulfillment={fulfillmentSelected}
            />

            <CheckoutLegalConsent
              surface="booking_checkout"
              relatedEntityType="listing"
              relatedEntityId={listing?.id ?? null}
              onChange={setLegalAccepted}
            />

            {listing?.id && (
              <DisclosureStep
                listingId={listing.id}
                onInsuranceAnswer={(answer) =>
                  setBusinessInfo((prev) =>
                    prev
                      ? { ...prev, liabilityInsuranceAnswer: answer, hasLiabilityInsurance: answer === 'yes' }
                      : prev,
                  )
                }
                onComplete={(state) => {
                  setDisclosureRecord({
                    attestedAt: state.attestedAt,
                    documentVersion: state.documentVersion,
                    identityStatus: state.identityStatus,
                    insuranceAnswer: state.insuranceAnswer,
                  });
                  setDisclosureDone(true);
                }}
              />
            )}
          </div>
        </CheckoutSection>

        {/* 6. Review & payment */}
        <CheckoutSection
          title="Review & payment"
          description={
            instantConfirm
              ? 'Your booking is confirmed as soon as payment completes.'
              : 'Your payment is processed now and your dates are held while the host reviews your request.'
          }
        >
          <div className="space-y-5">
            <div className="p-3 border border-border rounded-lg">
              <ReferralCodeField
                programType="rental"
                value={referralCode}
                onChange={(code, valid) => { setReferralCode(code); setReferralValid(valid); }}
                autoFillFromCookie
              />
            </div>

            <MoneyBreakdown
              lines={moneyLines}
              total={formatCurrency(totalChargedToday)}
              totalLabel="Total due today"
            />

            {paypalCheckout ? (
              <>
                <PayPalEmbeddedPayment
                  target={{ kind: 'booking', id: paypalCheckout.bookingId }}
                  sellerId={listing.host_id}
                  counterparty="host"
                  listingHref={listingHref}
                  returnUrl={paypalCheckout.returnUrl}
                  totalUsd={totalChargedToday}
                  heading={instantConfirm ? 'Confirm and pay with PayPal' : 'Secure your booking with PayPal'}
                  intent={
                    instantConfirm
                      ? 'Your booking is confirmed the moment PayPal verifies your payment.'
                      : 'Your dates are held the moment PayPal verifies your payment; the host still has to accept.'
                  }
                />
                <button
                  type="button"
                  className="v2-btn-quiet"
                  onClick={() => setPaypalCheckout(null)}
                >
                  Edit booking details
                </button>
              </>
            ) : paymentSetupBlocked ? (
              <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Payment setup unavailable</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This host hasn&apos;t finished setting up payments yet, so checkout can&apos;t be completed
                  right now. Please check back soon or message the host for an update.
                </p>
              </div>
            ) : (
              <>
                <Button
                  className="w-full h-14 text-base bg-foreground text-background hover:bg-foreground/90 rounded-xl font-semibold"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !legalAccepted}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : instantConfirm ? (
                    <>
                      <Zap className="h-5 w-5 mr-2" />
                      Confirm and pay {formatCurrency(totalChargedToday)}
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5 mr-2" />
                      Continue to payment · {formatCurrency(totalChargedToday)}
                    </>
                  )}
                </Button>
                {!canSubmit && nextIncompleteReason && (
                  <p className="text-xs text-muted-foreground text-center">{nextIncompleteReason}</p>
                )}
                <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Secure checkout with <PayPalMonogram className="h-3.5 w-auto inline-block" />
                </p>
              </>
            )}
          </div>
        </CheckoutSection>
      </TransactionCheckoutShell>


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
        contentClassName="v2-checkout-dialog"
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
    </div>
  );
};

export default BookingCheckout;
