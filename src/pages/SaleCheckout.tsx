import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useListing } from '@/hooks/useListing';
import { useToast } from '@/hooks/use-toast';
import { useFreightEstimate } from '@/hooks/useFreightEstimate';
import { supabase } from '@/integrations/supabase/client';
import { CheckoutOverlay, PayPalPaymentPanel } from '@/components/checkout';
import CheckoutChrome from '@/components/checkout/CheckoutChrome';
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
import StickySummary from '@/components/shared/StickySummary';

// Step components
import { PurchaseStepDelivery, PurchaseStepInfo, PurchaseStepReview, type BuyerInfo } from '@/components/purchase-wizard';
import StepConfirmPurchase from '@/components/checkout/StepConfirmPurchase';
import CheckoutIntro from '@/components/checkout/CheckoutIntro';

import StepAddOns, { type CheckoutAddOn } from '@/components/checkout/StepAddOns';
import { ReferralCodeField } from '@/components/referrals/ReferralCodeField';
import { FinalReviewSheet } from '@/components/transaction/FinalReviewSheet';
import { useTermsGate } from '@/hooks/useTermsGate';
import { buildTerms } from '@/lib/transactionTerms';
import { ProtectionOptInCard } from '@/components/protected-sale/ProtectionOptInCard';
import { useCheckoutState } from '@/hooks/useCheckoutState';
import { getPublicDisplayName } from '@/lib/displayName';
import {
  JourneyProgress,
  PrimaryActionBar,
  TrustModule,
  PAYMENT_TRUST_POINTS,
  PAYMENT_DISCLAIMER,
  type JourneyStep,
} from '@/components/journey';

type FulfillmentSelection = 'pickup' | 'delivery' | 'vendibook_freight';
type CheckoutStep = 'intro' | 'confirm' | 'delivery' | 'addons' | 'details' | 'review';

// High-value sale threshold. Below this we skip the intro screen and drop
// buyers straight into the wizard (small tool/add-on purchases).
const SALE_INTRO_MIN_PRICE = 1000;

const CHECKOUT_STEPS = [
  { step: 1, label: 'Confirm',   short: 'Confirm' },
  { step: 2, label: 'Delivery',  short: 'Delivery' },
  { step: 3, label: 'Add-ons',   short: 'Add-ons' },
  { step: 4, label: 'Your details', short: 'Details' },
  { step: 5, label: 'Review & pay', short: 'Pay' },
];

const STEP_NUM: Record<CheckoutStep, number> = {
  intro: 0, confirm: 1, delivery: 2, addons: 3, details: 4, review: 5,
};

const getStepNumber = (step: CheckoutStep): number => STEP_NUM[step];


const SaleCheckout = () => {
  const { listingId } = useParams();
  const navigate = useNavigate();
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
  });

  const currentStep = persist.state.step;
  const setCurrentStep = (s: CheckoutStep) => {
    persist.setState((prev) => ({ ...prev, step: s }));
    persist.bumpFurthestStep(STEP_NUM[s]);
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
      
      if (listing.accept_card_payment) {
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
      setCurrentStep('confirm');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, isListingLoading, priceSale]);

  const deliveryFee = listing?.delivery_fee || 0;
  const fulfillmentType = listing?.fulfillment_type || 'pickup';
  const vendibookFreightEnabled = listing?.vendibook_freight_enabled || false;
  const freightPayer = (listing?.freight_payer as 'buyer' | 'seller') || 'buyer';
  const acceptCardPayment = listing?.accept_card_payment ?? true;
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
  const getDeliveryFeeForSelection = (): number => {
    if (fulfillmentSelected === 'vendibook_freight') {
      return isFreightSellerPaid ? 0 : freightCost;
    }
    if (fulfillmentSelected === 'delivery' && deliveryFee) {
      return deliveryFee;
    }
    return 0;
  };
  
  const currentDeliveryFee = getDeliveryFeeForSelection();
  const totalPrice = priceSale + currentDeliveryFee;

  // Validation
  const validateStep = (step: CheckoutStep): boolean => {
    if (step === 'delivery') {
      if (fulfillmentSelected === 'vendibook_freight' && !hasValidEstimate) {
        toast({ title: 'Enter delivery address', description: 'Please enter a complete address to get a freight quote.', variant: 'destructive' });
        return false;
      }
      if ((fulfillmentSelected === 'delivery' || fulfillmentSelected === 'vendibook_freight') && !deliveryAddress.trim()) {
        toast({ title: 'Missing address', description: 'Please enter a delivery address.', variant: 'destructive' });
        return false;
      }
      return true;
    }
    
    if (step === 'details') {
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
        accept_card_payment: acceptCardPayment,
      },
      selection: {
        mode: 'sale',
        paymentMethod: paymentMethod === 'cash' ? 'pay_in_person' : 'stripe_card',
        basePriceDollars: priceSale,
        deliveryFeeDollars: fulfillmentSelected === 'delivery' ? deliveryFee : (fulfillmentSelected === 'vendibook_freight' ? freightCost : 0),
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

  const handlePurchase = async () => {
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
    await termsGate.prepare(t);
  };

  const runPurchase = async () => {
    if (!listingId || !listing?.host_id) return;
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
              delivery_fee: fulfillmentSelected === 'delivery' ? deliveryFee : 0,
              freight_cost: isVendibookFreight ? freightCost : 0,
              delivery_address:
                fulfillmentSelected === 'delivery' || isVendibookFreight
                  ? deliveryAddress.trim()
                  : null,
              delivery_instructions:
                fulfillmentSelected === 'delivery' || isVendibookFreight
                  ? deliveryInstructions.trim()
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
          delivery_fee: fulfillmentSelected === 'delivery' ? deliveryFee : 0,
          fulfillment_type: isVendibookFreight ? 'vendibook_freight' : fulfillmentSelected,
          delivery_address: (fulfillmentSelected === 'delivery' || isVendibookFreight) ? deliveryAddress.trim() : null,
          delivery_instructions: (fulfillmentSelected === 'delivery' || isVendibookFreight) ? deliveryInstructions.trim() : null,
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
        return;
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
      <CheckoutChrome
        steps={CHECKOUT_STEPS}
        currentStep={1}
        exitHref={`/listing/${listingId}`}
        exitLabel="Back to listing"
      >
        <div className="container max-w-md mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <ArrowLeft className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">You own this listing</h2>
          <p className="text-muted-foreground mb-4">You cannot purchase your own listing.</p>
          <button onClick={() => navigate(`/listing/${listingId}`)} className="text-primary hover:underline">
            Back to listing
          </button>
        </div>
      </CheckoutChrome>
    );
  }

  const hasMultiplePaymentOptions = acceptCardPayment && acceptCashPayment;
  const currentStepNumber = getStepNumber(currentStep);

  // ─── Journey progress + primary-action wiring ───
  // Uses the existing CHECKOUT_STEPS + listing identifier so the roadmap
  // and CTA stay in lock-step with the wizard's real state.
  type WizardStep = Exclude<CheckoutStep, 'intro'>;
  const WIZARD_STEP_ORDER: WizardStep[] = ['confirm', 'delivery', 'addons', 'details', 'review'];
  const journeySteps: JourneyStep[] = CHECKOUT_STEPS.map((s, i) => ({
    id: WIZARD_STEP_ORDER[i],
    label: s.label,
    optional: WIZARD_STEP_ORDER[i] === 'addons',
  }));
  const journeyIndex = Math.max(0, WIZARD_STEP_ORDER.indexOf(currentStep as WizardStep));
  const nextWizardStep: WizardStep | null =
    WIZARD_STEP_ORDER[Math.min(journeyIndex + 1, WIZARD_STEP_ORDER.length - 1)] ?? null;

  const advanceFromCurrent = () => {
    if (currentStep === 'confirm') return setCurrentStep('delivery');
    if (currentStep === 'delivery') {
      if (validateStep('delivery')) setCurrentStep('addons');
      return;
    }
    if (currentStep === 'addons') return setCurrentStep('details');
    if (currentStep === 'details') {
      if (validateStep('details')) setCurrentStep('review');
      return;
    }
  };

  const primaryLabel =
    currentStep === 'review'
      ? 'Complete purchase below'
      : nextWizardStep && nextWizardStep !== (currentStep as WizardStep)
        ? `Continue to ${CHECKOUT_STEPS[WIZARD_STEP_ORDER.indexOf(nextWizardStep)]?.label ?? 'next step'}`
        : 'Continue';
  const primaryDisabled = currentStep === 'review';


  // Price lines for sticky summary — real listing title, never "Item price"
  const priceLines = [
    { label: listing.title, amount: priceSale },
    ...(currentDeliveryFee > 0 ? [{
      label: fulfillmentSelected === 'vendibook_freight' ? 'Freight' : 'Delivery',
      amount: currentDeliveryFee,
      isDelivery: true,
    }] : []),
  ];

  // Privacy-safe: business name, else "First L." — never a full legal name.
  const sellerName = host ? getPublicDisplayName(host, 'Seller') : undefined;
  const locationLabel = [listing.city, listing.state].filter(Boolean).join(', ') || undefined;

  // Contextual add-ons — only surface what actually applies to this listing.
  const addOnCatalog: CheckoutAddOn[] = [
    {
      id: 'inspection',
      title: 'Pre-purchase inspection referral',
      description: 'We connect you with a local third-party inspector before you finalize.',
      priceLabel: 'From $149',
      icon: 'inspection',
      eligible: priceSale >= 3000,
    },
    {
      id: 'notarization',
      title: 'Notarized bill of sale',
      description: 'A licensed notary co-signs your documents for higher-value transfers.',
      priceLabel: '$29',
      icon: 'notarization',
      eligible: priceSale >= 10000,
    },
  ];

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
            coverImageUrl={listing.cover_image_url ?? (listing.image_urls?.[0] ?? null)}
            city={listing.city}
            state={listing.state}
            price={priceSale}
            sellerName={sellerName}
            sellerVerified={Boolean((host as { identity_verified?: boolean } | null | undefined)?.identity_verified)}
            flow="sale"
            financingEligible={priceSale >= 150 && acceptCardPayment}
            onBack={() => navigate(`/listing/${listingId}`)}
            onContinue={() => setCurrentStep('confirm')}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <SEO title={`Checkout - ${listing.title}`} description={`Complete your purchase of ${listing.title}`} />

      <CheckoutChrome
        steps={CHECKOUT_STEPS}
        currentStep={currentStepNumber}
        exitHref={`/listing/${listingId}`}
        exitLabel="Back to listing"
      >
        <div className="container max-w-6xl mx-auto px-4">
          {/* Guest sign-in prompt — surfaced BEFORE the wizard so buyers don't lose typed info at the Pay step */}
          {!user && (
            <div className="mb-4 rounded-xl border border-primary/40 bg-primary/[0.06] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">Sign in to complete checkout</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  An account is required to pay securely. Sign in now so we can keep your details when you return.
                </p>
              </div>
              <button
                onClick={() => navigate(`/auth?redirect=/checkout/${listingId}`)}
                className="shrink-0 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Sign in / Create account
              </button>
            </div>
          )}

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Main Wizard - Left Side */}
            <div className="lg:col-span-3 space-y-4">
              {/* Persistent step roadmap driven by the real wizard state */}
              <JourneyProgress
                steps={journeySteps}
                currentIndex={journeyIndex}
                estimate="About 2 minutes"
              />
              <div className="glass-panel overflow-hidden">
                {/* Step Content */}
                <div className="p-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      {currentStep === 'confirm' && (
                        <StepConfirmPurchase
                          listing={{
                            title: listing.title,
                            cover_image_url: listing.cover_image_url,
                            image_urls: listing.image_urls,
                            city: listing.city,
                            state: listing.state,
                            category: listing.category ?? null,
                            condition: (listing as { condition?: string | null }).condition ?? null,
                            year: (listing as { year?: number | null }).year ?? null,
                          }}
                          priceSale={priceSale}
                          sellerName={sellerName}
                          sellerVerified={Boolean((host as { identity_verified?: boolean } | null | undefined)?.identity_verified)}
                          specSummary={(listing as { specifications?: string | null }).specifications ?? null}
                          onContinue={() => setCurrentStep('delivery')}
                          onBack={priceSale >= SALE_INTRO_MIN_PRICE ? () => setCurrentStep('intro') : undefined}

                        />
                      )}

                      {currentStep === 'delivery' && (
                        <PurchaseStepDelivery
                          fulfillmentOptions={fulfillmentOptions}
                          fulfillmentSelected={fulfillmentSelected}
                          setFulfillmentSelected={setFulfillmentSelected}
                          deliveryAddress={deliveryAddress}
                          setDeliveryAddress={setDeliveryAddress}
                          setDeliveryCoords={setDeliveryCoords}
                          deliveryFee={deliveryFee}
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
                          onBack={() => setCurrentStep('confirm')}
                          onContinue={() => {
                            if (validateStep('delivery')) {
                              setCurrentStep('addons');
                            }
                          }}
                        />
                      )}

                      {currentStep === 'addons' && (
                        <StepAddOns
                          addOns={addOnCatalog}
                          selected={addOnSelections}
                          onToggle={toggleAddOn}
                          onBack={() => setCurrentStep('delivery')}
                          onContinue={() => setCurrentStep('details')}
                          onSkip={() => setCurrentStep('details')}
                        />
                      )}

                      {currentStep === 'details' && (
                        <PurchaseStepInfo
                          buyerInfo={buyerInfo}
                          updateBuyerInfo={updateBuyerInfo}
                          deliveryInstructions={deliveryInstructions}
                          setDeliveryInstructions={setDeliveryInstructions}
                          fulfillmentSelected={fulfillmentSelected}
                          fieldErrors={fieldErrors}
                          touchedFields={touchedFields}
                          setTouchedFields={setTouchedFields}
                          hideAddress={fulfillmentSelected === 'pickup'}
                          continueLabel="Review your order"
                          onBack={() => setCurrentStep('addons')}
                          onContinue={() => {
                            if (validateStep('details')) {
                              setCurrentStep('review');
                            }
                          }}
                        />
                      )}

                      {currentStep === 'review' && (
                        <>
                          <div className="p-4 mb-4 border border-border rounded-lg bg-card">
                            <ReferralCodeField
                              programType="purchase"
                              value={referralCode}
                              onChange={(code, valid) => { setReferralCode(code); setReferralValid(valid); }}
                              autoFillFromCookie
                            />
                          </div>
                          <PurchaseStepReview
                            listing={listing}
                            priceSale={priceSale}
                            currentDeliveryFee={currentDeliveryFee}
                            totalPrice={totalPrice}
                            fulfillmentSelected={fulfillmentSelected}
                            deliveryAddress={deliveryAddress}
                            buyerInfo={buyerInfo}
                            hasValidEstimate={hasValidEstimate}
                            estimate={estimate}
                            isFreightSellerPaid={isFreightSellerPaid}
                            freightCost={freightCost}
                            paymentMethod={paymentMethod}
                            setPaymentMethod={setPaymentMethod}
                            hasMultiplePaymentOptions={hasMultiplePaymentOptions}
                            agreedToTerms={agreedToTerms}
                            setAgreedToTerms={setAgreedToTerms}
                            isPurchasing={isPurchasing}
                            hideAddress={fulfillmentSelected === 'pickup'}
                            onBack={() => setCurrentStep('details')}
                            onEditDelivery={() => setCurrentStep('delivery')}
                            onEditInfo={() => setCurrentStep('details')}
                            onSubmit={handlePurchase}
                          />
                          {paymentMethod !== 'cash' ? (
                            <ProtectionOptInCard salePriceCents={Math.round(totalPrice * 100)} />
                          ) : null}
                        </>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Sticky mobile-first primary path — mirrors the current step's next action */}
              <PrimaryActionBar
                sticky
                helper={
                  currentStep === 'review'
                    ? 'Confirm terms & pay using the panel above.'
                    : 'You can go back to any prior step at any time.'
                }
                primary={{
                  label: primaryLabel,
                  onClick: advanceFromCurrent,
                  disabled: primaryDisabled,
                }}
                secondary={{
                  label: 'Back to listing',
                  onClick: () => navigate(`/listing/${listingId}`),
                }}
              />
            </div>

            {/* Sticky Summary - Right Side (Desktop Only) */}
            <div className="lg:col-span-2 hidden lg:block">
              <div className="sticky top-24 space-y-4">
                <StickySummary
                  imageUrl={listing.cover_image_url || listing.image_urls?.[0]}
                  title={listing.title}
                  category={listing.category}
                  itemId={listing.id}
                  sellerName={sellerName}
                  sellerLabel="Sold by"
                  locationLabel={locationLabel}
                  priceLines={priceLines}
                  totalToday={totalPrice}
                  fulfillmentType={fulfillmentSelected}
                  deliveryAddress={deliveryAddress}
                  mode="checkout"
                  showWhatsIncluded={currentStep !== 'review'}
                  financingEligiblePrice={totalPrice}
                />
                {/* Trust reinforcement anchored to the summary */}
                <TrustModule
                  points={PAYMENT_TRUST_POINTS}
                  disclaimer={PAYMENT_DISCLAIMER}
                  variant="compact"
                />
              </div>
            </div>
          </div>
        </div>
      </CheckoutChrome>

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
