import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useFreightEstimate } from '@/hooks/useFreightEstimate';
import { supabase } from '@/integrations/supabase/client';
import { ShieldCheck, Loader2, MapPin, Truck, Calculator, AlertCircle, CreditCard, Banknote, Check, ArrowLeft, Package } from 'lucide-react';
import { CheckoutOverlay } from '@/components/checkout';
import { FreightInfoCard } from '@/components/freight';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { ValidatedInput, validators } from '@/components/ui/validated-input';
import { AddressAutocomplete } from './AddressAutocomplete';
import type { FulfillmentType } from '@/types/listing';
import { trackFormSubmitConversion } from '@/lib/gtagConversions';

interface InquiryFormProps {
  listingId: string;
  hostId: string;
  priceSale: number | null;
  fulfillmentType?: FulfillmentType;
  deliveryFee?: number | null;
  deliveryRadiusMiles?: number | null;
  pickupLocation?: string | null;
  vendibookFreightEnabled?: boolean;
  freightPayer?: 'buyer' | 'seller';
  // Origin address for freight calculation (listing location)
  originAddress?: string | null;
  // Item dimensions for freight calculation
  weightLbs?: number | null;
  lengthInches?: number | null;
  widthInches?: number | null;
  heightInches?: number | null;
  freightCategory?: string | null;
  // Payment options
  acceptCardPayment?: boolean;
  acceptCashPayment?: boolean;
}

type FulfillmentSelection = 'pickup' | 'delivery' | 'vendibook_freight';
type CheckoutStep = 'delivery' | 'information';

const InquiryForm = ({ 
  listingId,
  hostId,
  priceSale,
  fulfillmentType = 'pickup',
  deliveryFee,
  deliveryRadiusMiles,
  pickupLocation,
  vendibookFreightEnabled = false,
  freightPayer = 'buyer',
  originAddress,
  weightLbs,
  lengthInches,
  widthInches,
  heightInches,
  freightCategory,
  acceptCardPayment = true,
  acceptCashPayment = false,
}: InquiryFormProps) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { estimate, isLoading: isEstimating, error: estimateError, getEstimate, clearEstimate } = useFreightEstimate();
  
  // Multi-step state
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('delivery');
  
  // Customer info
  const [name, setName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  
  // Fulfillment
  const [fulfillmentSelected, setFulfillmentSelected] = useState<FulfillmentSelection>(() => {
    // Default to Vendibook freight if enabled
    if (vendibookFreightEnabled) return 'vendibook_freight';
    if (fulfillmentType === 'delivery') return 'delivery';
    return 'pickup';
  });
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [isAddressComplete, setIsAddressComplete] = useState(false);
  const [addressValidationMessage, setAddressValidationMessage] = useState<string | null>(null);
  
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showCheckoutOverlay, setShowCheckoutOverlay] = useState(false);
  const [addressDebounceTimer, setAddressDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Inline validation errors and touched state
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    deliveryAddress?: string;
    terms?: string;
  }>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Payment method selection
  type PaymentMethod = 'card' | 'cash';
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => {
    // Default to card if available, otherwise cash
    if (acceptCardPayment) return 'card';
    if (acceptCashPayment) return 'cash';
    return 'card';
  });

  // Determine available payment options
  const hasMultiplePaymentOptions = acceptCardPayment && acceptCashPayment;
  const onlyCardPayment = acceptCardPayment && !acceptCashPayment;
  const onlyCashPayment = acceptCashPayment && !acceptCardPayment;

  const isFreightSellerPaid = vendibookFreightEnabled && freightPayer === 'seller';
  
  // Get freight cost - use estimate if available, otherwise fallback
  const freightCost = estimate?.total_cost ?? 0;
  const hasValidEstimate = estimate !== null && !estimateError && isAddressComplete;

  // Field validators using shared validators
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
      validators.phone('Please enter a valid phone number (at least 10 digits)')
    ),
  };

  // Determine available fulfillment options
  const getAvailableFulfillmentOptions = (): FulfillmentSelection[] => {
    const options: FulfillmentSelection[] = [];
    
    // If Vendibook freight is enabled, add it as an option
    if (vendibookFreightEnabled) {
      options.push('vendibook_freight');
    }
    
    // Add local pickup/delivery options based on fulfillment type
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

  // Debounced freight estimation when address changes
  const fetchFreightEstimate = useCallback(async (address: string) => {
    if (!originAddress || !address.trim() || address.length < 10) {
      clearEstimate();
      return;
    }
    
    await getEstimate({
      origin_address: originAddress,
      destination_address: address.trim(),
      // Use listing dimensions if available, otherwise use defaults
      weight_lbs: weightLbs || 5000,
      length_inches: lengthInches || 240,
      width_inches: widthInches || 96,
      height_inches: heightInches || 120,
      item_category: (freightCategory as 'standard' | 'fragile' | 'heavy_equipment' | 'oversized') || 'standard',
    });
  }, [originAddress, weightLbs, lengthInches, widthInches, heightInches, freightCategory, getEstimate, clearEstimate]);

  // Trigger freight estimate when address changes (with debounce)
  useEffect(() => {
    if (fulfillmentSelected !== 'vendibook_freight') {
      clearEstimate();
      return;
    }
    
    if (addressDebounceTimer) {
      clearTimeout(addressDebounceTimer);
    }
    
    const timer = setTimeout(() => {
      if (deliveryAddress.trim().length >= 10) {
        fetchFreightEstimate(deliveryAddress);
      }
    }, 800);
    
    setAddressDebounceTimer(timer);
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [deliveryAddress, fulfillmentSelected]);

  // Calculate total price including delivery if applicable
  const getDeliveryFeeForSelection = (): number => {
    if (fulfillmentSelected === 'vendibook_freight') {
      // If seller pays freight, buyer sees $0
      return isFreightSellerPaid ? 0 : freightCost;
    }
    if (fulfillmentSelected === 'delivery' && deliveryFee) {
      return deliveryFee;
    }
    return 0;
  };
  
  const currentDeliveryFee = getDeliveryFeeForSelection();
  const totalPrice = (priceSale || 0) + currentDeliveryFee;

  // Handle field updates with validation
  const updateField = (field: 'name' | 'email' | 'phone', value: string) => {
    if (field === 'name') setName(value);
    else if (field === 'email') setEmail(value);
    else if (field === 'phone') setPhone(value);
    
    // Validate on change if already touched
    if (touchedFields.has(field)) {
      const validator = fieldValidators[field];
      if (validator) {
        const error = validator(value);
        setFieldErrors(prev => ({ ...prev, [field]: error }));
      }
    }
  };

  const markTouched = (field: 'name' | 'email' | 'phone') => {
    setTouchedFields(prev => new Set(prev).add(field));
    const validator = fieldValidators[field];
    const value = field === 'name' ? name : field === 'email' ? email : phone;
    if (validator) {
      const error = validator(value);
      setFieldErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const validateDeliveryAddress = (value: string): string | undefined => {
    if (fulfillmentSelected === 'delivery' || fulfillmentSelected === 'vendibook_freight') {
      if (!value.trim()) return 'Delivery address is required';
      if (fulfillmentSelected === 'vendibook_freight' && !isAddressComplete) {
        return 'Please select a complete address with street, city, state, and ZIP code';
      }
    }
    return undefined;
  };

  const validateForm = (): string | null => {
    // Validate all fields and collect errors
    const nameError = fieldValidators.name(name);
    const emailError = fieldValidators.email(email);
    const phoneError = fieldValidators.phone(phone);
    const addressError = validateDeliveryAddress(deliveryAddress);
    
    // Update all field errors
    setFieldErrors({
      name: nameError,
      email: emailError,
      phone: phoneError,
      deliveryAddress: addressError,
      terms: !agreedToTerms ? 'You must agree to the Terms of Service' : undefined
    });
    
    // Mark all fields as touched
    setTouchedFields(new Set(['name', 'email', 'phone', 'deliveryAddress', 'terms']));
    
    if (nameError) return nameError;
    if (emailError) return emailError;
    if (phoneError) return phoneError;
    if (addressError) return addressError;
    if (!agreedToTerms) return 'Please agree to the Terms of Service';
    return null;
  };

  const handlePurchase = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!priceSale) return;

    const validationError = validateForm();
    if (validationError) {
      toast({
        title: 'Missing information',
        description: validationError,
        variant: 'destructive',
      });
      return;
    }

    // Handle cash/in-person payment
    if (paymentMethod === 'cash') {
      setIsPurchasing(true);
      try {
        const isVendibookFreight = fulfillmentSelected === 'vendibook_freight';
        
        // Create a sale transaction with pending_cash status
        const { data: txData, error: txError } = await supabase
          .from('sale_transactions')
          .insert({
            listing_id: listingId,
            buyer_id: user.id,
            seller_id: hostId,
            amount: priceSale,
            delivery_fee: fulfillmentSelected === 'delivery' ? (deliveryFee || 0) : 0,
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

        // Send notification to seller about cash purchase request
        try {
          await supabase.functions.invoke('send-sale-notification', {
            body: {
              transaction_id: txData.id,
              notification_type: 'cash_purchase_request',
            },
          });
        } catch (notifError) {
          console.error('Failed to send cash purchase notification:', notifError);
          // Don't block the flow if notification fails
        }

        trackFormSubmitConversion({ form_type: 'purchase_cash', listing_id: listingId });

        toast({
          title: 'Purchase request submitted!',
          description: 'The seller will contact you to arrange payment and pickup/delivery.',
        });

        // Navigate to order tracking or dashboard
        navigate(`/order-tracking/${txData.id}`);
      } catch (error) {
        console.error('Error creating cash purchase:', error);
        toast({
          title: 'Purchase Error',
          description: error instanceof Error ? error.message : 'Failed to submit purchase request',
          variant: 'destructive',
        });
      } finally {
        setIsPurchasing(false);
      }
      return;
    }

    // Handle card payment (existing flow)
    setIsPurchasing(true);
    setShowCheckoutOverlay(true);
    
    try {
      const isVendibookFreight = fulfillmentSelected === 'vendibook_freight';
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          listing_id: listingId,
          mode: 'sale',
          amount: priceSale,
          delivery_fee: fulfillmentSelected === 'delivery' ? (deliveryFee || 0) : 0,
          fulfillment_type: isVendibookFreight ? 'vendibook_freight' : fulfillmentSelected,
          delivery_address: (fulfillmentSelected === 'delivery' || isVendibookFreight) ? deliveryAddress.trim() : null,
          delivery_instructions: (fulfillmentSelected === 'delivery' || isVendibookFreight) ? deliveryInstructions.trim() : null,
          buyer_name: name.trim(),
          buyer_email: email.trim(),
          buyer_phone: phone.trim() || null,
          // Vendibook freight fields (matching edge function interface)
          vendibook_freight_enabled: isVendibookFreight,
          freight_payer: isVendibookFreight ? freightPayer : 'buyer',
          freight_cost: isVendibookFreight ? freightCost : 0,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Track conversion before redirect
      trackFormSubmitConversion({ form_type: 'purchase', listing_id: listingId });

      // Redirect to Stripe checkout in same tab
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

  return (
    <div data-booking-form className="bg-card border border-border rounded-xl p-6 shadow-card sticky top-24">
      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-4">
        <div className={cn(
          "flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-colors",
          currentStep === 'delivery' 
            ? "bg-primary text-primary-foreground" 
            : "bg-primary/20 text-primary"
        )}>
          {currentStep === 'information' ? <Check className="w-3.5 h-3.5" /> : '1'}
        </div>
        <div className="h-px flex-1 bg-border" />
        <div className={cn(
          "flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-colors",
          currentStep === 'information' 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted text-muted-foreground"
        )}>
          2
        </div>
      </div>

      {/* Price Header */}
      <div className="mb-6">
        <span className="text-2xl font-bold text-foreground">
          ${priceSale?.toLocaleString()}
        </span>
        {currentDeliveryFee > 0 && (
          <span className="text-sm text-muted-foreground ml-2">
            + ${currentDeliveryFee.toLocaleString()} {fulfillmentSelected === 'vendibook_freight' ? 'freight' : 'delivery'}
          </span>
        )}
      </div>

      {/* ==================== STEP 1: DELIVERY OPTIONS ==================== */}
      {currentStep === 'delivery' && (
        <>
          <h3 className="text-sm font-medium text-foreground mb-4">Delivery Options</h3>
          
          <div className="space-y-3 mb-6">
            {fulfillmentOptions.includes('pickup') && (
              <button
                type="button"
                onClick={() => setFulfillmentSelected('pickup')}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                  fulfillmentSelected === 'pickup' 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-lg",
                  fulfillmentSelected === 'pickup' ? "bg-primary/10" : "bg-muted"
                )}>
                  <MapPin className={cn("h-5 w-5", fulfillmentSelected === 'pickup' ? "text-primary" : "text-muted-foreground")} />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">Local Pickup</div>
                  <div className="text-sm text-muted-foreground">Pick up at seller's location</div>
                </div>
                {fulfillmentSelected === 'pickup' && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            )}

            {fulfillmentOptions.includes('delivery') && (
              <button
                type="button"
                onClick={() => setFulfillmentSelected('delivery')}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                  fulfillmentSelected === 'delivery' 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-lg",
                  fulfillmentSelected === 'delivery' ? "bg-primary/10" : "bg-muted"
                )}>
                  <Truck className={cn("h-5 w-5", fulfillmentSelected === 'delivery' ? "text-primary" : "text-muted-foreground")} />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">Local Delivery</div>
                  <div className="text-sm text-muted-foreground">
                    {deliveryRadiusMiles ? `Within ${deliveryRadiusMiles} miles` : 'Seller delivers to you'}
                  </div>
                </div>
                <div className="text-right">
                  {deliveryFee ? (
                    <span className="text-sm font-medium text-foreground">+${deliveryFee}</span>
                  ) : (
                    <span className="text-sm font-medium text-emerald-600">FREE</span>
                  )}
                </div>
                {fulfillmentSelected === 'delivery' && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            )}

            {fulfillmentOptions.includes('vendibook_freight') && (
              <button
                type="button"
                onClick={() => setFulfillmentSelected('vendibook_freight')}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                  fulfillmentSelected === 'vendibook_freight' 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-lg",
                  fulfillmentSelected === 'vendibook_freight' ? "bg-primary/10" : "bg-muted"
                )}>
                  <Package className={cn("h-5 w-5", fulfillmentSelected === 'vendibook_freight' ? "text-primary" : "text-muted-foreground")} />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">Vendibook Freight</div>
                  <div className="text-sm text-muted-foreground">Nationwide shipping with tracking</div>
                </div>
                <div className="text-right">
                  {isFreightSellerPaid ? (
                    <span className="text-sm font-medium text-emerald-600">FREE</span>
                  ) : hasValidEstimate ? (
                    <span className="text-sm font-medium text-foreground">+${freightCost.toFixed(0)}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Get quote</span>
                  )}
                </div>
                {fulfillmentSelected === 'vendibook_freight' && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            )}
          </div>

          {/* Single option - just show it as info */}
          {fulfillmentOptions.length === 1 && (
            <div className="mb-6 p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                {fulfillmentOptions[0] === 'pickup' && <MapPin className="h-4 w-4 text-primary" />}
                {fulfillmentOptions[0] === 'delivery' && <Truck className="h-4 w-4 text-primary" />}
                {fulfillmentOptions[0] === 'vendibook_freight' && <Package className="h-4 w-4 text-primary" />}
                <span className="font-medium text-sm text-foreground">
                  {fulfillmentOptions[0] === 'pickup' && 'Pickup Only'}
                  {fulfillmentOptions[0] === 'delivery' && 'Delivery Only'}
                  {fulfillmentOptions[0] === 'vendibook_freight' && 'Vendibook Freight'}
                </span>
              </div>
            </div>
          )}

          {/* Buy Now Button - goes to step 2 */}
          <Button 
            onClick={() => setCurrentStep('information')}
            className="w-full bg-primary hover:bg-primary/90" 
            size="lg"
            disabled={!priceSale}
          >
            Buy Now - ${totalPrice.toLocaleString()}
          </Button>

          <div className="flex items-center gap-2 justify-center mt-3 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Protected by Vendibook escrow</span>
          </div>
        </>
      )}

      {/* ==================== STEP 2: YOUR INFORMATION ==================== */}
      {currentStep === 'information' && (
        <>
          {/* Back Button */}
          <button
            type="button"
            onClick={() => setCurrentStep('delivery')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to delivery options
          </button>

          <h3 className="text-sm font-medium text-foreground mb-4">Your Information</h3>
          {/* Vendibook Freight Info Card */}
          {fulfillmentSelected === 'vendibook_freight' && (
            <div className="mb-6">
              <FreightInfoCard isSellerPaid={isFreightSellerPaid} />
            </div>
          )}

          {/* Vendibook Freight Address & Estimate */}
          {fulfillmentSelected === 'vendibook_freight' && (
            <div className="mb-6 space-y-4">
              <div>
                <Label htmlFor="freightDeliveryAddress" className="text-sm font-medium mb-2 block">
                  Delivery Address *
                </Label>
                <AddressAutocomplete
                  id="freightDeliveryAddress"
                  value={deliveryAddress}
                  onChange={(value) => {
                    setDeliveryAddress(value);
                    setIsAddressComplete(false);
                    clearEstimate();
                  }}
                  onAddressSelect={(address) => {
                    setDeliveryAddress(address.fullAddress);
                    setIsAddressComplete(address.validation.isComplete);
                    if (address.validation.isComplete) {
                      setAddressValidationMessage(null);
                      fetchFreightEstimate(address.fullAddress);
                    } else {
                      setAddressValidationMessage(`Missing: ${address.validation.missingFields.join(', ')}`);
                      clearEstimate();
                    }
                  }}
                  onValidationChange={(validation) => {
                    setIsAddressComplete(validation?.isComplete ?? false);
                  }}
                  placeholder="Enter your full delivery address"
                  requireComplete={true}
                />
              </div>
              
              {/* Freight Estimate Display */}
              {isEstimating && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Calculating freight estimate...</span>
                </div>
              )}
              
              {hasValidEstimate && !isEstimating && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm text-foreground">Freight Estimate</span>
                    </div>
                    <InfoTooltip content="This is an estimate only. Final freight cost will be confirmed after carrier pickup scheduling." />
                  </div>
                  
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Distance</span>
                      <span className="text-foreground">{estimate?.distance_miles} miles</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rate</span>
                      <span className="text-foreground">${estimate?.rate_per_mile.toFixed(2)}/mile</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-2 border-t border-border">
                      <span>{isFreightSellerPaid ? 'Freight (seller pays)' : 'Total Freight'}</span>
                      <span className={isFreightSellerPaid ? 'text-emerald-600 line-through' : 'text-primary'}>
                        ${estimate?.total_cost.toFixed(2)}
                      </span>
                    </div>
                    {isFreightSellerPaid && (
                      <div className="flex justify-between font-semibold">
                        <span>You pay</span>
                        <span className="text-emerald-600">$0.00</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2">
                    <Truck className="h-3 w-3" />
                    <span>Est. {estimate?.estimated_transit_days.min}-{estimate?.estimated_transit_days.max} business days</span>
                  </div>
                </div>
              )}
              
              {estimateError && !isEstimating && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">{estimateError}</span>
                </div>
              )}
              
              <div>
                <Label htmlFor="freightDeliveryInstructions" className="text-sm font-medium mb-2 block">
                  Delivery Instructions (optional)
                </Label>
                <Textarea
                  id="freightDeliveryInstructions"
                  placeholder="Dock availability, forklift required, etc."
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          {/* Pickup Location Info */}
          {fulfillmentSelected === 'pickup' && pickupLocation && (
            <div className="mb-6 p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm text-foreground">Pickup Location</span>
              </div>
              <p className="text-sm text-muted-foreground">{pickupLocation}</p>
            </div>
          )}

          {/* Local Delivery Address Input */}
          {fulfillmentSelected === 'delivery' && (
            <div className="mb-6 space-y-4">
              <div>
                <Label htmlFor="saleDeliveryAddress" className="text-sm font-medium mb-2 block">
                  Delivery Address *
                </Label>
                <Input
                  id="saleDeliveryAddress"
                  placeholder="Enter your delivery address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                />
                {deliveryRadiusMiles && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Delivery available within {deliveryRadiusMiles} miles
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="saleDeliveryInstructions" className="text-sm font-medium mb-2 block">
                  Delivery Instructions (optional)
                </Label>
                <Textarea
                  id="saleDeliveryInstructions"
                  placeholder="Gate code, parking notes, etc."
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          {/* Customer Information Fields */}
          <div className="space-y-4 mb-6">
            <ValidatedInput
              label="Full Name"
              value={name}
              onChange={(value) => updateField('name', value)}
              onBlur={() => markTouched('name')}
              error={fieldErrors.name}
              touched={touchedFields.has('name')}
              required
              placeholder="Your name"
            />
            
            <ValidatedInput
              label="Email"
              type="email"
              value={email}
              onChange={(value) => updateField('email', value)}
              onBlur={() => markTouched('email')}
              error={fieldErrors.email}
              touched={touchedFields.has('email')}
              required
              placeholder="Your email"
            />
            
            <ValidatedInput
              label="Phone Number"
              type="tel"
              value={phone}
              onChange={(value) => updateField('phone', value)}
              onBlur={() => markTouched('phone')}
              error={fieldErrors.phone}
              touched={touchedFields.has('phone')}
              required
              formatPhone
              maxLength={14}
              placeholder="(555) 123-4567"
            />
          </div>

          {/* Payment Method Selection */}
          {hasMultiplePaymentOptions && (
            <div className="mb-6">
              <Label className="text-sm font-medium mb-3 block">Payment Method</Label>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                    paymentMethod === 'card' 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-lg",
                    paymentMethod === 'card' ? "bg-primary/10" : "bg-muted"
                  )}>
                    <CreditCard className={cn("h-5 w-5", paymentMethod === 'card' ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">Pay with Card</div>
                    <div className="text-sm text-muted-foreground">Secure checkout via Stripe</div>
                  </div>
                  {paymentMethod === 'card' && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                    paymentMethod === 'cash' 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-lg",
                    paymentMethod === 'cash' ? "bg-emerald-500/10" : "bg-muted"
                  )}>
                    <Banknote className={cn("h-5 w-5", paymentMethod === 'cash' ? "text-emerald-600" : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">Pay in Person</div>
                    <div className="text-sm text-muted-foreground">Cash or check at pickup/delivery</div>
                  </div>
                  {paymentMethod === 'cash' && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Cash-only notice */}
          {onlyCashPayment && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Banknote className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-sm text-amber-800 dark:text-amber-200">Pay in Person Only</span>
              </div>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                This seller only accepts in-person payment (cash or check).
              </p>
            </div>
          )}

          {/* Terms Agreement */}
          <div className="flex items-start gap-3 mb-6">
            <Checkbox
              id="saleTerms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
              className="mt-0.5"
            />
            <Label htmlFor="saleTerms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
              I agree to the{' '}
              <a href="/terms" target="_blank" className="text-primary hover:underline">
                Terms of Service
              </a>{' '}
              and understand this is a binding purchase.
            </Label>
          </div>

          {/* Price Summary */}
          <div className="mb-4 p-4 bg-muted/50 rounded-xl space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Price</span>
              <span className="text-foreground">${priceSale?.toLocaleString()}</span>
            </div>
            {currentDeliveryFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {fulfillmentSelected === 'vendibook_freight' ? 'Freight' : 'Delivery Fee'}
                </span>
                <span className="text-foreground">${currentDeliveryFee.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold pt-2 border-t border-border">
              <span>Total</span>
              <span className="text-primary">${totalPrice.toLocaleString()}</span>
            </div>
          </div>

          {/* Trust Badge before submit */}
          {paymentMethod === 'card' && (
            <div className="mb-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Protected by Vendibook</span>
            </div>
          )}

          {/* Complete Purchase Button */}
          <Button 
            onClick={handlePurchase}
            className="w-full bg-primary hover:bg-primary/90" 
            size="lg"
            disabled={isPurchasing || !priceSale}
          >
            {isPurchasing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : !user ? (
              'Sign in to Purchase'
            ) : paymentMethod === 'cash' ? (
              `Request Purchase - $${totalPrice.toLocaleString()}`
            ) : (
              `Complete Purchase - $${totalPrice.toLocaleString()}`
            )}
          </Button>

          {paymentMethod === 'card' && (
            <div className="flex items-center gap-2 justify-center mt-3 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Protected by escrow - funds released after confirmation</span>
            </div>
          )}

          {paymentMethod === 'cash' && (
            <div className="flex items-center gap-2 justify-center mt-3 text-xs text-muted-foreground">
              <Banknote className="h-4 w-4 text-amber-500" />
              <span>Seller will contact you to arrange payment</span>
            </div>
          )}
        </>
      )}

      {/* Checkout Overlay */}
      <CheckoutOverlay isVisible={showCheckoutOverlay} />
    </div>
  );
};

export default InquiryForm;
