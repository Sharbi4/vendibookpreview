import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useListing } from '@/hooks/useListing';
import { useToast } from '@/hooks/use-toast';
import { useFreightEstimate } from '@/hooks/useFreightEstimate';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { 
  ShieldCheck, Loader2, MapPin, Truck, Calculator, AlertCircle, 
  CreditCard, Banknote, Check, ArrowLeft, Package, Clock, 
  DollarSign, Handshake, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { CheckoutOverlay } from '@/components/checkout';
import { FreightInfoCard } from '@/components/freight';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { ValidatedInput, validators } from '@/components/ui/validated-input';
import { AddressAutocomplete } from '@/components/listing-detail/AddressAutocomplete';
import { trackFormSubmitConversion } from '@/lib/gtagConversions';
import { calculateDistance } from '@/lib/geolocation';
import SEO from '@/components/SEO';

type FulfillmentSelection = 'pickup' | 'delivery' | 'vendibook_freight';
type CheckoutStep = 'delivery' | 'information';

const SaleCheckout = () => {
  const { listingId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { listing, host, isLoading: isListingLoading, error: listingError } = useListing(listingId || '');
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
  const [deliveryCoords, setDeliveryCoords] = useState<[number, number] | null>(null); // [lng, lat]
  
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showCheckoutOverlay, setShowCheckoutOverlay] = useState(false);
  const [addressDebounceTimer, setAddressDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Inline validation errors
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    deliveryAddress?: string;
  }>({});
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
      
      // Set payment method based on listing options
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

  // Calculate distance from listing to delivery address for local delivery
  const deliveryDistanceInfo = useMemo(() => {
    if (fulfillmentSelected !== 'delivery' || !deliveryCoords || !listing?.latitude || !listing?.longitude) {
      return { distance: null, isOutsideRadius: false };
    }
    
    const distance = calculateDistance(
      listing.latitude,
      listing.longitude,
      deliveryCoords[1], // lat
      deliveryCoords[0]  // lng
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

  const validateForm = (): string | null => {
    const nameError = fieldValidators.name(name);
    const emailError = fieldValidators.email(email);
    const phoneError = fieldValidators.phone(phone);
    const addressError = fieldValidators.address(address);
    
    let deliveryAddressError: string | undefined;
    if (fulfillmentSelected === 'delivery' || fulfillmentSelected === 'vendibook_freight') {
      if (!deliveryAddress.trim()) deliveryAddressError = 'Delivery address is required';
      else if (fulfillmentSelected === 'vendibook_freight' && !isAddressComplete) {
        deliveryAddressError = 'Please select a complete address';
      }
    }
    
    setFieldErrors({
      name: nameError,
      email: emailError,
      phone: phoneError,
      address: addressError,
      deliveryAddress: deliveryAddressError,
    });
    
    setTouchedFields(new Set(['name', 'email', 'phone', 'address', 'deliveryAddress']));
    
    if (nameError) return nameError;
    if (addressError) return addressError;
    if (emailError) return emailError;
    if (phoneError) return phoneError;
    if (deliveryAddressError) return deliveryAddressError;
    if (!agreedToTerms) return 'Please agree to the Terms of Service';
    return null;
  };

  const handlePurchase = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!priceSale || !listingId || !listing?.host_id) return;

    const validationError = validateForm();
    if (validationError) {
      toast({
        title: 'Missing information',
        description: validationError,
        variant: 'destructive',
      });
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

  if (isListingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (listingError || !listing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Listing not found</h2>
          <Button onClick={() => navigate('/browse')}>Browse Listings</Button>
        </div>
      </div>
    );
  }

  const hasMultiplePaymentOptions = acceptCardPayment && acceptCashPayment;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO title={`Checkout - ${listing.title}`} description={`Complete your purchase of ${listing.title}`} />
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container max-w-4xl mx-auto px-4">
          {/* Back Button */}
          <button
            onClick={() => navigate(`/listing/${listingId}`)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to listing
          </button>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Main Form - Left Side */}
            <div className="lg:col-span-3 space-y-8">
              {/* Step Indicator */}
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                  currentStep === 'delivery' 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-primary/20 text-primary"
                )}>
                  {currentStep === 'information' ? <Check className="w-4 h-4" /> : '1'}
                </div>
                <span className={cn("text-sm font-medium", currentStep === 'delivery' ? "text-foreground" : "text-muted-foreground")}>
                  Delivery
                </span>
                <div className="h-px flex-1 bg-border" />
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                  currentStep === 'information' 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                )}>
                  2
                </div>
                <span className={cn("text-sm font-medium", currentStep === 'information' ? "text-foreground" : "text-muted-foreground")}>
                  Your Information
                </span>
              </div>

              {/* STEP 1: Delivery Options */}
              {currentStep === 'delivery' && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Delivery Options</h2>
                  
                  <div className="space-y-3">
                    {fulfillmentOptions.includes('pickup') && (
                      <button
                        type="button"
                        onClick={() => setFulfillmentSelected('pickup')}
                        className={cn(
                          "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                          fulfillmentSelected === 'pickup' 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className={cn(
                          "flex items-center justify-center w-12 h-12 rounded-lg",
                          fulfillmentSelected === 'pickup' ? "bg-primary/10" : "bg-muted"
                        )}>
                          <MapPin className={cn("h-6 w-6", fulfillmentSelected === 'pickup' ? "text-primary" : "text-muted-foreground")} />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-foreground">Local Pickup</div>
                          <div className="text-sm text-muted-foreground">Pick up at seller's location</div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-emerald-600">FREE</span>
                        </div>
                        {fulfillmentSelected === 'pickup' && (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </div>
                        )}
                      </button>
                    )}

                    {fulfillmentOptions.includes('delivery') && (
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => setFulfillmentSelected('delivery')}
                          className={cn(
                            "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                            fulfillmentSelected === 'delivery' 
                              ? "border-primary bg-primary/5" 
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <div className={cn(
                            "flex items-center justify-center w-12 h-12 rounded-lg",
                            fulfillmentSelected === 'delivery' ? "bg-primary/10" : "bg-muted"
                          )}>
                            <Truck className={cn("h-6 w-6", fulfillmentSelected === 'delivery' ? "text-primary" : "text-muted-foreground")} />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-foreground">Local Delivery</div>
                            <div className="text-sm text-muted-foreground">
                              {listing.delivery_radius_miles ? `Within ${listing.delivery_radius_miles} miles` : 'Seller delivers to you'}
                            </div>
                          </div>
                          <div className="text-right">
                            {deliveryFee ? (
                              <span className="text-sm font-medium text-foreground">+${deliveryFee.toLocaleString()}</span>
                            ) : (
                              <span className="text-sm font-medium text-emerald-600">FREE</span>
                            )}
                          </div>
                          {fulfillmentSelected === 'delivery' && (
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-4 h-4 text-primary-foreground" />
                            </div>
                          )}
                        </button>
                        
                        {/* Show delivery address input when delivery is selected */}
                        {fulfillmentSelected === 'delivery' && (
                          <div className="ml-16 p-4 bg-muted/30 rounded-lg border border-border space-y-3">
                            <div>
                              <Label htmlFor="deliveryAddressStep1" className="text-sm font-medium mb-2 block">
                                Delivery Address *
                              </Label>
                              <AddressAutocomplete
                                id="deliveryAddressStep1"
                                value={deliveryAddress}
                                onChange={(value) => {
                                  setDeliveryAddress(value);
                                  setDeliveryCoords(null);
                                }}
                                onAddressSelect={(addr) => {
                                  setDeliveryAddress(addr.fullAddress);
                                  setDeliveryCoords(addr.coordinates);
                                }}
                                placeholder="Enter your delivery address"
                              />
                            </div>
                            
                            {/* Distance and radius warning */}
                            {deliveryDistanceInfo.distance !== null && (
                              <div className={cn(
                                "flex items-start gap-2 p-3 rounded-lg text-sm",
                                deliveryDistanceInfo.isOutsideRadius 
                                  ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                                  : "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
                              )}>
                                {deliveryDistanceInfo.isOutsideRadius ? (
                                  <>
                                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="font-medium text-amber-800 dark:text-amber-300">
                                        Outside delivery zone
                                      </p>
                                      <p className="text-amber-700 dark:text-amber-400 text-xs mt-1">
                                        Your address is {deliveryDistanceInfo.distance} miles away, but the seller only delivers within {deliveryRadiusMiles} miles. 
                                        You may want to contact the seller or choose a different delivery option.
                                      </p>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="font-medium text-emerald-800 dark:text-emerald-300">
                                        Within delivery zone
                                      </p>
                                      <p className="text-emerald-700 dark:text-emerald-400 text-xs mt-1">
                                        {deliveryDistanceInfo.distance} miles from seller
                                        {deliveryRadiusMiles && ` (max ${deliveryRadiusMiles} miles)`}
                                      </p>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                            
                            {deliveryFee > 0 && (
                              <div className="flex items-center justify-between text-sm p-2 bg-primary/5 rounded-lg">
                                <span className="text-muted-foreground">Delivery Fee</span>
                                <span className="font-semibold text-foreground">+${deliveryFee.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {fulfillmentOptions.includes('vendibook_freight') && (
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => setFulfillmentSelected('vendibook_freight')}
                          className={cn(
                            "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                            fulfillmentSelected === 'vendibook_freight' 
                              ? "border-primary bg-primary/5" 
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <div className={cn(
                            "flex items-center justify-center w-12 h-12 rounded-lg",
                            fulfillmentSelected === 'vendibook_freight' ? "bg-primary/10" : "bg-muted"
                          )}>
                            <Package className={cn("h-6 w-6", fulfillmentSelected === 'vendibook_freight' ? "text-primary" : "text-muted-foreground")} />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-foreground">Vendibook Freight</div>
                            <div className="text-sm text-muted-foreground">Nationwide shipping with tracking</div>
                          </div>
                          <div className="text-right">
                            {isFreightSellerPaid ? (
                              <span className="text-sm font-medium text-emerald-600">FREE</span>
                            ) : hasValidEstimate ? (
                              <span className="text-sm font-medium text-foreground">+${freightCost.toLocaleString()}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Enter address for quote</span>
                            )}
                          </div>
                          {fulfillmentSelected === 'vendibook_freight' && (
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-4 h-4 text-primary-foreground" />
                            </div>
                          )}
                        </button>
                        
                        {/* Show address input and freight estimate when freight is selected */}
                        {fulfillmentSelected === 'vendibook_freight' && (
                          <div className="ml-16 p-4 bg-muted/30 rounded-lg border border-border space-y-3">
                            <div>
                              <Label htmlFor="freightAddressStep1" className="text-sm font-medium mb-2 block">
                                Delivery Address *
                              </Label>
                              <AddressAutocomplete
                                id="freightAddressStep1"
                                value={deliveryAddress}
                                onChange={(value) => {
                                  setDeliveryAddress(value);
                                  setIsAddressComplete(false);
                                  clearEstimate();
                                }}
                                onAddressSelect={(addr) => {
                                  setDeliveryAddress(addr.fullAddress);
                                  setIsAddressComplete(addr.validation.isComplete);
                                  if (addr.validation.isComplete) {
                                    fetchFreightEstimate(addr.fullAddress);
                                  }
                                }}
                                onValidationChange={(validation) => {
                                  setIsAddressComplete(validation?.isComplete ?? false);
                                }}
                                placeholder="Enter delivery address for quote"
                                requireComplete={true}
                              />
                            </div>
                            
                            {isEstimating && (
                              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                <span className="text-sm text-muted-foreground">Calculating freight rate at $4.50/mile...</span>
                              </div>
                            )}
                            
                            {hasValidEstimate && !isEstimating && (
                              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="text-sm font-medium text-foreground">Freight Cost</span>
                                    <div className="text-xs text-muted-foreground">
                                      {estimate?.distance_miles?.toFixed(0)} miles • Est. {estimate?.estimated_transit_days.min}-{estimate?.estimated_transit_days.max} days
                                    </div>
                                  </div>
                                  <span className={cn(
                                    "text-lg font-semibold",
                                    isFreightSellerPaid ? "text-emerald-600" : "text-foreground"
                                  )}>
                                    {isFreightSellerPaid ? 'FREE' : `+$${freightCost.toLocaleString()}`}
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            {estimateError && (
                              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                                <AlertCircle className="h-4 w-4" />
                                <span>{estimateError}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Price Summary for Step 1 */}
                  <div className="mt-6 pt-4 border-t border-border space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Item price</span>
                      <span className="text-foreground">${priceSale.toLocaleString()}</span>
                    </div>
                    {fulfillmentSelected === 'delivery' && deliveryFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Delivery fee</span>
                        <span className="text-foreground">+${deliveryFee.toLocaleString()}</span>
                      </div>
                    )}
                    {fulfillmentSelected === 'vendibook_freight' && hasValidEstimate && !isFreightSellerPaid && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Freight shipping</span>
                        <span className="text-foreground">+${freightCost.toLocaleString()}</span>
                      </div>
                    )}
                    {fulfillmentSelected === 'vendibook_freight' && hasValidEstimate && isFreightSellerPaid && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Freight shipping</span>
                        <span className="text-emerald-600 font-medium">FREE (Seller pays)</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold pt-2 border-t border-border">
                      <span>Total</span>
                      <span className="text-primary">${totalPrice.toLocaleString()}</span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => setCurrentStep('information')}
                    className="w-full mt-4" 
                    size="lg"
                    disabled={
                      (fulfillmentSelected === 'vendibook_freight' && !hasValidEstimate && !isFreightSellerPaid) ||
                      (fulfillmentSelected === 'delivery' && !deliveryAddress.trim()) ||
                      isEstimating
                    }
                  >
                    {isEstimating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Calculating...
                      </>
                    ) : (
                      'Continue'
                    )}
                  </Button>
                </div>
              )}

              {/* STEP 2: Your Information */}
              {currentStep === 'information' && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <button
                    type="button"
                    onClick={() => setCurrentStep('delivery')}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to delivery options
                  </button>

                  <h2 className="text-lg font-semibold text-foreground mb-6">Your Information</h2>
                  
                  <div className="space-y-4">
                    <ValidatedInput
                      id="name"
                      label="Full Name"
                      value={name}
                      onChange={setName}
                      placeholder="John Doe"
                      error={fieldErrors.name}
                      touched={touchedFields.has('name')}
                      required
                    />

                    <ValidatedInput
                      id="address"
                      label="Address"
                      value={address}
                      onChange={setAddress}
                      placeholder="123 Main St, City, State ZIP"
                      error={fieldErrors.address}
                      touched={touchedFields.has('address')}
                      required
                    />

                    <ValidatedInput
                      id="email"
                      label="Email"
                      type="email"
                      value={email}
                      onChange={setEmail}
                      placeholder="you@example.com"
                      error={fieldErrors.email}
                      touched={touchedFields.has('email')}
                      required
                    />

                    <ValidatedInput
                      id="phone"
                      label="Phone Number"
                      type="tel"
                      value={phone}
                      onChange={setPhone}
                      placeholder="(555) 123-4567"
                      formatPhone
                      error={fieldErrors.phone}
                      touched={touchedFields.has('phone')}
                      required
                    />

                    {/* Delivery Address for delivery/freight */}
                    {(fulfillmentSelected === 'delivery' || fulfillmentSelected === 'vendibook_freight') && (
                      <div>
                        <Label htmlFor="deliveryAddress" className="text-sm font-medium mb-2 block">
                          Delivery Address *
                        </Label>
                        {fulfillmentSelected === 'vendibook_freight' ? (
                          <AddressAutocomplete
                            id="deliveryAddress"
                            value={deliveryAddress}
                            onChange={(value) => {
                              setDeliveryAddress(value);
                              setIsAddressComplete(false);
                              clearEstimate();
                            }}
                            onAddressSelect={(addr) => {
                              setDeliveryAddress(addr.fullAddress);
                              setIsAddressComplete(addr.validation.isComplete);
                              if (addr.validation.isComplete) {
                                fetchFreightEstimate(addr.fullAddress);
                              }
                            }}
                            onValidationChange={(validation) => {
                              setIsAddressComplete(validation?.isComplete ?? false);
                            }}
                            placeholder="Enter delivery address"
                            requireComplete={true}
                          />
                        ) : (
                          <ValidatedInput
                            id="deliveryAddress"
                            label="Delivery Address"
                            value={deliveryAddress}
                            onChange={setDeliveryAddress}
                            placeholder="Enter delivery address"
                            error={fieldErrors.deliveryAddress}
                            touched={touchedFields.has('deliveryAddress')}
                            required
                          />
                        )}
                      </div>
                    )}

                    {/* Freight Estimate */}
                    {fulfillmentSelected === 'vendibook_freight' && (
                      <>
                        {isEstimating && (
                          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span className="text-sm text-muted-foreground">Calculating freight...</span>
                          </div>
                        )}
                        
                        {hasValidEstimate && !isEstimating && (
                          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Freight Estimate</span>
                              <span className={isFreightSellerPaid ? 'text-emerald-600 font-semibold' : 'font-semibold'}>
                                {isFreightSellerPaid ? 'FREE' : `$${freightCost.toFixed(2)}`}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Est. {estimate?.estimated_transit_days.min}-{estimate?.estimated_transit_days.max} business days
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Delivery Instructions */}
                    {(fulfillmentSelected === 'delivery' || fulfillmentSelected === 'vendibook_freight') && (
                      <div>
                        <Label htmlFor="deliveryInstructions" className="text-sm font-medium mb-2 block">
                          Delivery Instructions (optional)
                        </Label>
                        <Textarea
                          id="deliveryInstructions"
                          value={deliveryInstructions}
                          onChange={(e) => setDeliveryInstructions(e.target.value)}
                          placeholder="Gate code, parking instructions, etc."
                          rows={2}
                        />
                      </div>
                    )}

                    {/* Payment Method */}
                    {hasMultiplePaymentOptions && (
                      <div className="space-y-3 pt-4 border-t border-border">
                        <Label className="text-sm font-medium">Payment Method</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('card')}
                            className={cn(
                              "flex items-center gap-2 p-3 rounded-lg border-2 transition-all",
                              paymentMethod === 'card' 
                                ? "border-primary bg-primary/5" 
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            <CreditCard className={cn("h-5 w-5", paymentMethod === 'card' ? "text-primary" : "text-muted-foreground")} />
                            <span className="text-sm font-medium">Pay via Card</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('cash')}
                            className={cn(
                              "flex items-center gap-2 p-3 rounded-lg border-2 transition-all",
                              paymentMethod === 'cash' 
                                ? "border-primary bg-primary/5" 
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            <Banknote className={cn("h-5 w-5", paymentMethod === 'cash' ? "text-primary" : "text-muted-foreground")} />
                            <span className="text-sm font-medium">Pay in Person</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Terms */}
                    <div className="flex items-start gap-3 pt-4">
                      <Checkbox
                        id="terms"
                        checked={agreedToTerms}
                        onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                      />
                      <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight">
                        I agree to the{' '}
                        <a href="/terms" target="_blank" className="text-primary hover:underline">
                          Terms of Service
                        </a>
                      </label>
                    </div>

                    {/* Submit */}
                    <Button
                      onClick={handlePurchase}
                      disabled={isPurchasing || !agreedToTerms}
                      className="w-full"
                      size="lg"
                    >
                      {isPurchasing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {paymentMethod === 'cash' 
                        ? `Submit Request - $${totalPrice.toLocaleString()}`
                        : `Proceed to Payment - $${totalPrice.toLocaleString()}`
                      }
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Side - Summary + Timeline */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Summary */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-4">Order Summary</h3>
                
                <div className="flex gap-4 mb-4">
                  <img 
                    src={listing.cover_image_url || listing.image_urls?.[0] || '/placeholder.svg'}
                    alt={listing.title}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground text-sm line-clamp-2">{listing.title}</h4>
                    <p className="text-xs text-muted-foreground capitalize mt-1">
                      {listing.category?.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Item price</span>
                    <span className="text-foreground">${priceSale.toLocaleString()}</span>
                  </div>
                  {currentDeliveryFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {fulfillmentSelected === 'vendibook_freight' ? 'Freight' : 'Delivery'}
                      </span>
                      <span className="text-foreground">+${currentDeliveryFee.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold pt-2 border-t border-border">
                    <span>Total</span>
                    <span className="text-primary">${totalPrice.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-center mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Protected by Vendibook escrow</span>
                </div>
              </div>

              {/* How It Works Timeline */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-4">How It Works</h3>
                
                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <DollarSign className="h-4 w-4 text-primary" />
                      </div>
                      <div className="w-0.5 flex-1 bg-border mt-2" />
                    </div>
                    <div className="pb-4">
                      <h4 className="font-medium text-foreground text-sm">Submit Payment Hold</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your payment is securely held in escrow. Funds are not released to the seller yet.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Handshake className="h-4 w-4 text-primary" />
                      </div>
                      <div className="w-0.5 flex-1 bg-border mt-2" />
                    </div>
                    <div className="pb-4">
                      <h4 className="font-medium text-foreground text-sm">Meet & Confirm Sale</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Meet the seller, inspect the item, and confirm everything is as described.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground text-sm">Funds Released</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Once both buyer and seller confirm, funds are released to the seller. Done!
                      </p>
                    </div>
                  </div>
                </div>
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
