import { useState } from 'react';
import { 
  ArrowLeft, MapPin, Truck, Package, Pencil, ShieldCheck, 
  CreditCard, Banknote, Loader2, DollarSign, Handshake, CheckCircle2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import WhatsIncluded from '@/components/shared/WhatsIncluded';
import WhatHappensNext, { getSalePickupSteps, getSaleFreightSteps, getSaleLocalDeliverySteps } from '@/components/shared/WhatHappensNext';
import { EscrowInfoPopover, FeesInfoPopover } from '@/components/shared/InfoPopover';

type FulfillmentSelection = 'pickup' | 'delivery' | 'vendibook_freight';

interface PurchaseStepReviewProps {
  listing: any;
  priceSale: number;
  currentDeliveryFee: number;
  totalPrice: number;
  fulfillmentSelected: FulfillmentSelection;
  deliveryAddress: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  // Freight details
  hasValidEstimate: boolean;
  estimate: any;
  isFreightSellerPaid?: boolean;
  freightCost?: number;
  // Payment
  paymentMethod: 'card' | 'cash';
  setPaymentMethod: (value: 'card' | 'cash') => void;
  hasMultiplePaymentOptions: boolean;
  agreedToTerms: boolean;
  setAgreedToTerms: (value: boolean) => void;
  isPurchasing: boolean;
  // Navigation
  onBack: () => void;
  onEditDelivery: () => void;
  onEditInfo: () => void;
  onSubmit: () => void;
}

const PurchaseStepReview = ({
  listing,
  priceSale,
  currentDeliveryFee,
  totalPrice,
  fulfillmentSelected,
  deliveryAddress,
  name,
  email,
  phone,
  address,
  hasValidEstimate,
  estimate,
  isFreightSellerPaid = false,
  freightCost = 0,
  paymentMethod,
  setPaymentMethod,
  hasMultiplePaymentOptions,
  agreedToTerms,
  setAgreedToTerms,
  isPurchasing,
  onBack,
  onEditDelivery,
  onEditInfo,
  onSubmit,
}: PurchaseStepReviewProps) => {
  // Get the right timeline based on fulfillment
  const getTimelineSteps = () => {
    if (fulfillmentSelected === 'vendibook_freight') return getSaleFreightSteps();
    if (fulfillmentSelected === 'delivery') return getSaleLocalDeliverySteps();
    return getSalePickupSteps();
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to your information
      </button>

      {/* Step Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Review your purchase</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Confirm details. You'll pay securely next.
        </p>
      </div>

      {/* Item Summary */}
      <div className="border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Item</h3>
        </div>
        <div className="flex gap-4">
          <img 
            src={listing.cover_image_url || listing.image_urls?.[0] || '/placeholder.svg'}
            alt={listing.title}
            className="w-20 h-20 object-cover rounded-lg border border-border"
          />
          <div className="flex-1">
            <h4 className="font-semibold text-foreground line-clamp-1">{listing.title}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-md bg-muted border border-border text-muted-foreground font-mono">
                #{listing.id?.slice(0, 8).toUpperCase()}
              </span>
              <span className="text-xs text-muted-foreground capitalize">{listing.category?.replace('_', ' ')}</span>
            </div>
            <p className="text-lg font-bold text-primary mt-2">${priceSale.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Delivery Summary */}
      <div className="border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Delivery Method</h3>
          <button
            type="button"
            onClick={onEditDelivery}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        </div>
        <div className="flex items-center gap-3">
          {fulfillmentSelected === 'pickup' && <MapPin className="h-5 w-5 text-primary" />}
          {fulfillmentSelected === 'delivery' && <Truck className="h-5 w-5 text-primary" />}
          {fulfillmentSelected === 'vendibook_freight' && <Package className="h-5 w-5 text-primary" />}
          <div className="flex-1">
            <p className="font-medium text-foreground">
              {fulfillmentSelected === 'pickup' && 'Local Pickup'}
              {fulfillmentSelected === 'delivery' && 'Local Delivery'}
              {fulfillmentSelected === 'vendibook_freight' && 'VendiBook Freight'}
            </p>
            {fulfillmentSelected === 'vendibook_freight' && (
              <p className="text-xs text-muted-foreground">7–10 business days • Anywhere in US</p>
            )}
            {(fulfillmentSelected === 'delivery' || fulfillmentSelected === 'vendibook_freight') && deliveryAddress && (
              <p className="text-sm text-muted-foreground mt-1">{deliveryAddress}</p>
            )}
          </div>
          <div className="text-right">
            {fulfillmentSelected === 'vendibook_freight' ? (
              isFreightSellerPaid ? (
                <span className="text-sm font-semibold text-emerald-600">Free Shipping</span>
              ) : currentDeliveryFee > 0 ? (
                <span className="font-medium">+${currentDeliveryFee.toLocaleString()}</span>
              ) : null
            ) : currentDeliveryFee > 0 ? (
              <span className="font-medium">+${currentDeliveryFee.toLocaleString()}</span>
            ) : fulfillmentSelected === 'pickup' ? (
              <span className="text-sm font-semibold text-emerald-600">FREE</span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Buyer Info Summary */}
      <div className="border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Your Information</h3>
          <button
            type="button"
            onClick={onEditInfo}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Name</span>
            <p className="font-medium text-foreground">{name}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Email</span>
            <p className="font-medium text-foreground truncate">{email}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Phone</span>
            <p className="font-medium text-foreground">{phone}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Address</span>
            <p className="font-medium text-foreground truncate">{address}</p>
          </div>
        </div>
      </div>

      {/* How It Works - Always Visible Timeline */}
      <div className="border border-border rounded-xl p-4 bg-muted/30">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          How It Works
          <EscrowInfoPopover />
        </h3>
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <div className="w-0.5 flex-1 bg-border mt-2" />
            </div>
            <div className="pb-3">
              <h4 className="font-medium text-foreground text-sm">Payment held securely</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Funds are held until the transaction is confirmed.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Handshake className="h-4 w-4 text-primary" />
              </div>
              <div className="w-0.5 flex-1 bg-border mt-2" />
            </div>
            <div className="pb-3">
              <h4 className="font-medium text-foreground text-sm">Inspect / receive the item</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Meet for pickup/delivery or receive freight shipment.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <div>
              <h4 className="font-medium text-foreground text-sm">Confirm in your Dashboard</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Buyer confirms receipt → funds release to seller.
              </p>
              <p className="text-xs text-primary font-medium mt-1">
                You'll confirm in Dashboard → Purchases card.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* What Happens Next - Context Aware */}
      <WhatHappensNext steps={getTimelineSteps()} />

      {/* What's Included */}
      <WhatsIncluded mode="checkout" defaultOpen={true} />

      {/* Price Summary */}
      <div className="border-2 border-primary/20 rounded-xl p-4 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Item price</span>
            <span className="text-foreground font-medium">${priceSale.toLocaleString()}</span>
          </div>
          {/* Show freight line - either with cost or as free shipping */}
          {fulfillmentSelected === 'vendibook_freight' && (
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" />
                VendiBook Freight
              </span>
              {isFreightSellerPaid ? (
                <span className="text-emerald-600 font-medium">FREE</span>
              ) : (
                <span className="text-foreground font-medium">+${currentDeliveryFee.toLocaleString()}</span>
              )}
            </div>
          )}
          {/* Show regular delivery fee for non-freight */}
          {fulfillmentSelected === 'delivery' && currentDeliveryFee > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5" />
                Delivery
              </span>
              <span className="text-foreground font-medium">+${currentDeliveryFee.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between pt-3 border-t border-primary/20">
            <span className="font-bold text-lg text-foreground flex items-center gap-1.5">
              Total
              <FeesInfoPopover />
            </span>
            <span className="font-bold text-lg text-primary">${totalPrice.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Payment Method Selection */}
      {hasMultiplePaymentOptions && (
        <div className="space-y-3">
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

      {/* TOS Agreement */}
      <div className="flex items-start gap-3 p-4 border border-border rounded-xl bg-muted/30">
        <Checkbox
          id="terms"
          checked={agreedToTerms}
          onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
        />
        <label htmlFor="terms" className="text-sm text-foreground leading-tight cursor-pointer">
          I agree to the{' '}
          <a href="/terms" target="_blank" className="text-primary hover:underline font-medium">
            Terms of Service
          </a>{' '}
          and understand my payment is held until both parties confirm the transaction.
        </label>
      </div>

      {/* Submit Button */}
      <Button
        onClick={onSubmit}
        disabled={isPurchasing || !agreedToTerms}
        className="w-full"
        size="lg"
      >
        {isPurchasing ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <ShieldCheck className="h-4 w-4 mr-2" />
        )}
        {paymentMethod === 'cash' 
          ? `Submit Cash Request – $${totalPrice.toLocaleString()}`
          : `Pay Securely – $${totalPrice.toLocaleString()}`
        }
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        <ShieldCheck className="inline h-3 w-3 mr-1 text-emerald-500" />
        Protected by VendiBook escrow
      </p>
    </div>
  );
};

export default PurchaseStepReview;
