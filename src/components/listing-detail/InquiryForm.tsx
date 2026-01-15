import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ShieldCheck, Loader2, MapPin, Truck } from 'lucide-react';
import { CheckoutOverlay } from '@/components/checkout';
import { FreightInfoCard } from '@/components/freight';
import type { FulfillmentType } from '@/types/listing';

interface InquiryFormProps {
  listingId: string;
  priceSale: number | null;
  fulfillmentType?: FulfillmentType;
  deliveryFee?: number | null;
  deliveryRadiusMiles?: number | null;
  pickupLocation?: string | null;
  vendibookFreightEnabled?: boolean;
  freightPayer?: 'buyer' | 'seller';
}

type FulfillmentSelection = 'pickup' | 'delivery' | 'vendibook_freight';

const InquiryForm = ({ 
  listingId, 
  priceSale,
  fulfillmentType = 'pickup',
  deliveryFee,
  deliveryRadiusMiles,
  pickupLocation,
  vendibookFreightEnabled = false,
  freightPayer = 'buyer',
}: InquiryFormProps) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
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
  
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showCheckoutOverlay, setShowCheckoutOverlay] = useState(false);

  // Estimated freight cost (placeholder - in production would be dynamically calculated)
  const estimatedFreightCost = 500;
  const isFreightSellerPaid = vendibookFreightEnabled && freightPayer === 'seller';

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

  // Calculate total price including delivery if applicable
  const getDeliveryFeeForSelection = (): number => {
    if (fulfillmentSelected === 'vendibook_freight') {
      // If seller pays freight, buyer sees $0
      return isFreightSellerPaid ? 0 : estimatedFreightCost;
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
          freight_cost: isVendibookFreight ? estimatedFreightCost : 0,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

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
    <div className="bg-card border border-border rounded-xl p-6 shadow-card sticky top-24">
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
                  ) : (
                    <span className="text-xs text-muted-foreground ml-auto">+${estimatedFreightCost}</span>
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

      {/* Delivery Address Input */}
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
        ) : user ? (
          `Buy Now - $${totalPrice.toLocaleString()}`
        ) : (
          'Sign in to Purchase'
        )}
      </Button>

      <div className="flex items-center gap-2 justify-center mt-3 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        <span>Protected by escrow - funds released after confirmation</span>
      </div>

      {/* Checkout Overlay */}
      <CheckoutOverlay isVisible={showCheckoutOverlay} />
    </div>
  );
};

export default InquiryForm;