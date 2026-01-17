import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useFreightEstimate } from '@/hooks/useFreightEstimate';
import { supabase } from '@/integrations/supabase/client';
import { ShieldCheck, Loader2, MapPin, Truck, Calculator, AlertCircle, CreditCard, Banknote } from 'lucide-react';
import { CheckoutOverlay } from '@/components/checkout';
import { FreightInfoCard } from '@/components/freight';
import { InfoTooltip } from '@/components/ui/info-tooltip';
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

  const validateForm = (): string | null => {
    if (!name.trim()) return 'Please enter your name';
    if (!email.trim()) return 'Please enter your email';
    if ((fulfillmentSelected === 'delivery' || fulfillmentSelected === 'vendibook_freight') && !deliveryAddress.trim()) {
      return 'Please enter a delivery address';
    }
    if (fulfillmentSelected === 'vendibook_freight' && !isAddressComplete) {
      return 'Please select a complete address with street, city, state, and ZIP code';
    }
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
      {/* Price Header */}
      <div className="mb-6">
        <span className="text-2xl font-bold text-foreground">
          ${priceSale?.toLocaleString()}
        </span>
        {currentDeliveryFee > 0 && (
          <span className="text-sm text-muted-foreground ml-2">
            + ${currentDeliveryFee} delivery
          </span>
        )}
      </div>

      {/* Fulfillment Selection */}
      {fulfillmentOptions.length > 1 && (
        <div className="mb-6">
          <Label className="text-sm font-medium mb-3 block">
            How would you like to receive this?
          </Label>
          <RadioGroup
            value={fulfillmentSelected}
            onValueChange={(val) => setFulfillmentSelected(val as FulfillmentSelection)}
            className="space-y-3"
          >
            {fulfillmentOptions.includes('vendibook_freight') && (
              <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                fulfillmentSelected === 'vendibook_freight' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}>
                <RadioGroupItem value="vendibook_freight" id="sale-vendibook-freight" />
                <Label htmlFor="sale-vendibook-freight" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Truck className="h-4 w-4 text-primary" />
                  <span>Vendibook Freight</span>
                  {isFreightSellerPaid ? (
                    <span className="text-xs text-emerald-600 font-medium ml-auto">FREE</span>
                  ) : hasValidEstimate ? (
                    <span className="text-xs text-muted-foreground ml-auto">+${freightCost.toFixed(0)}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground ml-auto">Enter address for quote</span>
                  )}
                </Label>
              </div>
            )}
            {fulfillmentOptions.includes('pickup') && (
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                <RadioGroupItem value="pickup" id="sale-pickup" />
                <Label htmlFor="sale-pickup" className="flex items-center gap-2 cursor-pointer flex-1">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>Pickup</span>
                </Label>
              </div>
            )}
            {fulfillmentOptions.includes('delivery') && (
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                <RadioGroupItem value="delivery" id="sale-delivery" />
                <Label htmlFor="sale-delivery" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Truck className="h-4 w-4 text-primary" />
                  <span>Local Delivery</span>
                  {deliveryFee && (
                    <span className="text-xs text-muted-foreground ml-auto">+${deliveryFee}</span>
                  )}
                </Label>
              </div>
            )}
          </RadioGroup>
        </div>
      )}

      {/* Vendibook Freight Info Card (Pod 2 or Pod 3) */}
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
                // Reset validation when user types manually
                setIsAddressComplete(false);
                clearEstimate();
              }}
              onAddressSelect={(address) => {
                setDeliveryAddress(address.fullAddress);
                setIsAddressComplete(address.validation.isComplete);
                if (address.validation.isComplete) {
                  setAddressValidationMessage(null);
                  // Trigger freight estimate for complete addresses
                  fetchFreightEstimate(address.fullAddress);
                } else {
                  setAddressValidationMessage(`Missing: ${address.validation.missingFields.join(', ')}`);
                  clearEstimate();
                }
              }}
              onValidationChange={(validation) => {
                if (validation) {
                  setIsAddressComplete(validation.isComplete);
                } else {
                  setIsAddressComplete(false);
                }
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
          <p className="text-sm text-muted-foreground">
            {pickupLocation}
          </p>
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

      {/* Customer Information */}
      <div className="space-y-4 mb-6">
        <h3 className="text-sm font-medium text-foreground">Your Information</h3>
        
        <div>
          <Label htmlFor="buyerName" className="text-sm text-muted-foreground mb-1 block">
            Full Name *
          </Label>
          <Input
            id="buyerName"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="buyerEmail" className="text-sm text-muted-foreground mb-1 block">
            Email *
          </Label>
          <Input
            id="buyerEmail"
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="buyerPhone" className="text-sm text-muted-foreground mb-1 block">
            Phone (optional)
          </Label>
          <Input
            id="buyerPhone"
            type="tel"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>

      {/* Payment Method Selection */}
      {hasMultiplePaymentOptions && (
        <div className="mb-6">
          <Label className="text-sm font-medium mb-3 block">
            How would you like to pay?
          </Label>
          <RadioGroup
            value={paymentMethod}
            onValueChange={(val) => setPaymentMethod(val as PaymentMethod)}
            className="space-y-3"
          >
            <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
              paymentMethod === 'card' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}>
              <RadioGroupItem value="card" id="payment-card" />
              <Label htmlFor="payment-card" className="flex items-center gap-2 cursor-pointer flex-1">
                <CreditCard className="h-4 w-4 text-primary" />
                <span>Pay with Card</span>
                <span className="text-xs text-muted-foreground ml-auto">Secure checkout</span>
              </Label>
            </div>
            <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
              paymentMethod === 'cash' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}>
              <RadioGroupItem value="cash" id="payment-cash" />
              <Label htmlFor="payment-cash" className="flex items-center gap-2 cursor-pointer flex-1">
                <Banknote className="h-4 w-4 text-emerald-600" />
                <span>Pay in Person</span>
                <span className="text-xs text-muted-foreground ml-auto">Cash or check</span>
              </Label>
            </div>
          </RadioGroup>
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
            This seller only accepts in-person payment (cash or check). You'll arrange payment directly with the seller.
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
            <span className="text-muted-foreground">Delivery Fee</span>
            <span className="text-foreground">${currentDeliveryFee}</span>
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

      {/* Buy Now Button */}
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
          `Buy Now - $${totalPrice.toLocaleString()}`
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

      {/* Checkout Overlay */}
      <CheckoutOverlay isVisible={showCheckoutOverlay} />
    </div>
  );
};

export default InquiryForm;