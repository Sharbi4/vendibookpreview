import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2, ArrowLeft, ShieldCheck, Truck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useListing } from '@/hooks/useListing';
import { computeDeliveryFee, deliveryRateLabel, normalizeDeliveryFeeType } from '@/lib/fulfillment/delivery';
import { useToast } from '@/hooks/use-toast';
import { useFreightEstimate } from '@/hooks/useFreightEstimate';
import { supabase } from '@/integrations/supabase/client';
import { CheckoutOverlay, PayPalPaymentPanel } from '@/components/checkout';
import CheckoutOrderSummary from '@/components/checkout/CheckoutOrderSummary';
import { isEmbeddedCheckoutEnabled } from '@/lib/featureFlags';
import { parseEdgeError } from '@/lib/edgeErrors';
import { checkoutErrorCopy } from '@/lib/checkoutErrorCopy';
import { validators } from '@/components/ui/validated-input';
import { trackFormSubmitConversion } from '@/lib/gtagConversions';
import { trackPurchase, trackInitiateCheckout } from '@/lib/facebookCAPI';
import { calculateDistance } from '@/lib/geolocation';
import SEO from '@/components/SEO';

// Premium shared components

// Step components
import {
  PurchaseStepDelivery,
  PurchaseStepInfo,
  PurchaseStepPayment,
  DELIVERY_WINDOW_LABELS,
  type BuyerInfo,
  type DeliveryWindow,
} from '@/components/purchase-wizard';
import CheckoutIntro from '@/components/checkout/CheckoutIntro';

import { ReferralCodeField } from '@/components/referrals/ReferralCodeField';
import { FinalReviewSheet } from '@/components/transaction/FinalReviewSheet';
import { useTermsGate } from '@/hooks/useTermsGate';
import { buildTerms } from '@/lib/transactionTerms';
import { useCheckoutState } from '@/hooks/useCheckoutState';
import { useSellerVerifiedBadge, refreshSellerBadgeSurfaces } from '@/hooks/useSellerVerifiedBadge';
import VerifiedSellerDialog from '@/components/verification/VerifiedSellerDialog';
import { parseFormattedAddress } from '@/lib/fulfillment/parseAddress';
import { getPublicDisplayName } from '@/lib/displayName';
import { Checkbox } from '@/components/ui/checkbox';
import SaleCheckoutShell from '@/components/checkout/sale/SaleCheckoutShell';
import SaleCheckoutCard from '@/components/checkout/sale/SaleCheckoutCard';
import SaleListingSummary from '@/components/checkout/sale/SaleListingSummary';
import SaleOrderSummary, { type SaleSummaryLine } from '@/components/checkout/sale/SaleOrderSummary';
import SaleCheckoutFooter from '@/components/checkout/sale/SaleCheckoutFooter';

type FulfillmentSelection = 'pickup' | 'delivery' | 'vendibook_freight';

/**
 * Three-step for-sale checkout:
 *   1. Review & fulfillment  2. Confirm details  3. Payment
 * The step machine is the only thing that changed — every money, eligibility
 * and edge-function rule below is untouched.
 */
type CheckoutStep = 'intro' | 'fulfillment' | 'verify' | 'options' | 'payment';

// High-value sale threshold. Below this we skip the intro screen and drop
// buyers straight into the wizard (small tool/add-on purchases).
const SALE_INTRO_MIN_PRICE = 1000;

const STEP_LABELS: Record<Exclude<CheckoutStep, 'intro'>, string> = {
  fulfillment: 'Review & fulfillment',
  verify: 'Verify & details',
  options: 'Options',
  payment: 'Payment & review',
};

/** Older sessions persisted a 7-step machine; fold them onto the new four. */
const LEGACY_STEP_MAP: Record<string, CheckoutStep> = {
  intro: 'intro',
  confirm: 'fulfillment',
  delivery: 'fulfillment',
  fulfillment: 'fulfillment',
  identity: 'verify',
  details: 'verify',
  verify: 'verify',
  addons: 'options',
  options: 'options',
  payment: 'payment',
  review: 'payment',
};
const normalizeStep = (step: string | undefined): CheckoutStep =>
  LEGACY_STEP_MAP[step ?? 'intro'] ?? 'intro';

const STEP_ORDER: Exclude<CheckoutStep, 'intro'>[] = ['fulfillment', 'verify', 'options', 'payment'];


const SaleCheckout = () => {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const routerLocation = useLocation();

  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { listing, host, isLoading: isListingLoading, error: listingError } = useListing(listingId || '');
  const { estimate, isLoading: isEstimating, error: estimateError, getEstimate, clearEstimate } = useFreightEstimate();
  
  // Accepted offer state - price from negotiation
  const [acceptedOfferPrice, setAcceptedOfferPrice] = useState<number | null>(null);
  const [isLoadingOffer, setIsLoadingOffer] = useState(false);
  const [referralCode, setReferralCode] = useState<string>('');
  const [referralValid, setReferralValid] = useState<boolean>(false);

  // Check if user is the owner of this listing
  const isOwner = user?.id && listing?.host_id && user.id === listing.host_id;

  // Multi-step state — persisted per-listing so leaving and returning
  // restores the furthest step + typed data.
  const sessionKey = `sale:${listingId ?? 'unknown'}`;
  interface PersistedState {
    step: CheckoutStep;
    buyerInfo: BuyerInfo;
    fulfillmentSelected: FulfillmentSelection;
    deliveryAddress: string;
    deliveryInstructions: string;
    addOnSelections: Record<string, boolean>;
    preferredDate: string;
    preferredWindow: DeliveryWindow | '';
    onSiteContact: string;
    identityAcknowledged: boolean;
  }
  const persist = useCheckoutState<PersistedState>(sessionKey, {
    step: 'intro',
    buyerInfo: {
      firstName: '', lastName: '', businessName: '', email: '', phone: '',
      address1: '', address2: '', city: '', state: '', zipCode: '',
    },
    fulfillmentSelected: 'pickup',
    deliveryAddress: '',
    deliveryInstructions: '',
    addOnSelections: {},
    preferredDate: '',
    preferredWindow: '',
    onSiteContact: '',
    identityAcknowledged: false,
  });

  const currentStep = normalizeStep(persist.state.step);
  const setCurrentStep = (s: CheckoutStep) => {
    persist.setState((prev) => ({ ...prev, step: s }));
    persist.bumpFurthestStep(Math.max(0, STEP_ORDER.indexOf(s as Exclude<CheckoutStep, 'intro'>) + 1));
  };


  const buyerInfo = persist.state.buyerInfo;
  const setBuyerInfo = (next: BuyerInfo | ((p: BuyerInfo) => BuyerInfo)) => {
    persist.setState((prev) => ({
      ...prev,
      buyerInfo: typeof next === 'function' ? (next as (p: BuyerInfo) => BuyerInfo)(prev.buyerInfo) : next,
    }));
  };
  const updateBuyerInfo = <K extends keyof BuyerInfo>(field: K, value: BuyerInfo[K]) => {
    setBuyerInfo((prev) => ({ ...prev, [field]: value }));
  };

  // Legacy fields for backward compatibility - computed from buyerInfo
  const name = `${buyerInfo.firstName} ${buyerInfo.lastName}`.trim();
  const email = buyerInfo.email;
  const phone = buyerInfo.phone;
  const address = `${buyerInfo.address1}${buyerInfo.address2 ? ', ' + buyerInfo.address2 : ''}, ${buyerInfo.city}, ${buyerInfo.state} ${buyerInfo.zipCode}`.trim();

  // Fulfillment
  const fulfillmentSelected = persist.state.fulfillmentSelected;
  const setFulfillmentSelected = (v: FulfillmentSelection) =>
    persist.setState((prev) => ({ ...prev, fulfillmentSelected: v }));
  const deliveryAddress = persist.state.deliveryAddress;
  const setDeliveryAddress = (v: string) =>
    persist.setState((prev) => ({ ...prev, deliveryAddress: v }));
  const deliveryInstructions = persist.state.deliveryInstructions;
  const setDeliveryInstructions = (v: string) =>
    persist.setState((prev) => ({ ...prev, deliveryInstructions: v }));
  const preferredDate = persist.state.preferredDate;
  const setPreferredDate = (v: string) =>
    persist.setState((prev) => ({ ...prev, preferredDate: v }));
  const preferredWindow = persist.state.preferredWindow;
  const setPreferredWindow = (v: DeliveryWindow | '') =>
    persist.setState((prev) => ({ ...prev, preferredWindow: v }));
  const onSiteContact = persist.state.onSiteContact;
  const setOnSiteContact = (v: string) =>
    persist.setState((prev) => ({ ...prev, onSiteContact: v }));
  const identityAcknowledged = persist.state.identityAcknowledged;
  const setIdentityAcknowledged = (v: boolean) =>
    persist.setState((prev) => ({ ...prev, identityAcknowledged: v }));
  const addOnSelections = persist.state.addOnSelections;
  const toggleAddOn = (id: string, next: boolean) =>
    persist.setState((prev) => ({
      ...prev,
      addOnSelections: { ...prev.addOnSelections, [id]: next },
    }));
  const [isAddressComplete, setIsAddressComplete] = useState(false);
  const [deliveryCoords, setDeliveryCoords] = useState<[number, number] | null>(null);
  
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showCheckoutOverlay, setShowCheckoutOverlay] = useState(false);
  const [paypalCheckout, setPaypalCheckout] = useState<{ transactionId: string; returnUrl: string } | null>(null);
  

  // Validation
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Payment method
  type PaymentMethod = 'card' | 'cash';
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

  /**
   * Fulfillment selected from the listing page's delivery checker.
   * Applied once so the buyer lands on the wizard with their method,
   * destination ZIP and the estimate they just saw. Pricing itself is still
   * recomputed by the existing checkout logic — nothing is trusted from here.
   */
  const deliveryChoiceApplied = useRef(false);
  useEffect(() => {
    const choice = (routerLocation.state as any)?.deliveryChoice;
    if (!choice || deliveryChoiceApplied.current) return;
    deliveryChoiceApplied.current = true;
    persist.setState((prev) => ({
      ...prev,
      step: prev.step === 'intro' ? 'fulfillment' : prev.step,
      fulfillmentSelected:
        choice.method === 'vendibook_freight' ? 'vendibook_freight' : 'delivery',
      buyerInfo: {
        ...prev.buyerInfo,
        zipCode: prev.buyerInfo.zipCode || (choice.zip ?? ''),
      },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerLocation.state]);

  // Initialize user data from profile

  useEffect(() => {
    if (profile?.full_name && !buyerInfo.firstName) {
      const nameParts = profile.full_name.split(' ');
      updateBuyerInfo('firstName', nameParts[0] || '');
      updateBuyerInfo('lastName', nameParts.slice(1).join(' ') || '');
    }
    if (user?.email && !buyerInfo.email) updateBuyerInfo('email', user.email);
  }, [profile, user]);

  // Check for accepted offer to get negotiated price
  useEffect(() => {
    const fetchAcceptedOffer = async () => {
      if (!user || !listingId) return;
      
      // Check URL param first for offer price
      const offerPriceParam = searchParams.get('offer_price');
      if (offerPriceParam) {
        const price = parseFloat(offerPriceParam);
        if (!isNaN(price) && price > 0) {
          setAcceptedOfferPrice(price);
          return;
        }
      }
      
      // Otherwise fetch from database
      setIsLoadingOffer(true);
      try {
        const { data: offer, error } = await supabase
          .from('offers')
          .select('offer_amount, counter_amount, status')
          .eq('buyer_id', user.id)
          .eq('listing_id', listingId)
          .eq('status', 'accepted')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching accepted offer:', error);
        } else if (offer) {
          // Use counter_amount if it exists (counter was accepted), otherwise use offer_amount
          const agreedPrice = offer.counter_amount || offer.offer_amount;
          setAcceptedOfferPrice(agreedPrice);
        }
      } catch (err) {
        console.error('Error fetching offer:', err);
      } finally {
        setIsLoadingOffer(false);
      }
    };
    
    fetchAcceptedOffer();
  }, [user, listingId, searchParams]);

  // Initialize fulfillment from listing data
  useEffect(() => {
    if (listing) {
      if (listing.vendibook_freight_enabled) {
        setFulfillmentSelected('vendibook_freight');
      } else if (listing.fulfillment_type === 'delivery') {
        setFulfillmentSelected('delivery');
      } else {
        setFulfillmentSelected('pickup');
      }
      
      if (listing.accept_paypal_checkout) {
        setPaymentMethod('card');
      } else if (listing.accept_cash_payment) {
        setPaymentMethod('cash');
      }
    }
  }, [listing]);

  // Field validators for new structured buyer info
  const fieldValidators = {
    firstName: validators.compose(
      validators.required('First name is required'),
      validators.minLength(2, 'First name must be at least 2 characters')
    ),
    lastName: validators.compose(
      validators.required('Last name is required'),
      validators.minLength(2, 'Last name must be at least 2 characters')
    ),
    email: validators.compose(
      validators.required('Email is required'),
      validators.email('Please enter a valid email address')
    ),
    phone: validators.compose(
      validators.required('Phone number is required'),
      validators.phone('Please enter a valid phone number')
    ),
    address1: validators.required('Street address is required'),
    city: validators.required('City is required'),
    state: validators.required('State is required'),
    zipCode: validators.compose(
      validators.required('ZIP code is required'),
      validators.zipCode('Invalid ZIP code format')
    ),
  };

  // Derived values - Use accepted offer price if available, otherwise listing price
  const priceSale = acceptedOfferPrice || listing?.price_sale || 0;

  // Threshold guard: small purchases skip the intro screen entirely.
  useEffect(() => {
    if (
      currentStep === 'intro' &&
      !isListingLoading &&
      priceSale > 0 &&
      priceSale < SALE_INTRO_MIN_PRICE
    ) {
      setCurrentStep('fulfillment');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, isListingLoading, priceSale]);

  const deliveryRate = listing?.delivery_fee || 0;
  const deliveryFeeType = normalizeDeliveryFeeType((listing as any)?.delivery_fee_type);
  const fulfillmentType = listing?.fulfillment_type || 'pickup';
  const vendibookFreightEnabled = listing?.vendibook_freight_enabled || false;
  const freightPayer = (listing?.freight_payer as 'buyer' | 'seller') || 'buyer';
  const acceptPayPalCheckout = listing?.accept_paypal_checkout ?? true;
  const acceptCashPayment = listing?.accept_cash_payment ?? false;
  const isFreightSellerPaid = vendibookFreightEnabled && freightPayer === 'seller';
  const freightCost = estimate?.total_cost ?? 0;
  // hasValidEstimate is true when we have a successful estimate (regardless of isAddressComplete)
  const hasValidEstimate = estimate !== null && estimate.total_cost > 0 && !estimateError;
  const deliveryRadiusMiles = listing?.delivery_radius_miles || null;

  // Calculate distance from listing to delivery address
  const deliveryDistanceInfo = useMemo(() => {
    if (fulfillmentSelected !== 'delivery' || !deliveryCoords || !listing?.latitude || !listing?.longitude) {
      return { distance: null, isOutsideRadius: false };
    }
    
    const distance = calculateDistance(
      listing.latitude,
      listing.longitude,
      deliveryCoords[1],
      deliveryCoords[0]
    );
    
    const isOutsideRadius = deliveryRadiusMiles ? distance > deliveryRadiusMiles : false;
    
    return { distance: Math.round(distance * 10) / 10, isOutsideRadius };
  }, [fulfillmentSelected, deliveryCoords, listing?.latitude, listing?.longitude, deliveryRadiusMiles]);

  // Get available fulfillment options
  const getAvailableFulfillmentOptions = (): FulfillmentSelection[] => {
    const options: FulfillmentSelection[] = [];
    if (vendibookFreightEnabled) options.push('vendibook_freight');
    if (fulfillmentType === 'both') {
      options.push('pickup', 'delivery');
    } else if (fulfillmentType === 'delivery') {
      options.push('delivery');
    } else if (fulfillmentType === 'pickup') {
      options.push('pickup');
    }
    return options;
  };

  const fulfillmentOptions = getAvailableFulfillmentOptions();

  // Pickup-only listings need no fulfillment input — skip the step entirely.
  const skipDeliveryStep = fulfillmentOptions.length === 1 && fulfillmentOptions[0] === 'pickup';

  // ── Buyer identity ────────────────────────────────────────────────
  // Server-derived (never a client flag). Verified buyers skip the step.
  const { verified: buyerVerified, loading: buyerVerificationLoading } =
    useSellerVerifiedBadge(user?.id ?? null);
  const skipIdentityStep = Boolean(user?.id) && buyerVerified;
  // Identity runs inline (real Plaid check) instead of navigating away and
  // losing the in-progress order.
  const [identityDialogOpen, setIdentityDialogOpen] = useState(false);
  const [fulfillmentReady, setFulfillmentReady] = useState(false);
  const queryClient = useQueryClient();

  /**
   * Scheduling is captured as structured fields, then folded into the
   * instructions text the seller already receives. No money logic, no schema
   * change — the seller simply gets a target date instead of guessing.
   */
  const composedDeliveryInstructions = useMemo(() => {
    if (fulfillmentSelected === 'pickup') return '';
    const lines: string[] = [];
    if (preferredDate) {
      const windowText = preferredWindow ? ` — ${DELIVERY_WINDOW_LABELS[preferredWindow]}` : '';
      lines.push(`Preferred date: ${preferredDate}${windowText}`);
    }
    if (onSiteContact.trim()) lines.push(`On-site contact: ${onSiteContact.trim()}`);
    if (deliveryInstructions.trim()) lines.push(deliveryInstructions.trim());
    return lines.join('\n');
  }, [fulfillmentSelected, preferredDate, preferredWindow, onSiteContact, deliveryInstructions]);


  // Freight estimation
  const fetchFreightEstimate = useCallback(async (destinationAddress: string) => {
    const originText =
      listing?.address ??
      listing?.pickup_location_text ??
      (listing?.latitude && listing?.longitude ? `${listing.latitude},${listing.longitude}` : null);

    if (!originText || !destinationAddress.trim() || destinationAddress.trim().length < 10) {
      clearEstimate();
      return;
    }

    await getEstimate({
      origin_address: originText,
      destination_address: destinationAddress.trim(),
      weight_lbs: listing.weight_lbs || 5000,
      length_inches: listing.length_inches || 240,
      width_inches: listing.width_inches || 96,
      height_inches: listing.height_inches || 120,
      item_category: (listing.freight_category as 'standard' | 'fragile' | 'heavy_equipment' | 'oversized') || 'standard',
    });
  }, [listing, getEstimate, clearEstimate]);

  // Clear estimate when switching away from freight
  useEffect(() => {
    if (fulfillmentSelected !== 'vendibook_freight') {
      clearEstimate();
    }
  }, [fulfillmentSelected, clearEstimate]);

  // Calculate prices
  //
  // IMPORTANT — "due now" vs "due later":
  // Vendibook freight is NOT part of the sale PayPal order. The backend
  // (`quoteSaleTransaction`) charges item price + seller delivery only; freight
  // is collected in a separate PayPal order *after* the seller confirms the
  // sale (`kind: "freight"`). So freight must never be folded into the amount
  // the buyer is told they are paying now, or PayPal would show a lower total.
  const getDeliveryFeeForSelection = (): number => {
    if (fulfillmentSelected === 'delivery' && deliveryRate) {
      return computeDeliveryFee(deliveryRate, deliveryFeeType, deliveryDistanceInfo.distance);
    }
    return 0;
  };

  const currentDeliveryFee = getDeliveryFeeForSelection();
  /** Buyer-paid freight, invoiced separately once the seller confirms. */
  const freightDueLater =
    fulfillmentSelected === 'vendibook_freight' && !isFreightSellerPaid ? freightCost : 0;

  // Estimated sales tax — server-computed (TaxJar / state table) so the buyer
  // sees the real total before PayPal opens. The authoritative amount is
  // re-locked at order creation in `paypal-create-order`.
  const [taxEstimate, setTaxEstimate] = useState<{ tax_cents: number; rate_pct: number; label: string } | null>(null);
  // Quote lifecycle, so the summary can show an explicit tax row
  // ("calculating…" / "calculated at payment") instead of silently omitting
  // tax while the estimate is pending or unavailable.
  const [taxState, setTaxState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  useEffect(() => {
    if (!listing?.id || !priceSale) { setTaxEstimate(null); setTaxState('idle'); return; }
    const isDelivery = fulfillmentSelected === 'delivery' || fulfillmentSelected === 'vendibook_freight';
    if (isDelivery && !deliveryAddress.trim()) { setTaxEstimate(null); setTaxState('idle'); return; }
    const controller = new AbortController();
    setTaxState('loading');
    const t = setTimeout(() => {
      supabase.functions
        .invoke('tax-quote', {
          body: {
            kind: 'sale',
            listing_id: listing.id,
            fulfillment_type: fulfillmentSelected,
            delivery_fee_cents: Math.round(currentDeliveryFee * 100),
            delivery_address: isDelivery ? deliveryAddress : undefined,
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
  }, [listing?.id, priceSale, fulfillmentSelected, currentDeliveryFee, deliveryAddress]);

  const taxAmount = (taxEstimate?.tax_cents ?? 0) / 100;
  const totalPrice = priceSale + currentDeliveryFee + taxAmount;

  // Always-visible tax row: real amount when quoted, an explicit placeholder
  // while calculating or when the estimate is unavailable (the server still
  // adds tax authoritatively at payment time).
  const taxSummaryLine: SaleSummaryLine | null = taxAmount > 0
    ? { label: taxEstimate?.label || 'Estimated sales tax', amount: taxAmount }
    : taxState === 'loading'
      ? { label: 'Estimated sales tax', amount: 0, muted: true, valueLabel: 'Calculating…' }
      : taxState === 'error'
        ? { label: 'Sales tax', amount: 0, muted: true, valueLabel: 'Calculated at payment' }
        : null;


  // Validation
  const validateStep = (step: CheckoutStep): boolean => {
    if (step === 'fulfillment') {
      if (fulfillmentSelected === 'vendibook_freight' && !hasValidEstimate) {
        toast({ title: 'Enter delivery address', description: 'Please enter a complete address to get a freight quote.', variant: 'destructive' });
        return false;
      }
      if ((fulfillmentSelected === 'delivery' || fulfillmentSelected === 'vendibook_freight') && !deliveryAddress.trim()) {
        toast({ title: 'Missing address', description: 'Please enter a delivery address.', variant: 'destructive' });
        return false;
      }
      // Never let a buyer pay for a delivery the seller doesn't cover.
      if (fulfillmentSelected === 'delivery' && deliveryDistanceInfo.isOutsideRadius) {
        toast({
          title: 'Outside the delivery zone',
          description: `This seller delivers within ${deliveryRadiusMiles} mi. Choose pickup or freight, or message the seller.`,
          variant: 'destructive',
        });
        return false;
      }
      if (fulfillmentSelected === 'delivery' && !preferredDate) {
        toast({ title: 'Pick a preferred date', description: 'Give the seller a target delivery date so they can confirm a window.', variant: 'destructive' });
        return false;
      }
      return true;
    }
    
    if (step === 'verify') {
      const needsAddress = fulfillmentSelected !== 'pickup';

      const firstNameError = fieldValidators.firstName(buyerInfo.firstName);
      const lastNameError = fieldValidators.lastName(buyerInfo.lastName);
      const emailError = fieldValidators.email(buyerInfo.email);
      const phoneError = fieldValidators.phone(buyerInfo.phone);
      const address1Error = needsAddress ? fieldValidators.address1(buyerInfo.address1) : undefined;
      const cityError = needsAddress ? fieldValidators.city(buyerInfo.city) : undefined;
      const stateError = needsAddress ? fieldValidators.state(buyerInfo.state) : undefined;
      const zipCodeError = needsAddress ? fieldValidators.zipCode(buyerInfo.zipCode) : undefined;

      setFieldErrors({
        firstName: firstNameError,
        lastName: lastNameError,
        email: emailError,
        phone: phoneError,
        address1: address1Error,
        city: cityError,
        state: stateError,
        zipCode: zipCodeError,
      });
      const touched = ['firstName', 'lastName', 'email', 'phone'];
      if (needsAddress) touched.push('address1', 'city', 'state', 'zipCode');
      setTouchedFields(new Set(touched));

      const firstError = firstNameError || lastNameError || emailError || phoneError || address1Error || cityError || stateError || zipCodeError;
      if (firstError) {
        toast({ title: 'Missing information', description: firstError, variant: 'destructive' });
        return false;
      }
      return true;
    }

    return true;
  };

  // ── FinalReviewSheet interception ───────────────────────────────
  // handlePurchase now validates + opens the sheet; runPurchase runs
  // the actual sale/checkout after consent + acknowledge-terms land.
  const termsGate = useTermsGate();

  const buildCurrentTerms = () => {
    if (!listing || !listingId) return null;
    return buildTerms({
      listing: {
        id: listingId,
        title: listing.title,
        host_id: listing.host_id,
        cover_image_url: listing.cover_image_url ?? null,
        mode: 'sale',
        category: listing.category ?? null,
        cancellation_policy: (listing as { cancellation_policy?: string | null }).cancellation_policy ?? null,
        rules: (listing as { rules?: string | null }).rules ?? null,
        city: listing.city ?? null,
        state: listing.state ?? null,
        price_sale: priceSale,
        accept_paypal_checkout: acceptPayPalCheckout,
      },
      selection: {
        mode: 'sale',
        paymentMethod: paymentMethod === 'cash' ? 'pay_in_person' : 'paypal_checkout',
        basePriceDollars: priceSale,
        // Only the amount actually charged today — freight is a separate,
        // later PayPal order and must not inflate "total due today".
        deliveryFeeDollars: currentDeliveryFee,
        isSellerPaidFreight: isFreightSellerPaid,

        isCashSale: paymentMethod === 'cash',
        fulfillmentType: fulfillmentSelected,
      },
      buyer: {
        id: user?.id ?? null,
        email: buyerInfo.email.trim() || user?.email || null,
        name: `${buyerInfo.firstName} ${buyerInfo.lastName}`.trim() || null,
      },
    });
  };

  /**
   * Hard double-submit lock. React state alone is not enough: two clicks in
   * the same tick both read the stale `isPurchasing === false`. A ref flips
   * synchronously, so only the first click ever reaches the edge function.
   */
  const submitLockRef = useRef(false);

  const handlePurchase = async () => {
    if (submitLockRef.current || isPurchasing || termsGate.preparing) return;
    if (!user) {
      navigate(`/auth?redirect=/checkout/${listingId}`);
      return;
    }
    if (isOwner) {
      toast({
        title: 'Cannot purchase your own listing',
        description: 'You cannot buy your own listing.',
        variant: 'destructive',
      });
      return;
    }
    if (!priceSale || !listingId || !listing?.host_id) return;
    if (!agreedToTerms) {
      toast({ title: 'Terms required', description: 'Please agree to the Terms of Service.', variant: 'destructive' });
      return;
    }
    const t = buildCurrentTerms();
    if (!t) return;
    submitLockRef.current = true;
    try {
      await termsGate.prepare(t);
    } finally {
      // Preparing only opens the review sheet — release so the buyer can
      // still cancel and re-open it. runPurchase re-locks on real submit.
      submitLockRef.current = false;
    }
  };

  const runPurchase = async () => {
    if (submitLockRef.current || isPurchasing) return;
    if (!listingId || !listing?.host_id) return;
    submitLockRef.current = true;
    const termsId = termsGate.termsId;

    if (paymentMethod === 'cash') {
      setIsPurchasing(true);
      try {
        const isVendibookFreight = fulfillmentSelected === 'vendibook_freight';

        const { data: txData, error: txError } = await supabase.functions.invoke(
          'create-cash-sale',
          {
            body: {
              listing_id: listingId,
              amount: priceSale,
              fulfillment_type: isVendibookFreight ? 'vendibook_freight' : fulfillmentSelected,
              delivery_fee: fulfillmentSelected === 'delivery' ? currentDeliveryFee : 0,
              freight_cost: isVendibookFreight ? freightCost : 0,
              delivery_address:
                fulfillmentSelected === 'delivery' || isVendibookFreight
                  ? deliveryAddress.trim()
                  : null,
              delivery_instructions:
                fulfillmentSelected === 'delivery' || isVendibookFreight
                  ? (composedDeliveryInstructions.trim() || null)
                  : null,
              buyer_name: `${buyerInfo.firstName} ${buyerInfo.lastName}`.trim(),
              buyer_email: buyerInfo.email.trim(),
              buyer_phone: buyerInfo.phone.trim() || null,
              terms_id: termsId,
              // Retry/double-click safety: reuse the terms_id (already
              // acknowledged & scoped to this buyer + listing) as the
              // idempotency key. Same click → same sale + same snapshot.
              idempotency_key: termsId ? `cash-sale:${termsId}` : undefined,
            },
          },
        );

        if (txError) throw txError;
        const transactionId = (txData as { transaction_id?: string } | null)?.transaction_id;
        if (!transactionId) throw new Error('Cash sale did not return a transaction id');

        trackFormSubmitConversion({ form_type: 'purchase_cash', listing_id: listingId });
        trackPurchase({
          value: priceSale,
          contentIds: [listingId],
          contentName: listing.title,
          contentType: 'product',
          userData: {
            email: buyerInfo.email.trim(),
            phone: buyerInfo.phone.trim() || undefined,
            firstName: buyerInfo.firstName,
            lastName: buyerInfo.lastName || undefined,
          },
        });

        termsGate.reset();
        toast({ title: 'Purchase request submitted!', description: 'The seller will contact you.' });
        navigate(`/order-tracking/${transactionId}`);
      } catch (error) {
        console.error('Error:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to submit purchase request',
          variant: 'destructive',
        });
      } finally {
        setIsPurchasing(false);
        submitLockRef.current = false;
      }
      return;
    }

    // Handle card / PayPal payment
    setIsPurchasing(true);
    setShowCheckoutOverlay(true);

    try {
      const isVendibookFreight = fulfillmentSelected === 'vendibook_freight';

      // Create (or reuse) the pending sale transaction the PayPal order attaches to.
      const { data, error } = await supabase.functions.invoke('create-sale-intent', {
        body: {
          listing_id: listingId,
          delivery_fee: fulfillmentSelected === 'delivery' ? currentDeliveryFee : 0,
          fulfillment_type: isVendibookFreight ? 'vendibook_freight' : fulfillmentSelected,
          delivery_address: (fulfillmentSelected === 'delivery' || isVendibookFreight) ? deliveryAddress.trim() : null,
          delivery_instructions: (fulfillmentSelected === 'delivery' || isVendibookFreight) ? (composedDeliveryInstructions.trim() || null) : null,
          buyer_name: `${buyerInfo.firstName} ${buyerInfo.lastName}`.trim(),
          buyer_email: buyerInfo.email.trim(),
          buyer_phone: buyerInfo.phone.trim() || null,
          freight_cost: isVendibookFreight ? freightCost : 0,
          referral_code: referralValid ? referralCode : undefined,
          terms_id: termsId,
        },
      });

      if (error || data?.error || !data?.transaction_id) {
        const parsed = await parseEdgeError(error, data?.error ? { error: data.error, code: data.code } : null);
        const copy = checkoutErrorCopy(parsed);
        setShowCheckoutOverlay(false);
        setPaypalCheckout(null);
        toast({
          title: copy.title,
          description: copy.description,
          variant: 'destructive',
        });
        setIsPurchasing(false);
        submitLockRef.current = false;
        return;
      }

      // The server is the price authority: it re-resolves the agreed amount
      // from an accepted offer (or the listing) and ignores anything the URL
      // claimed. If that differs from what we displayed, correct the UI before
      // PayPal opens so the buyer never sees a total change mid-approval.
      const serverAmount = Number(data.amount);
      if (Number.isFinite(serverAmount) && serverAmount > 0 && Math.abs(serverAmount - priceSale) >= 0.01) {
        setAcceptedOfferPrice(serverAmount);
      }

      trackFormSubmitConversion({ form_type: 'purchase', listing_id: listingId });
      trackInitiateCheckout({
        value: totalPrice,
        contentIds: [listingId],
        contentName: listing.title,
        numItems: 1,
        userData: {
          email: buyerInfo.email.trim(),
          phone: buyerInfo.phone.trim() || undefined,
          firstName: buyerInfo.firstName,
          lastName: buyerInfo.lastName || undefined,
        },
      });

      termsGate.reset();
      setShowCheckoutOverlay(false);
      setPaypalCheckout({
        transactionId: data.transaction_id as string,
        returnUrl: `${window.location.origin}/order-tracking/${data.transaction_id}`,
      });
    } catch (error) {
      setShowCheckoutOverlay(false);
      setPaypalCheckout(null);
      const parsed = await parseEdgeError(error);
      const copy = checkoutErrorCopy(parsed);
      toast({
        title: copy.title,
        description: copy.description,
        variant: 'destructive',
      });
    } finally {
      setIsPurchasing(false);
      submitLockRef.current = false;
    }
  };





  // Loading state
  if (isListingLoading || isLoadingOffer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (listingError || !listing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Listing not found</h2>
          <button onClick={() => navigate('/browse')} className="text-primary hover:underline">
            Browse Listings
          </button>
        </div>
      </div>
    );
  }

  // Block owners from purchasing their own listings
  if (isOwner) {
    return (
      <SaleCheckoutShell
        steps={STEP_ORDER.filter((s) => s !== 'options').map((s) => ({ id: s, label: STEP_LABELS[s] }))}
        currentIndex={0}
        exitHref={`/listing/${listingId}`}
      >
        <div className="mx-auto max-w-md py-12 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <ArrowLeft className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">You own this listing</h2>
          <p className="text-muted-foreground mb-4">You cannot purchase your own listing.</p>
          <button onClick={() => navigate(`/listing/${listingId}`)} className="text-primary hover:underline">
            Back to listing
          </button>
        </div>
      </SaleCheckoutShell>
    );
  }


  const hasMultiplePaymentOptions = acceptPayPalCheckout && acceptCashPayment;

  // Checkout is exactly three real steps. (An "Options" step used to offer
  // pre-purchase inspection / notarized title transfer — neither is an active
  // Vendibook service, so nothing optional is sold to buyers here any more.)
  const visibleSteps: Exclude<CheckoutStep, 'intro'>[] = ['fulfillment', 'verify', 'payment'];

  const effectiveStep: Exclude<CheckoutStep, 'intro'> =
    currentStep === 'intro' || currentStep === 'options'
      ? currentStep === 'options' ? 'payment' : 'fulfillment'
      : currentStep;


  const stepIndex = Math.max(0, visibleSteps.indexOf(effectiveStep));

  const goNext = () => setCurrentStep(visibleSteps[Math.min(stepIndex + 1, visibleSteps.length - 1)]);
  const goBack = () => setCurrentStep(visibleSteps[Math.max(stepIndex - 1, 0)]);


  /** Prefill the details step from the delivery address the buyer already typed. */
  const prefillFromDeliveryAddress = () => {
    if (fulfillmentSelected === 'pickup' || buyerInfo.address1.trim()) return;
    const parsed = parseFormattedAddress(deliveryAddress);
    if (!parsed) return;
    setBuyerInfo((prev) => ({ ...prev, ...parsed }));
  };

  // Privacy-safe: business name, else "First L." — never a full legal name.
  const sellerName = host ? getPublicDisplayName(host, 'Seller') : undefined;
  const locationLabel = [listing.city, listing.state].filter(Boolean).join(', ') || undefined;
  const coverImage = listing.cover_image_url || listing.image_urls?.[0] || null;

  const summaryLines: SaleSummaryLine[] = [
    { label: listing.title, amount: priceSale },
    ...(currentDeliveryFee > 0
      ? [{
          label: fulfillmentSelected === 'vendibook_freight' ? 'Vendibook freight' : 'Seller delivery',
          amount: currentDeliveryFee,
        }]
      : []),
    ...(taxAmount > 0 ? [{ label: taxEstimate?.label || 'Estimated sales tax', amount: taxAmount }] : []),
  ];

  const fulfillmentDetail =
    fulfillmentSelected === 'pickup'
      ? locationLabel ? `Pick up near ${locationLabel}` : 'Arranged with the seller'
      : deliveryAddress || 'Address confirmed at the next step';

  const orderSummary = (
    <SaleOrderSummary
      imageUrl={coverImage}
      title={listing.title}
      lines={summaryLines}
      total={totalPrice}
      fulfillment={fulfillmentSelected}
      fulfillmentDetail={fulfillmentDetail}
    />
  );

  const advance = () => {
    if (effectiveStep === 'fulfillment') {
      if (!validateStep('fulfillment')) return;
      prefillFromDeliveryAddress();
      goNext();
      return;
    }
    if (effectiveStep === 'verify') {
      if (!validateStep('verify')) return;
      goNext();
      return;
    }
    if (!agreedToTerms) {
      toast({
        title: 'One more thing',
        description: 'Please acknowledge that all sales are final to continue.',
        variant: 'destructive',
      });
      return;
    }
    handlePurchase();
  };

  const primaryLabel =
    effectiveStep === 'fulfillment'
      ? 'Continue'
      : effectiveStep === 'verify'
        ? 'Continue to payment'
        : paymentMethod === 'cash'
          ? 'Confirm — arrange in person'
          : `Review and pay $${totalPrice.toLocaleString()}`;


  const primaryDisabled =
    (effectiveStep === 'fulfillment' && !fulfillmentReady) ||
    (effectiveStep === 'payment' && !user);


  // "Step 0" — enterprise-grade intro. Shown once per checkout session for
  // high-value sales; small purchases fall through to the wizard.
  if (currentStep === 'intro') {
    return (
      <>
        <SEO title={`Checkout - ${listing.title}`} description={`Complete your purchase of ${listing.title}`} />
        <div className="min-h-screen bg-background py-8 sm:py-12 px-4">
          <CheckoutIntro
            listingId={listing.id}
            listingTitle={listing.title}
            coverImageUrl={coverImage}
            city={listing.city}
            state={listing.state}
            price={priceSale}
            sellerName={sellerName}
            sellerVerified={Boolean((host as { identity_verified?: boolean } | null | undefined)?.identity_verified)}
            flow="sale"
            financingEligible={priceSale >= 150 && acceptPayPalCheckout}
            onBack={() => navigate(`/listing/${listingId}`)}
            onContinue={() => setCurrentStep('fulfillment')}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <SEO title={`Checkout - ${listing.title}`} description={`Complete your purchase of ${listing.title}`} />

      <SaleCheckoutShell
        steps={visibleSteps.map((id) => ({ id, label: STEP_LABELS[id] }))}
        currentIndex={stepIndex}
        exitHref={`/listing/${listingId}`}
        aside={orderSummary}
      >
        {/* Guest sign-in prompt — surfaced BEFORE the wizard so buyers don't lose typed info at the Pay step */}
        {!user && (
          <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-foreground">Sign in to complete checkout</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                An account is required to pay securely. Sign in now so we can keep your details when you return.
              </p>
            </div>
            <button
              onClick={() => navigate(`/auth?redirect=/checkout/${listingId}`)}
              className="shrink-0 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Sign in / Create account
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={effectiveStep}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >
            {effectiveStep === 'fulfillment' && (
              <>
                <SaleCheckoutCard>
                  <SaleListingSummary
                    listingId={listing.id}
                    title={listing.title}
                    imageUrl={coverImage}
                    price={priceSale}
                    locationLabel={locationLabel}
                    conditionLabel={(listing as { condition?: string | null }).condition ?? null}
                    sellerName={sellerName}
                    sellerVerified={Boolean((host as { identity_verified?: boolean } | null | undefined)?.identity_verified)}
                  />
                </SaleCheckoutCard>

                <SaleCheckoutCard>
                  <PurchaseStepDelivery
                    embedded
                    onCanContinueChange={setFulfillmentReady}
                    fulfillmentOptions={fulfillmentOptions}
                    fulfillmentSelected={fulfillmentSelected}
                    setFulfillmentSelected={setFulfillmentSelected}
                    deliveryAddress={deliveryAddress}
                    setDeliveryAddress={setDeliveryAddress}
                    setDeliveryCoords={setDeliveryCoords}
                    deliveryFee={currentDeliveryFee}
                    deliveryRateText={deliveryRateLabel(deliveryRate, deliveryFeeType)}
                    deliveryFeeType={deliveryFeeType}
                    deliveryRadiusMiles={deliveryRadiusMiles}
                    deliveryDistanceInfo={deliveryDistanceInfo}
                    isFreightSellerPaid={isFreightSellerPaid}
                    freightCost={freightCost}
                    hasValidEstimate={hasValidEstimate}
                    isEstimating={isEstimating}
                    estimateError={estimateError}
                    estimate={estimate}
                    isAddressComplete={isAddressComplete}
                    setIsAddressComplete={setIsAddressComplete}
                    fetchFreightEstimate={fetchFreightEstimate}
                    clearEstimate={clearEstimate}
                    listingCity={listing.city}
                    listingState={listing.state}
                    preferredDate={preferredDate}
                    setPreferredDate={setPreferredDate}
                    preferredWindow={preferredWindow}
                    setPreferredWindow={setPreferredWindow}
                    onSiteContact={onSiteContact}
                    setOnSiteContact={setOnSiteContact}
                    onBack={goBack}
                    onContinue={advance}
                  />
                </SaleCheckoutCard>
              </>
            )}

            {effectiveStep === 'verify' && (
              <>
                {!buyerVerificationLoading && !buyerVerified && (
                  <SaleCheckoutCard title="Verify your identity" padding="md">
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Verification is handled by Plaid — sellers only ever see a pass/fail result,
                        never your documents. Verified buyers get pickup addresses and scheduling
                        confirmed faster.
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setIdentityDialogOpen(true)}
                          className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                        >
                          Verify my identity
                        </button>
                        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                          <Checkbox
                            checked={identityAcknowledged}
                            onCheckedChange={(v) => setIdentityAcknowledged(Boolean(v))}
                          />
                          Continue without verifying for now
                        </label>
                      </div>
                    </div>
                  </SaleCheckoutCard>
                )}

                {buyerVerified && (
                  <SaleCheckoutCard padding="md">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-foreground">Identity verified</div>
                        <p className="text-xs text-muted-foreground">
                          Your Plaid identity check is active — nothing else to do here.
                        </p>
                      </div>
                    </div>
                  </SaleCheckoutCard>
                )}

                <SaleCheckoutCard>
                  <PurchaseStepInfo
                    embedded
                    buyerInfo={buyerInfo}
                    updateBuyerInfo={updateBuyerInfo}
                    deliveryInstructions={deliveryInstructions}
                    setDeliveryInstructions={setDeliveryInstructions}
                    fulfillmentSelected={fulfillmentSelected}
                    fieldErrors={fieldErrors}
                    touchedFields={touchedFields}
                    setTouchedFields={setTouchedFields}
                    hideAddress={fulfillmentSelected === 'pickup'}
                    onBack={goBack}
                    onContinue={advance}
                  />
                </SaleCheckoutCard>

                <div className="lg:hidden">{orderSummary}</div>
              </>
            )}




            {effectiveStep === 'payment' && (
              <>
                <SaleCheckoutCard>
                  <PurchaseStepPayment
                    embedded
                    paymentMethod={paymentMethod}
                    setPaymentMethod={setPaymentMethod}
                    acceptPayPalCheckout={acceptPayPalCheckout}
                    acceptCashPayment={acceptCashPayment}
                    titleStatus={(listing as { title_status?: string | null }).title_status ?? null}
                    hasLien={(listing as { has_lien?: string | null }).has_lien ?? null}
                    vin={(listing as { vin?: string | null }).vin ?? null}
                    totalPrice={totalPrice}
                    submitting={isPurchasing || termsGate.preparing}
                    onBack={goBack}
                    onContinue={advance}
                  />
                </SaleCheckoutCard>

                {freightDueLater > 0 && paymentMethod !== 'cash' ? (
                  <SaleCheckoutCard padding="sm">
                    <div className="flex items-start gap-3">
                      <Truck className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Your quoted freight of{' '}
                        <span className="font-medium text-foreground">
                          ${freightDueLater.toLocaleString()}
                        </span>{' '}
                        is billed separately once the seller confirms this sale — it is not
                        included in today's payment.
                      </p>
                    </div>
                  </SaleCheckoutCard>
                ) : null}


                <SaleCheckoutCard title="Before you pay" padding="md">
                  <div className="space-y-4">
                    <ReferralCodeField
                      programType="purchase"
                      value={referralCode}
                      onChange={(code, valid) => { setReferralCode(code); setReferralValid(valid); }}
                      autoFillFromCookie
                    />
                    <label className="flex items-start gap-3 rounded-xl bg-muted/60 p-3 cursor-pointer">
                      <Checkbox
                        checked={agreedToTerms}
                        onCheckedChange={(v) => setAgreedToTerms(Boolean(v))}
                        className="mt-0.5"
                      />
                      <span className="text-sm text-foreground/90 leading-relaxed">
                        I understand this purchase is <strong>final</strong> and I've reviewed the
                        item, fulfillment details and total shown here.
                      </span>
                    </label>
                  </div>
                </SaleCheckoutCard>

                <div className="lg:hidden">{orderSummary}</div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <SaleCheckoutFooter
          onBack={stepIndex > 0 ? goBack : () => navigate(`/listing/${listingId}`)}
          backLabel={stepIndex > 0 ? 'Back' : 'Back to listing'}
          primaryLabel={primaryLabel}
          onPrimary={advance}
          primaryDisabled={primaryDisabled}
          busy={isPurchasing || termsGate.preparing}
          helper={
            effectiveStep === 'payment'
              ? "You'll confirm the final total before any money moves."
              : 'Your progress is saved — you can step back any time.'
          }
        />

        <VerifiedSellerDialog
          open={identityDialogOpen}
          onOpenChange={setIdentityDialogOpen}
          onVerified={() => refreshSellerBadgeSurfaces(queryClient)}
        />
      </SaleCheckoutShell>

      <CheckoutOverlay isVisible={showCheckoutOverlay} />
      {paypalCheckout ? (
        <PayPalPaymentPanel
          target={{ kind: 'sale', id: paypalCheckout.transactionId }}
          returnUrl={paypalCheckout.returnUrl}
          onClose={() => setPaypalCheckout(null)}
          totalUsd={totalPrice}

          summary={
            <CheckoutOrderSummary
              variant="sale"
              coverImageUrl={listing.cover_image_url || listing.image_urls?.[0]}
              title={listing.title}
              subtitle={listing.category ?? undefined}
              lines={[
                { label: listing.title, amount: priceSale },
                ...(currentDeliveryFee > 0
                  ? [{
                      label: fulfillmentSelected === 'vendibook_freight' ? 'Freight' : 'Delivery',
                      amount: currentDeliveryFee,
                    }]
                  : []),
                ...(taxAmount > 0 ? [{ label: taxEstimate?.label || 'Estimated sales tax', amount: taxAmount }] : []),
              ]}
              total={totalPrice}
            />
          }
        />
      ) : null}
      {termsGate.terms ? (
        <FinalReviewSheet
          terms={termsGate.terms}
          termsId={termsGate.termsId}
          open={termsGate.open}
          onOpenChange={termsGate.setOpen}
          onConfirm={runPurchase}
          submitting={isPurchasing || termsGate.preparing}
          confirmLabel={paymentMethod === 'cash' ? 'Confirm — arrange in person' : 'Continue to secure payment'}
        />
      ) : null}
    </>
  );
};

export default SaleCheckout;
