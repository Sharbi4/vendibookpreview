import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Loader2, ShieldCheck, Truck, MessageSquare } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useListing } from '@/hooks/useListing';
import { computeDeliveryFee, deliveryRateLabel, normalizeDeliveryFeeType } from '@/lib/fulfillment/delivery';
import { useToast } from '@/hooks/use-toast';
import { useFreightEstimate } from '@/hooks/useFreightEstimate';
import { supabase } from '@/integrations/supabase/client';
import { parseEdgeError } from '@/lib/edgeErrors';
import { checkoutErrorCopy } from '@/lib/checkoutErrorCopy';
import { validators } from '@/components/ui/validated-input';
import { trackFormSubmitConversion } from '@/lib/gtagConversions';
import { trackPurchase, trackInitiateCheckout } from '@/lib/facebookCAPI';
import { calculateDistance } from '@/lib/geolocation';
import SEO from '@/components/SEO';

import {
  PurchaseStepDelivery,
  PurchaseStepInfo,
  PurchaseStepPayment,
  DELIVERY_WINDOW_LABELS,
  type BuyerInfo,
  type DeliveryWindow,
} from '@/components/purchase-wizard';

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
import { useSellerPaymentReadiness } from '@/hooks/useSellerPaymentReadiness';
import FinancingActionPanel from '@/components/listing-detail/sale/FinancingActionPanel';
import MessageHostForm from '@/components/messaging/MessageHostForm';

import TransactionCheckoutShell from '@/components/transaction/checkout/TransactionCheckoutShell';
import CheckoutSection from '@/components/transaction/checkout/CheckoutSection';
import ListingCheckoutSummary from '@/components/transaction/checkout/ListingCheckoutSummary';
import MoneyBreakdown, { type MoneyLine } from '@/components/transaction/checkout/MoneyBreakdown';
import PayPalEmbeddedPayment from '@/components/transaction/checkout/PayPalEmbeddedPayment';

type FulfillmentSelection = 'pickup' | 'delivery' | 'vendibook_freight';

/**
 * Single-scroll for-sale checkout. Every money, eligibility and edge-function
 * rule below is unchanged from the previous multi-step wizard — only the
 * presentation (continuous sections instead of a stepper) has changed.
 */
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

  // Form state — persisted per-listing so leaving and returning restores it.
  const sessionKey = `sale:${listingId ?? 'unknown'}`;
  interface PersistedState {
    buyerInfo: BuyerInfo;
    fulfillmentSelected: FulfillmentSelection;
    deliveryAddress: string;
    deliveryInstructions: string;
    preferredDate: string;
    preferredWindow: DeliveryWindow | '';
    onSiteContact: string;
    identityAcknowledged: boolean;
  }
  const persist = useCheckoutState<PersistedState>(sessionKey, {
    buyerInfo: {
      firstName: '', lastName: '', businessName: '', email: '', phone: '',
      address1: '', address2: '', city: '', state: '', zipCode: '',
    },
    fulfillmentSelected: 'pickup',
    deliveryAddress: '',
    deliveryInstructions: '',
    preferredDate: '',
    preferredWindow: '',
    onSiteContact: '',
    identityAcknowledged: false,
  });

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
  const [isAddressComplete, setIsAddressComplete] = useState(false);
  const [deliveryCoords, setDeliveryCoords] = useState<[number, number] | null>(null);

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [paypalCheckout, setPaypalCheckout] = useState<{ transactionId: string; returnUrl: string } | null>(null);

  // Validation
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Payment method
  type PaymentMethod = 'card' | 'cash';
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

  /**
   * Fulfillment selected from the listing page's delivery checker. Applied
   * once so the buyer lands here with their method, destination ZIP and the
   * estimate they just saw. Pricing is still recomputed below — nothing is
   * trusted from here.
   */
  const deliveryChoiceApplied = useRef(false);
  useEffect(() => {
    const choice = (routerLocation.state as any)?.deliveryChoice;
    if (!choice || deliveryChoiceApplied.current) return;
    deliveryChoiceApplied.current = true;
    persist.setState((prev) => ({
      ...prev,
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

      const offerPriceParam = searchParams.get('offer_price');
      if (offerPriceParam) {
        const price = parseFloat(offerPriceParam);
        if (!isNaN(price) && price > 0) {
          setAcceptedOfferPrice(price);
          return;
        }
      }

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

  // Field validators for buyer info
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

  const deliveryRate = listing?.delivery_fee || 0;
  const deliveryFeeType = normalizeDeliveryFeeType((listing as any)?.delivery_fee_type);
  const fulfillmentType = listing?.fulfillment_type || 'pickup';
  const vendibookFreightEnabled = listing?.vendibook_freight_enabled || false;
  const freightPayer = (listing?.freight_payer as 'buyer' | 'seller') || 'buyer';
  const acceptPayPalCheckout = listing?.accept_paypal_checkout ?? true;
  const acceptCashPayment = listing?.accept_cash_payment ?? false;
  const isFreightSellerPaid = vendibookFreightEnabled && freightPayer === 'seller';
  const freightCost = estimate?.total_cost ?? 0;
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

  // ── Buyer identity ────────────────────────────────────────────────
  const { verified: buyerVerified, loading: buyerVerificationLoading } =
    useSellerVerifiedBadge(user?.id ?? null);

  // Seller payment-readiness gate. `gatingActive` is false today so
  // behaviour is unchanged; once the real check ships this blocks the
  // PayPal purchase action without touching any money logic.
  const sellerReadiness = useSellerPaymentReadiness(listing?.host_id ?? null);
  const paypalPurchaseBlocked = sellerReadiness.gatingActive && !sellerReadiness.ready;
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
  // Buyer-paid Vendibook Freight is charged with the purchase in the same
  // PayPal order — the backend (`quoteSaleTransaction`) adds it to the sale
  // total, so the figures here must include it too. Seller-paid freight is
  // never billed to the buyer.
  const getDeliveryFeeForSelection = (): number => {
    if (fulfillmentSelected === 'delivery' && deliveryRate) {
      return computeDeliveryFee(deliveryRate, deliveryFeeType, deliveryDistanceInfo.distance);
    }
    return 0;
  };

  const currentDeliveryFee = getDeliveryFeeForSelection();
  /** Buyer-paid Vendibook Freight, charged together with the purchase. */
  const buyerFreightCharge =
    fulfillmentSelected === 'vendibook_freight' && !isFreightSellerPaid ? freightCost : 0;

  // Estimated sales tax — server-computed (TaxJar / state table) so the buyer
  // sees the real total before PayPal opens. The authoritative amount is
  // re-locked at order creation in `paypal-create-order`.
  const [taxEstimate, setTaxEstimate] = useState<{ tax_cents: number; rate_pct: number; label: string } | null>(null);
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
          if (!controller.signal.aborted) {
            setTaxEstimate(null);
            setTaxState('error');
          }
        });
    }, 350);
    return () => { clearTimeout(t); controller.abort(); };
  }, [listing?.id, priceSale, fulfillmentSelected, currentDeliveryFee, deliveryAddress]);

  const taxAmount = (taxEstimate?.tax_cents ?? 0) / 100;
  // Item + seller delivery + buyer-paid freight + estimated sales tax. Mirrors
  // `quoteSaleTransaction` on the server, which re-locks the authoritative total.
  const totalPrice = priceSale + currentDeliveryFee + buyerFreightCharge + taxAmount;

  const taxSummaryLabel = taxAmount > 0
    ? taxEstimate?.label || 'Estimated sales tax'
    : taxState === 'loading'
      ? 'Estimated sales tax'
      : taxState === 'error'
        ? 'Sales tax'
        : null;
  const taxSummaryValue = taxAmount > 0
    ? `$${taxAmount.toLocaleString()}`
    : taxState === 'loading'
      ? 'Calculating…'
      : 'Calculated at payment';

  // Validation
  const validateFulfillment = (): boolean => {
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
  };

  const validateDetails = (): boolean => {
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
        // Everything charged today: seller delivery plus buyer-paid freight.
        deliveryFeeDollars: currentDeliveryFee + buyerFreightCharge,
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
    if (!validateFulfillment()) return;
    if (!validateDetails()) return;
    if (paypalPurchaseBlocked && paymentMethod !== 'cash') {
      toast({
        title: 'Seller setup incomplete',
        description: "This seller hasn't finished payment setup yet. Message them or choose pay-in-person if available.",
        variant: 'destructive',
      });
      return;
    }
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
      setPaypalCheckout({
        transactionId: data.transaction_id as string,
        returnUrl: `${window.location.origin}/order-tracking/${data.transaction_id}`,
      });
    } catch (error) {
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
      <div className="v2-checkout min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-foreground/60" />
      </div>
    );
  }

  // Error state — listing unavailable.
  if (listingError || !listing) {
    return (
      <div className="v2-checkout min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Listing not found</h2>
          <button onClick={() => navigate('/browse')} className="v2-btn-quiet">
            Browse listings
          </button>
        </div>
      </div>
    );
  }

  // Block owners from purchasing their own listings
  if (isOwner) {
    return (
      <TransactionCheckoutShell
        title="You own this listing"
        subtitle="You cannot purchase your own listing."
        exitHref={`/listing/${listingId}`}
      >
        <CheckoutSection title="Cannot purchase your own listing">
          <p className="text-sm text-muted-foreground">
            You're the seller for this listing, so checkout isn't available here.
          </p>
          <button onClick={() => navigate(`/listing/${listingId}`)} className="v2-btn-outline mt-4">
            Back to listing
          </button>
        </CheckoutSection>
      </TransactionCheckoutShell>
    );
  }

  // Privacy-safe: business name, else "First L." — never a full legal name.
  const sellerName = host ? getPublicDisplayName(host, 'Seller') : undefined;
  const locationLabel = [listing.city, listing.state].filter(Boolean).join(', ') || undefined;
  const coverImage = listing.cover_image_url || listing.image_urls?.[0] || null;
  const sellerVerifiedFlag = Boolean((host as { identity_verified?: boolean } | null | undefined)?.identity_verified);
  const financingEligible = priceSale >= 150 && acceptPayPalCheckout;

  /** Prefill the details section from the delivery address the buyer already typed. */
  const prefillFromDeliveryAddress = () => {
    if (fulfillmentSelected === 'pickup' || buyerInfo.address1.trim()) return;
    const parsed = parseFormattedAddress(deliveryAddress);
    if (!parsed) return;
    setBuyerInfo((prev) => ({ ...prev, ...parsed }));
  };

  const fulfillmentDetail =
    fulfillmentSelected === 'pickup'
      ? locationLabel ? `Pick up near ${locationLabel}` : 'Arranged with the seller'
      : deliveryAddress || 'Address confirmed below';

  const moneyLines: MoneyLine[] = [
    { label: listing.title, value: `$${priceSale.toLocaleString()}` },
    ...(currentDeliveryFee > 0
      ? [{ label: 'Seller delivery', value: `$${currentDeliveryFee.toLocaleString()}` }]
      : []),
    ...(buyerFreightCharge > 0
      ? [{ label: 'Vendibook Freight', value: `$${buyerFreightCharge.toLocaleString()}` }]
      : []),
    ...(taxSummaryLabel ? [{ label: taxSummaryLabel, value: taxSummaryValue, muted: taxAmount === 0 }] : []),
  ];

  const moneyBreakdown = (
    <MoneyBreakdown lines={moneyLines} total={`$${totalPrice.toLocaleString()}`} totalNote="Due today" />
  );

  const summaryMeta = [
    { label: 'Fulfillment', value: fulfillmentSelected === 'vendibook_freight' ? 'Vendibook Freight' : fulfillmentSelected === 'delivery' ? 'Delivery' : 'Pickup' },
    { label: 'Details', value: fulfillmentDetail },
  ];

  const summaryContent = (
    <ListingCheckoutSummary
      imageUrl={coverImage}
      title={listing.title}
      typeLabel={listing.category ?? null}
      location={locationLabel}
      counterpartyLabel={sellerName ? `Sold by ${sellerName}` : undefined}
      priceLabel={`$${priceSale.toLocaleString()}`}
      priceNote={acceptedOfferPrice ? 'Accepted offer price' : undefined}
      meta={summaryMeta}
    >
      {moneyBreakdown}
    </ListingCheckoutSummary>
  );

  const canSubmit = fulfillmentReady && agreedToTerms && !isPurchasing && !termsGate.preparing;

  return (
    <>
      <SEO title={`Checkout - ${listing.title}`} description={`Complete your purchase of ${listing.title}`} />

      <TransactionCheckoutShell
        title="Checkout"
        subtitle={listing.title}
        exitHref={`/listing/${listingId}`}
        summary={summaryContent}
        mobileSummary={summaryContent}
        stickyAction={
          <div className="v2-checkout-sticky-inner">
            <div className="v2-checkout-sticky-total">
              <span>Total due today</span>
              <strong>${totalPrice.toLocaleString()}</strong>
            </div>
            {paymentMethod === 'cash' ? (
              <button
                type="button"
                className="v2-btn"
                onClick={handlePurchase}
                disabled={!canSubmit}
              >
                Confirm
              </button>
            ) : (
              <button
                type="button"
                className="v2-btn"
                onClick={handlePurchase}
                disabled={!canSubmit || Boolean(paypalCheckout)}
              >
                {paypalCheckout ? 'Complete above' : 'Review & pay'}
              </button>
            )}
          </div>
        }
      >
        {!user && (
          <div className="v2-checkout-section" role="status">
            <div className="v2-checkout-section-body">
              <p className="text-sm font-semibold text-foreground">Sign in to complete checkout</p>
              <p className="text-xs text-muted-foreground mt-1">
                An account is required to pay securely. Sign in now so we can keep your details when you return.
              </p>
              <button
                onClick={() => navigate(`/auth?redirect=/checkout/${listingId}`)}
                className="v2-btn mt-3"
              >
                Sign in / Create account
              </button>
            </div>
          </div>
        )}

        {/* 1. Review your purchase */}
        <CheckoutSection title="Review your purchase" description="Confirm this is the item, seller and price you're checking out.">
          <ListingCheckoutSummary
            imageUrl={coverImage}
            title={listing.title}
            typeLabel={listing.category ?? null}
            location={locationLabel}
            counterpartyLabel={sellerName ? `Sold by ${sellerName}${sellerVerifiedFlag ? ' · Verified' : ''}` : undefined}
            priceLabel={`$${priceSale.toLocaleString()}`}
            priceNote={acceptedOfferPrice ? 'Accepted offer price' : undefined}
          />
          {financingEligible && (
            <p className="text-xs text-muted-foreground mt-3">
              Financing may be available for this item — see the Payment section below.
            </p>
          )}
        </CheckoutSection>

        {/* 2. How you'll get it */}
        <CheckoutSection title="How you'll get it">
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
            onBack={() => undefined}
            onContinue={() => undefined}
          />
        </CheckoutSection>

        {/* 3. Your details */}
        <CheckoutSection title="Your details">
          {!buyerVerificationLoading && !buyerVerified && (
            <div className="v2-checkout-section mb-4">
              <div className="v2-checkout-section-body">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Verification is handled by Plaid — sellers only ever see a pass/fail result,
                  never your documents. Verified buyers get pickup addresses and scheduling
                  confirmed faster.
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <button type="button" onClick={() => setIdentityDialogOpen(true)} className="v2-btn">
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
            </div>
          )}

          {buyerVerified && (
            <div className="flex items-center gap-3 mb-4 text-sm text-foreground">
              <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
              <div>
                <div className="font-semibold">Identity verified</div>
                <p className="text-xs text-muted-foreground">Your Plaid identity check is active — nothing else to do here.</p>
              </div>
            </div>
          )}

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
            onBack={() => undefined}
            onContinue={() => { prefillFromDeliveryAddress(); }}
          />
        </CheckoutSection>

        {/* 4. Payment */}
        <CheckoutSection title="Payment">
          {paypalPurchaseBlocked && !acceptCashPayment ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                This seller hasn't finished setting up payments yet, so we can't take a
                secure PayPal payment for this listing right now. You can message the
                seller directly, or come back once payment setup is complete.
              </p>
              {sellerReadiness.reasons.length > 0 ? (
                <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                  {sellerReadiness.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              ) : null}
              <div className="rounded-xl bg-muted/60 p-4">
                <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-foreground">
                  <MessageSquare className="h-4 w-4" /> Message the seller
                </div>
                <MessageHostForm listingId={listing.id} hostId={listing.host_id} listingTitle={listing.title} />
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {hasMultiplePaymentOptionsFor(acceptPayPalCheckout, acceptCashPayment) && (
                <PurchaseStepPayment
                  embedded
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  acceptPayPalCheckout={acceptPayPalCheckout && !paypalPurchaseBlocked}
                  acceptCashPayment={acceptCashPayment}
                  titleStatus={(listing as { title_status?: string | null }).title_status ?? null}
                  hasLien={(listing as { has_lien?: string | null }).has_lien ?? null}
                  vin={(listing as { vin?: string | null }).vin ?? null}
                  totalPrice={totalPrice}
                  submitting={isPurchasing || termsGate.preparing}
                  onBack={() => undefined}
                  onContinue={() => undefined}
                />
              )}

              {buyerFreightCharge > 0 && paymentMethod !== 'cash' ? (
                <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-4">
                  <Truck className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Your quoted freight of{' '}
                    <span className="font-medium text-foreground">${buyerFreightCharge.toLocaleString()}</span>{' '}
                    is included in the total below — shipping is arranged once the seller
                    confirms this sale.
                  </p>
                </div>
              ) : null}

              <div className="space-y-4">
                <ReferralCodeField
                  programType="purchase"
                  value={referralCode}
                  onChange={(code, valid) => { setReferralCode(code); setReferralValid(valid); }}
                  autoFillFromCookie
                />
                <label className="flex items-start gap-3 rounded-xl bg-muted/40 p-3 cursor-pointer">
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

              {paymentMethod === 'cash' ? (
                <div className="space-y-4">
                  {moneyBreakdown}
                  <button
                    type="button"
                    className="v2-btn w-full"
                    onClick={handlePurchase}
                    disabled={!canSubmit}
                  >
                    {isPurchasing || termsGate.preparing ? 'Working…' : 'Confirm — arrange in person'}
                  </button>
                </div>
              ) : (
                <>
                  <PayPalEmbeddedPayment
                    target={{ kind: 'sale', id: paypalCheckout?.transactionId ?? '' }}
                    sellerId={listing.host_id}
                    listingHref={`/listing/${listingId}`}
                    blocked={!paypalCheckout}
                    blockedReason="Review and confirm your order to unlock secure payment."
                    breakdown={moneyBreakdown}
                    returnUrl={paypalCheckout?.returnUrl}
                    totalUsd={totalPrice}
                  />
                  {!paypalCheckout && (
                    <button
                      type="button"
                      className="v2-btn w-full"
                      onClick={handlePurchase}
                      disabled={!canSubmit}
                    >
                      {isPurchasing || termsGate.preparing ? 'Working…' : `Review and pay $${totalPrice.toLocaleString()}`}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </CheckoutSection>

        {/* Financing — a separate application, never mixed with the PayPal purchase flow above. */}
        <FinancingActionPanel listing={listing} host={host} showPaymentLockup={false} />

        <VerifiedSellerDialog
          open={identityDialogOpen}
          onOpenChange={setIdentityDialogOpen}
          onVerified={() => refreshSellerBadgeSurfaces(queryClient)}
        />
      </TransactionCheckoutShell>

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

const hasMultiplePaymentOptionsFor = (acceptPayPalCheckout: boolean, acceptCashPayment: boolean) =>
  acceptPayPalCheckout && acceptCashPayment;

export default SaleCheckout;
