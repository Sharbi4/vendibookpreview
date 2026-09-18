import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { Loader2, MapPin, Pencil, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useListing } from '@/hooks/useListing';
import { computeDeliveryFee, deliveryRateLabel, normalizeDeliveryFeeType } from '@/lib/fulfillment/delivery';
import { useToast } from '@/hooks/use-toast';
import { useFreightEstimate } from '@/hooks/useFreightEstimate';
import { supabase } from '@/integrations/supabase/client';
import ProtectionDisclosure from '@/components/checkout/ProtectionDisclosure';
import { parseEdgeError } from '@/lib/edgeErrors';
import { checkoutErrorCopy } from '@/lib/checkoutErrorCopy';
import { validators } from '@/components/ui/validated-input';
import { trackFormSubmitConversion } from '@/lib/gtagConversions';
import { trackPurchase, trackInitiateCheckout } from '@/lib/facebookCAPI';
import { calculateDistance } from '@/lib/geolocation';
import { formatCurrency } from '@/lib/commissions';
import SEO from '@/components/SEO';
import { PayPalWordmark } from '@/components/brand/ProviderLogos';

import {
  PurchaseStepDelivery,
  PurchaseStepInfo,
  PurchaseStepPayment,
  DELIVERY_WINDOW_LABELS,
  type BuyerInfo,
  type DeliveryWindow,
} from '@/components/purchase-wizard';

import { ReferralCodeField } from '@/components/referrals/ReferralCodeField';
import { useTermsGate } from '@/hooks/useTermsGate';
import { buildTerms } from '@/lib/transactionTerms';
import { useCheckoutState } from '@/hooks/useCheckoutState';
import { parseFormattedAddress } from '@/lib/fulfillment/parseAddress';
import { getPublicDisplayName } from '@/lib/displayName';
import { useSellerPaymentReadiness } from '@/hooks/useSellerPaymentReadiness';
import FinancingActionPanel from '@/components/listing-detail/sale/FinancingActionPanel';

import TransactionCheckoutShell from '@/components/transaction/checkout/TransactionCheckoutShell';
import CheckoutSection from '@/components/transaction/checkout/CheckoutSection';
import ListingCheckoutSummary from '@/components/transaction/checkout/ListingCheckoutSummary';
import MoneyBreakdown, { type MoneyLine } from '@/components/transaction/checkout/MoneyBreakdown';
import PayPalEmbeddedPayment from '@/components/transaction/checkout/PayPalEmbeddedPayment';
import SaleCheckoutWizard from '@/components/checkout/sale/SaleCheckoutWizard';
import TransactionAgreementStep from '@/components/checkout/TransactionAgreementStep';
import PostPaymentTimeline from '@/components/checkout/PostPaymentTimeline';
import { recordCheckoutAgreements } from '@/lib/legal/recordCheckoutAgreements';
import { loadPayPalSdk } from '@/lib/paypalClient';
import { Button } from '@/components/ui/button';
import { useLegalDocument } from '@/hooks/useLegalDocument';
import { CONSENT_TRIGGERS, DOCUMENT_TYPES } from '@/lib/legalDocuments';

type FulfillmentSelection = 'pickup' | 'delivery' | 'vendibook_freight';

/**
 * Inline for-sale checkout wizard. Money, eligibility, and server payment
 * rules remain authoritative while each step preserves the buyer's inputs.
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
  const [isAddressComplete, setIsAddressComplete] = useState(false);
  const [deliveryCoords, setDeliveryCoords] = useState<[number, number] | null>(null);

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  /** Checkout acceptance of Terms + Payments Terms + Privacy. Never pre-ticked. */
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [paypalCheckout, setPaypalCheckout] = useState<{ transactionId: string; returnUrl: string } | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [furthestStep, setFurthestStep] = useState(1);
  const [recordingConsent, setRecordingConsent] = useState(false);

  // Validation
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Payment method
  type PaymentMethod = 'card' | 'cash';
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  /** Transaction-specific documents shown on the explicit Agreement step. */
  const agreement = useLegalDocument(DOCUMENT_TYPES.SALE_BUYER_TERMS);
  const privacyConsent = useLegalDocument(DOCUMENT_TYPES.CHECKOUT_PRIVACY_ELECTRONIC_CONSENT);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  /**
   * Warm the official PayPal SDK as soon as checkout opens so the payment
   * surface is interactive the moment the buyer reaches the Payment step.
   * No PayPal order is created here — nothing is charged or reserved.
   */
  useEffect(() => {
    loadPayPalSdk({ pageType: 'checkout' }).catch(() => undefined);
  }, []);

  /**
   * Entering the Payment step with online payment selected creates (or
   * reuses) the pending Vendibook sale transaction the PayPal order will
   * attach to, so the payment surface is ready without an extra click.
   */
  const runPurchaseRef = useRef<(() => Promise<void>) | null>(null);
  const autoIntentRef = useRef(false);

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

  // Seller payment-readiness gate. `gatingActive` is false today so
  // behaviour is unchanged; once the real check ships this blocks the
  // PayPal purchase action without touching any money logic.
  const sellerReadiness = useSellerPaymentReadiness(listing?.host_id ?? null);
  const paypalPurchaseBlocked = sellerReadiness.gatingActive && !sellerReadiness.ready;
  const [fulfillmentReady, setFulfillmentReady] = useState(false);

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
    ? formatCurrency(taxAmount)
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

  // ── Inline agreement and final-payment preparation ─────────────
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

  const prepareAgreement = async () => {
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
    const t = buildCurrentTerms();
    if (!t) return false;
    submitLockRef.current = true;
    try {
      return await termsGate.prepare(t, { openSheet: false });
    } finally {
      submitLockRef.current = false;
    }
  };

  const recordAgreement = async () => {
    if (!agreedToTerms || !privacyAccepted || !termsGate.terms || recordingConsent) return false;
    setRecordingConsent(true);
    try {
      await recordCheckoutAgreements({
        mode: 'sale',
        trigger:
          paymentMethod === 'cash' ? CONSENT_TRIGGERS.PAY_IN_PERSON : CONSENT_TRIGGERS.PURCHASE_REVIEW,
        relatedIds: {
          listing_id: termsGate.terms.listing.id,
          terms_id: termsGate.termsId,
        },
        hashes: {
          agreement: agreement.data?.content_hash ?? null,
          privacy: privacyConsent.data?.content_hash ?? null,
        },
      });
      if (termsGate.termsId) {
        await supabase.functions.invoke('acknowledge-terms', { body: { terms_id: termsGate.termsId } });
      }
      return true;
    } catch (error) {
      toast({
        title: 'Could not record your acceptance',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setRecordingConsent(false);
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

  runPurchaseRef.current = runPurchase;

  useEffect(() => {
    if (currentStep !== 5 || paymentMethod !== 'card') return;
    if (paypalCheckout || autoIntentRef.current) return;
    autoIntentRef.current = true;
    void runPurchaseRef.current?.().finally(() => {
      autoIntentRef.current = false;
    });
  }, [currentStep, paymentMethod, paypalCheckout]);

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
    { label: listing.title, value: formatCurrency(priceSale) },
    ...(currentDeliveryFee > 0
      ? [{ label: 'Seller delivery', value: formatCurrency(currentDeliveryFee) }]
      : []),
    ...(buyerFreightCharge > 0
      ? [{ label: 'Vendibook Freight', value: formatCurrency(buyerFreightCharge) }]
      : []),
    ...(taxSummaryLabel ? [{ label: taxSummaryLabel, value: taxSummaryValue, muted: taxAmount === 0 }] : []),
  ];

  const moneyBreakdown = (
    <MoneyBreakdown lines={moneyLines} total={formatCurrency(totalPrice)} totalNote="Due today" />
  );

  const summaryMeta = [
    { label: 'Fulfillment', value: fulfillmentSelected === 'vendibook_freight' ? 'Vendibook Freight' : fulfillmentSelected === 'delivery' ? 'Delivery' : 'Pickup' },
    { label: 'Details', value: fulfillmentDetail },
  ];

  const humanizeCategory = (value?: string | null) =>
    value ? value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : null;

  const railExtras = (
    <div className="v2-rail-extras">
      <div className="v2-rail-paypal">
        <PayPalWordmark className="h-4 w-auto shrink-0" />
        {currentStep === 5 ? (
          <p><strong>You're ready to pay</strong></p>
        ) : (
          <p>
            <strong>Pay securely through PayPal</strong>
            <span>Available payment methods appear in the final step.</span>
          </p>
        )}
      </div>
      <p className="v2-rail-agreement">
        <Link to="/legal/purchase-agreement" target="_blank" rel="noreferrer">
          Vendibook Purchase Agreement
        </Link>
      </p>
      <PostPaymentTimeline mode="sale" fulfillment={fulfillmentSelected} />
    </div>
  );

  const summaryContent = (
    <ListingCheckoutSummary
      imageUrl={coverImage}
      title={listing.title}
      typeLabel={humanizeCategory(listing.category)}
      location={locationLabel}
      counterpartyLabel={sellerName ? `Sold by ${sellerName}` : undefined}
      priceLabel={formatCurrency(priceSale)}
      priceNote={acceptedOfferPrice ? 'Accepted offer price' : undefined}
      meta={summaryMeta}
    >
      {moneyBreakdown}
      {railExtras}
    </ListingCheckoutSummary>
  );

  /** Review → Fulfillment → Details → Agreement → Payment. */
  const wizardSteps = [
    { id: 'review', label: 'Review' },
    { id: 'fulfillment', label: 'Fulfillment' },
    { id: 'details', label: 'Details' },
    { id: 'agreement', label: 'Agreement' },
    { id: 'payment', label: 'Payment' },
  ];

  const goToStep = (step: number) => {
    if (step > furthestStep) return;
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const advanceTo = (step: number) => {
    setFurthestStep((value) => Math.max(value, step));
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const proceedFromFulfillment = () => {
    if (!validateFulfillment()) return;
    prefillFromDeliveryAddress();
    advanceTo(3);
  };

  const proceedFromDetails = () => {
    if (!validateDetails()) return;
    advanceTo(4);
  };

  /** Details → Agreement. Freezes the transaction snapshot first. */
  const proceedToAgreement = async () => {
    if (!validateDetails()) return;
    if (!user) {
      navigate(`/auth?redirect=/checkout/${listingId}`);
      return;
    }
    if (paypalPurchaseBlocked && paymentMethod !== 'cash') {
      toast({ title: 'Seller setup incomplete', description: "This seller hasn't finished payment setup yet.", variant: 'destructive' });
      return;
    }
    const prepared = await prepareAgreement();
    if (prepared) advanceTo(4);
  };

  /** Agreement → Payment. Both consents must be recorded server-side first. */
  const proceedToPayment = async () => {
    const recorded = await recordAgreement();
    if (recorded) advanceTo(5);
  };

  /**
   * Switching the payment method after acceptance changes the frozen
   * transaction snapshot, so the buyer re-accepts on the Agreement step.
   */
  const changePaymentMethod = (method: PaymentMethod) => {
    if (method === paymentMethod) return;
    setPaymentMethod(method);
    setAgreedToTerms(false);
    setPrivacyAccepted(false);
    setPaypalCheckout(null);
    termsGate.reset();
    setCurrentStep(4);
  };

  const displayBuyerName = buyerInfo.businessName
    ? `${buyerInfo.businessName} (${buyerInfo.firstName} ${buyerInfo.lastName})`
    : `${buyerInfo.firstName} ${buyerInfo.lastName}`;
  const displayBuyerAddress = fulfillmentSelected === 'pickup'
    ? fulfillmentDetail
    : [buyerInfo.address1, buyerInfo.address2, buyerInfo.city, buyerInfo.state, buyerInfo.zipCode].filter(Boolean).join(', ');

  const stepConfig: Record<number, { title: string; description?: string }> = {
    1: { title: 'Review your item', description: 'Confirm the listing, seller and price.' },
    2: { title: 'Choose fulfillment', description: 'Select one of the methods offered by this seller.' },
    3: { title: 'Your details', description: 'Contact information for the receipt and handoff.' },
    4: { title: 'Agreements', description: 'Review the terms for this transaction before continuing.' },
    5: {
      title: 'Payment',
      description:
        "Choose how you'd like to pay. Available options are provided through PayPal and may vary by buyer, device, and transaction.",
    },
  };

  const stepBody = (() => {
    if (currentStep === 1) return (
      <div className="sale-review-item">
        {coverImage ? <img src={coverImage} alt={listing.title} /> : null}
        <div>
          <span>{humanizeCategory(listing.category)}</span>
          <h3>{listing.title}</h3>
          {locationLabel ? <p><MapPin aria-hidden /> {locationLabel}</p> : null}
          <div className="sale-review-seller">
            <UserRound aria-hidden />
            <span>Sold by <strong>{sellerName || 'Seller'}</strong></span>
          </div>
          <strong className="sale-review-price">{formatCurrency(priceSale)}</strong>
          {acceptedOfferPrice ? <small>Accepted offer price</small> : null}
          {financingEligible ? <p className="sale-review-finance">Financing may be available through Equinox Funding.</p> : null}
        </div>
      </div>
    );

    if (currentStep === 2) return (
      <PurchaseStepDelivery
        embedded onCanContinueChange={setFulfillmentReady}
        fulfillmentOptions={fulfillmentOptions} fulfillmentSelected={fulfillmentSelected}
        setFulfillmentSelected={setFulfillmentSelected} deliveryAddress={deliveryAddress}
        setDeliveryAddress={setDeliveryAddress} setDeliveryCoords={setDeliveryCoords}
        deliveryFee={currentDeliveryFee} deliveryRateText={deliveryRateLabel(deliveryRate, deliveryFeeType)}
        deliveryFeeType={deliveryFeeType} deliveryRadiusMiles={deliveryRadiusMiles}
        deliveryDistanceInfo={deliveryDistanceInfo} isFreightSellerPaid={isFreightSellerPaid}
        freightCost={freightCost} hasValidEstimate={hasValidEstimate} isEstimating={isEstimating}
        estimateError={estimateError} estimate={estimate} isAddressComplete={isAddressComplete}
        setIsAddressComplete={setIsAddressComplete} fetchFreightEstimate={fetchFreightEstimate}
        clearEstimate={clearEstimate} listingCity={listing.city} listingState={listing.state}
        preferredDate={preferredDate} setPreferredDate={setPreferredDate}
        preferredWindow={preferredWindow} setPreferredWindow={setPreferredWindow}
        onSiteContact={onSiteContact} setOnSiteContact={setOnSiteContact}
        onBack={() => goToStep(1)} onContinue={proceedFromFulfillment}
      />
    );

    if (currentStep === 3) return (
      <PurchaseStepInfo
        embedded buyerInfo={buyerInfo} updateBuyerInfo={updateBuyerInfo}
        deliveryInstructions={deliveryInstructions} setDeliveryInstructions={setDeliveryInstructions}
        fulfillmentSelected={fulfillmentSelected} fieldErrors={fieldErrors}
        touchedFields={touchedFields} setTouchedFields={setTouchedFields}
        hideAddress={fulfillmentSelected === 'pickup'} onBack={() => goToStep(2)} onContinue={proceedToAgreement}
      />
    );

    if (currentStep === 4) return (
      <div className="space-y-6">
        <div className="sale-order-review">
          <section><header><h3>Listing</h3><Button variant="ghost" size="sm" onClick={() => goToStep(1)}><Pencil /> Edit</Button></header><p><strong>{listing.title}</strong><span>{sellerName ? `Sold by ${sellerName}` : 'Vendibook seller'}</span></p></section>
          <section><header><h3>Fulfillment</h3><Button variant="ghost" size="sm" onClick={() => goToStep(2)}><Pencil /> Edit</Button></header><p><strong>{summaryMeta[0].value}</strong><span>{fulfillmentDetail}</span></p></section>
          <section><header><h3>Buyer</h3><Button variant="ghost" size="sm" onClick={() => goToStep(3)}><Pencil /> Edit</Button></header><p><strong>{displayBuyerName}</strong><span>{buyerInfo.email} · {buyerInfo.phone}</span><span>{displayBuyerAddress}</span></p></section>
          <section className="sale-order-review-money"><header><h3>Total</h3></header>{moneyBreakdown}</section>
          <ReferralCodeField programType="purchase" value={referralCode} onChange={(code, valid) => { setReferralCode(code); setReferralValid(valid); }} autoFillFromCookie />
        </div>

        <TransactionAgreementStep
          mode="sale"
          agreement={agreement}
          privacy={privacyConsent}
          agreementAccepted={agreedToTerms}
          privacyAccepted={privacyAccepted}
          onAgreementAcceptedChange={setAgreedToTerms}
          onPrivacyAcceptedChange={setPrivacyAccepted}
          showHeading={false}
        />
      </div>
    );

    return (
      <div className="space-y-5">
        {hasMultiplePaymentOptionsFor(acceptPayPalCheckout && !paypalPurchaseBlocked, acceptCashPayment) ? (
          <PurchaseStepPayment
            embedded
            paymentMethod={paymentMethod}
            setPaymentMethod={changePaymentMethod}
            acceptPayPalCheckout={acceptPayPalCheckout && !paypalPurchaseBlocked}
            acceptCashPayment={acceptCashPayment}
            titleStatus={(listing as { title_status?: string | null }).title_status ?? null}
            hasLien={(listing as { has_lien?: string | null }).has_lien ?? null}
            vin={(listing as { vin?: string | null }).vin ?? null}
            totalPrice={totalPrice}
            submitting={termsGate.preparing}
            onBack={() => goToStep(4)}
            onContinue={() => undefined}
          />
        ) : null}

        {paypalPurchaseBlocked && !acceptCashPayment ? (
          <div className="v2-checkout-unavailable"><ShieldCheck /><div><p className="v2-checkout-unavailable-title">Online payment is not available yet</p><p className="v2-checkout-unavailable-detail">This seller must finish payment setup before checkout can continue.</p></div></div>
        ) : paymentMethod === 'cash' ? (
          <div className="sale-final-confirm">
            <div className="sale-final-facts"><p><span>Total due</span><strong>{formatCurrency(totalPrice)}</strong></p><p><span>Payment</span><strong>Pay in person</strong></p><p><span>Fulfillment</span><strong>{summaryMeta[0].value}</strong></p></div>
            <Button className="w-full" size="lg" onClick={runPurchase} disabled={isPurchasing}>
              {isPurchasing ? 'Placing order…' : 'Place order'}
            </Button>
          </div>
        ) : (
          <PayPalEmbeddedPayment
            target={{ kind: 'sale', id: paypalCheckout?.transactionId ?? '' }}
            key={paypalCheckout?.transactionId ?? 'pending'}
            sellerId={listing.host_id}
            listingHref={`/listing/${listingId}`}
            returnUrl={paypalCheckout?.returnUrl}
            totalUsd={totalPrice}
            blocked={!paypalCheckout}
            blockedReason={isPurchasing ? 'Preparing your payment…' : 'Preparing your payment…'}
          />
        )}

        {financingEligible ? (
          <>
            <FinancingActionPanel listing={listing} host={host} showPaymentLockup={false} />
            <p className="text-xs text-muted-foreground">
              Financing is offered by independent third-party providers and is subject to their approval. Vendibook is
              not the lender.{' '}
              <Link to="/legal/financing-disclosure" target="_blank" rel="noreferrer" className="underline">
                Financing Disclosure
              </Link>
            </p>
          </>
        ) : null}

        <ProtectionDisclosure
          category={listing?.category ?? null}
          mode="sale"
          soldAsBusiness={/turnkey|business (for sale|included|opportunity)/i.test(
            `${listing?.title ?? ''} ${listing?.description ?? ''}`,
          )}
          fulfillment={fulfillmentSelected}
        />
      </div>
    );
  })();

  return (
    <>
      <SEO title={`Checkout - ${listing.title}`} description={`Complete your purchase of ${listing.title}`} />

      <TransactionCheckoutShell
        title="Checkout"
        subtitle={listing.title}
        exitHref={`/listing/${listingId}`}
        summary={summaryContent}
        mobileSummary={<details className="sale-mobile-summary"><summary>Order summary <strong>{formatCurrency(totalPrice)}</strong></summary>{summaryContent}</details>}
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

        <SaleCheckoutWizard
          steps={wizardSteps}
          currentStep={currentStep}
          furthestStep={furthestStep}
          title={stepConfig[currentStep].title}
          description={stepConfig[currentStep].description}
          onStepChange={goToStep}
          onBack={currentStep > 1 ? () => goToStep(currentStep - 1) : undefined}
          onNext={
            currentStep === 1
              ? () => advanceTo(2)
              : currentStep === 2
                ? proceedFromFulfillment
                : currentStep === 3
                  ? proceedToAgreement
                  : currentStep === 4
                    ? proceedToPayment
                    : undefined
          }
          nextLabel={currentStep === 3 ? 'Review agreements' : currentStep === 4 ? 'Accept and continue to payment' : 'Continue'}
          nextDisabled={
            (currentStep === 2 && !fulfillmentReady) ||
            (currentStep === 4 &&
              (!agreedToTerms || !privacyAccepted || !agreement.data || !privacyConsent.data))
          }
          nextBusy={termsGate.preparing || recordingConsent}
          hideFooter={currentStep === 5}
        >
          {stepBody}
        </SaleCheckoutWizard>

      </TransactionCheckoutShell>

    </>
  );
};

const hasMultiplePaymentOptionsFor = (acceptPayPalCheckout: boolean, acceptCashPayment: boolean) =>
  acceptPayPalCheckout && acceptCashPayment;

export default SaleCheckout;
