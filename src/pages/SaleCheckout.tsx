import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useListing } from '@/hooks/useListing';
import { useToast } from '@/hooks/use-toast';
import { useFreightEstimate } from '@/hooks/useFreightEstimate';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { CheckoutOverlay } from '@/components/checkout';
import { ValidatedInput, validators } from '@/components/ui/validated-input';
import { trackFormSubmitConversion } from '@/lib/gtagConversions';
import { calculateDistance } from '@/lib/geolocation';
import SEO from '@/components/SEO';

// Premium shared components
import WizardHeader, { WizardStep } from '@/components/shared/WizardHeader';
import StickySummary from '@/components/shared/StickySummary';

// Step components
import { PurchaseStepDelivery, PurchaseStepInfo, PurchaseStepReview } from '@/components/purchase-wizard';

type FulfillmentSelection = 'pickup' | 'delivery' | 'vendibook_freight';
type CheckoutStep = 'delivery' | 'information' | 'review';

const CHECKOUT_STEPS: WizardStep[] = [
  { step: 1, label: 'Delivery', short: 'Delivery' },
  { step: 2, label: 'Your Info', short: 'Info' },
  { step: 3, label: 'Review', short: 'Review' },
  { step: 4, label: 'Pay', short: 'Pay' },
];

const getStepNumber = (step: CheckoutStep): number => {
  switch (step) {
    case 'delivery': return 1;
    case 'information': return 2;
    case 'review': return 3;
    default: return 1;
  }
};

const SaleCheckout = () => {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { listing, isLoading: isListingLoading, error: listingError } = useListing(listingId || '');
  const { estimate, isLoading: isEstimating, error: estimateError, getEstimate, clearEstimate } = useFreightEstimate();

  // Multi-step state
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('delivery');
  
  // Customer info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  
  // Fulfillment
  const [fulfillmentSelected, setFulfillmentSelected] = useState<FulfillmentSelection>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [isAddressComplete, setIsAddressComplete] = useState(false);
  const [deliveryCoords, setDeliveryCoords] = useState<[number, number] | null>(null);
  
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showCheckoutOverlay, setShowCheckoutOverlay] = useState(false);
  const [addressDebounceTimer, setAddressDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Validation
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Payment method
  type PaymentMethod = 'card' | 'cash';
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

  // Initialize user data
  useEffect(() => {
    if (profile?.full_name && !name) setName(profile.full_name);
    if (user?.email && !email) setEmail(user.email);
  }, [profile, user]);

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

  // Field validators
  const fieldValidators = {
    name: validators.compose(
      validators.required('Full name is required'),
      validators.minLength(2, 'Name must be at least 2 characters')
    ),
    email: validators.compose(
      validators.required('Email is required'),
      validators.email('Please enter a valid email address')
    ),
    phone: validators.compose(
      validators.required('Phone number is required'),
      validators.phone('Please enter a valid phone number')
    ),
    address: validators.required('Address is required'),
  };

  // Derived values
  const priceSale = listing?.price_sale || 0;
  const deliveryFee = listing?.delivery_fee || 0;
  const fulfillmentType = listing?.fulfillment_type || 'pickup';
  const vendibookFreightEnabled = listing?.vendibook_freight_enabled || false;
  const freightPayer = (listing?.freight_payer as 'buyer' | 'seller') || 'buyer';
  const acceptCardPayment = listing?.accept_card_payment ?? true;
  const acceptCashPayment = listing?.accept_cash_payment ?? false;
  const isFreightSellerPaid = vendibookFreightEnabled && freightPayer === 'seller';
  const freightCost = estimate?.total_cost ?? 0;
  const hasValidEstimate = estimate !== null && !estimateError && isAddressComplete;
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
    if (!listing?.address || !destinationAddress.trim() || destinationAddress.length < 10) {
      clearEstimate();
      return;
    }
    
    await getEstimate({
      origin_address: listing.address,
      destination_address: destinationAddress.trim(),
      weight_lbs: listing.weight_lbs || 5000,
      length_inches: listing.length_inches || 240,
      width_inches: listing.width_inches || 96,
      height_inches: listing.height_inches || 120,
      item_category: (listing.freight_category as 'standard' | 'fragile' | 'heavy_equipment' | 'oversized') || 'standard',
    });
  }, [listing, getEstimate, clearEstimate]);

  useEffect(() => {
    if (fulfillmentSelected !== 'vendibook_freight') {
      clearEstimate();
      return;
    }
    
    if (addressDebounceTimer) clearTimeout(addressDebounceTimer);
    
    const timer = setTimeout(() => {
      if (deliveryAddress.trim().length >= 10) {
        fetchFreightEstimate(deliveryAddress);
      }
    }, 800);
    
    setAddressDebounceTimer(timer);
    return () => { if (timer) clearTimeout(timer); };
  }, [deliveryAddress, fulfillmentSelected]);

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
    
    if (step === 'information') {
      const nameError = fieldValidators.name(name);
      const emailError = fieldValidators.email(email);
      const phoneError = fieldValidators.phone(phone);
      const addressError = fieldValidators.address(address);
      
      setFieldErrors({ name: nameError, email: emailError, phone: phoneError, address: addressError });
      setTouchedFields(new Set(['name', 'email', 'phone', 'address']));
      
      const firstError = nameError || emailError || phoneError || addressError;
      if (firstError) {
        toast({ title: 'Missing information', description: firstError, variant: 'destructive' });
        return false;
      }
      return true;
    }
    
    return true;
  };

  const handlePurchase = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!priceSale || !listingId || !listing?.host_id) return;

    if (!agreedToTerms) {
      toast({ title: 'Terms required', description: 'Please agree to the Terms of Service.', variant: 'destructive' });
      return;
    }

    // Handle cash payment
    if (paymentMethod === 'cash') {
      setIsPurchasing(true);
      try {
        const isVendibookFreight = fulfillmentSelected === 'vendibook_freight';
        
        const { data: txData, error: txError } = await supabase
          .from('sale_transactions')
          .insert({
            listing_id: listingId,
            buyer_id: user.id,
            seller_id: listing.host_id,
            amount: priceSale,
            delivery_fee: fulfillmentSelected === 'delivery' ? deliveryFee : 0,
            freight_cost: isVendibookFreight ? freightCost : 0,
            fulfillment_type: isVendibookFreight ? 'vendibook_freight' : fulfillmentSelected,
            delivery_address: (fulfillmentSelected === 'delivery' || isVendibookFreight) ? deliveryAddress.trim() : null,
            delivery_instructions: (fulfillmentSelected === 'delivery' || isVendibookFreight) ? deliveryInstructions.trim() : null,
            buyer_name: name.trim(),
            buyer_email: email.trim(),
            buyer_phone: phone.trim() || null,
            status: 'pending_cash',
            platform_fee: 0,
            seller_payout: priceSale,
          })
          .select('id')
          .single();

        if (txError) throw txError;

        try {
          await supabase.functions.invoke('send-sale-notification', {
            body: { transaction_id: txData.id, notification_type: 'cash_purchase_request' },
          });
        } catch (notifError) {
          console.error('Failed to send notification:', notifError);
        }

        trackFormSubmitConversion({ form_type: 'purchase_cash', listing_id: listingId });
        toast({ title: 'Purchase request submitted!', description: 'The seller will contact you.' });
        navigate(`/order-tracking/${txData.id}`);
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

    // Handle card payment
    setIsPurchasing(true);
    setShowCheckoutOverlay(true);
    
    try {
      const isVendibookFreight = fulfillmentSelected === 'vendibook_freight';
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          listing_id: listingId,
          mode: 'sale',
          amount: priceSale,
          delivery_fee: fulfillmentSelected === 'delivery' ? deliveryFee : 0,
          fulfillment_type: isVendibookFreight ? 'vendibook_freight' : fulfillmentSelected,
          delivery_address: (fulfillmentSelected === 'delivery' || isVendibookFreight) ? deliveryAddress.trim() : null,
          delivery_instructions: (fulfillmentSelected === 'delivery' || isVendibookFreight) ? deliveryInstructions.trim() : null,
          buyer_name: name.trim(),
          buyer_email: email.trim(),
          buyer_phone: phone.trim() || null,
          vendibook_freight_enabled: isVendibookFreight,
          freight_payer: isVendibookFreight ? freightPayer : 'buyer',
          freight_cost: isVendibookFreight ? freightCost : 0,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      trackFormSubmitConversion({ form_type: 'purchase', listing_id: listingId });
      window.location.href = data.url;
    } catch (error) {
      setShowCheckoutOverlay(false);
      toast({
        title: 'Purchase Error',
        description: error instanceof Error ? error.message : 'Failed to start checkout',
        variant: 'destructive',
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  // Loading state
  if (isListingLoading) {
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

  const hasMultiplePaymentOptions = acceptCardPayment && acceptCashPayment;
  const currentStepNumber = getStepNumber(currentStep);

  // Price lines for sticky summary
  const priceLines = [
    { label: 'Item price', amount: priceSale },
    ...(currentDeliveryFee > 0 ? [{
      label: fulfillmentSelected === 'vendibook_freight' ? 'Freight' : 'Delivery',
      amount: currentDeliveryFee,
      isDelivery: true,
    }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO title={`Checkout - ${listing.title}`} description={`Complete your purchase of ${listing.title}`} />
      <Header />
      
      <main className="flex-1 py-6">
        <div className="container max-w-6xl mx-auto px-4">
          {/* Back Button */}
          <button
            onClick={() => navigate(`/listing/${listingId}`)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to listing
          </button>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Main Wizard - Left Side */}
            <div className="lg:col-span-3">
              <div className="bg-card border-2 border-border rounded-2xl shadow-xl overflow-hidden">
                {/* Premium Wizard Header */}
                <WizardHeader
                  mode="checkout"
                  currentStep={currentStepNumber}
                  totalSteps={4}
                  steps={CHECKOUT_STEPS}
                />

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
                          onContinue={() => {
                            if (validateStep('delivery')) {
                              setCurrentStep('information');
                            }
                          }}
                        />
                      )}

                      {currentStep === 'information' && (
                        <PurchaseStepInfo
                          name={name}
                          setName={setName}
                          email={email}
                          setEmail={setEmail}
                          phone={phone}
                          setPhone={setPhone}
                          address={address}
                          setAddress={setAddress}
                          deliveryInstructions={deliveryInstructions}
                          setDeliveryInstructions={setDeliveryInstructions}
                          fulfillmentSelected={fulfillmentSelected}
                          fieldErrors={fieldErrors}
                          touchedFields={touchedFields}
                          setTouchedFields={setTouchedFields}
                          onBack={() => setCurrentStep('delivery')}
                          onContinue={() => {
                            if (validateStep('information')) {
                              setCurrentStep('review');
                            }
                          }}
                        />
                      )}

                      {currentStep === 'review' && (
                        <PurchaseStepReview
                          listing={listing}
                          priceSale={priceSale}
                          currentDeliveryFee={currentDeliveryFee}
                          totalPrice={totalPrice}
                          fulfillmentSelected={fulfillmentSelected}
                          deliveryAddress={deliveryAddress}
                          name={name}
                          email={email}
                          phone={phone}
                          address={address}
                          hasValidEstimate={hasValidEstimate}
                          estimate={estimate}
                          paymentMethod={paymentMethod}
                          setPaymentMethod={setPaymentMethod}
                          hasMultiplePaymentOptions={hasMultiplePaymentOptions}
                          agreedToTerms={agreedToTerms}
                          setAgreedToTerms={setAgreedToTerms}
                          isPurchasing={isPurchasing}
                          onBack={() => setCurrentStep('information')}
                          onEditDelivery={() => setCurrentStep('delivery')}
                          onEditInfo={() => setCurrentStep('information')}
                          onSubmit={handlePurchase}
                        />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Sticky Summary - Right Side (Desktop Only) */}
            <div className="lg:col-span-2 hidden lg:block">
              <div className="sticky top-24">
                <StickySummary
                  imageUrl={listing.cover_image_url || listing.image_urls?.[0]}
                  title={listing.title}
                  category={listing.category}
                  itemId={listing.id}
                  priceLines={priceLines}
                  totalToday={totalPrice}
                  fulfillmentType={fulfillmentSelected}
                  deliveryAddress={deliveryAddress}
                  mode="checkout"
                  showWhatsIncluded={currentStep !== 'review'}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <CheckoutOverlay isVisible={showCheckoutOverlay} />
    </div>
  );
};

export default SaleCheckout;
