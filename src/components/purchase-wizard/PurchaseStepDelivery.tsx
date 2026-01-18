import { MapPin, Truck, Package, Check, Loader2, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AddressAutocomplete } from '@/components/listing-detail/AddressAutocomplete';
import NextStepHint from '@/components/shared/NextStepHint';
import { FreightInfoPopover } from '@/components/shared/InfoPopover';

type FulfillmentSelection = 'pickup' | 'delivery' | 'vendibook_freight';

interface PurchaseStepDeliveryProps {
  fulfillmentOptions: FulfillmentSelection[];
  fulfillmentSelected: FulfillmentSelection;
  setFulfillmentSelected: (value: FulfillmentSelection) => void;
  deliveryAddress: string;
  setDeliveryAddress: (value: string) => void;
  setDeliveryCoords: (coords: [number, number] | null) => void;
  deliveryFee: number;
  deliveryRadiusMiles: number | null;
  deliveryDistanceInfo: { distance: number | null; isOutsideRadius: boolean };
  // Freight
  isFreightSellerPaid: boolean;
  freightCost: number;
  hasValidEstimate: boolean;
  isEstimating: boolean;
  estimateError: string | null;
  estimate: any;
  isAddressComplete: boolean;
  setIsAddressComplete: (value: boolean) => void;
  fetchFreightEstimate: (address: string) => void;
  clearEstimate: () => void;
  // Navigation
  onContinue: () => void;
}

const PurchaseStepDelivery = ({
  fulfillmentOptions,
  fulfillmentSelected,
  setFulfillmentSelected,
  deliveryAddress,
  setDeliveryAddress,
  setDeliveryCoords,
  deliveryFee,
  deliveryRadiusMiles,
  deliveryDistanceInfo,
  isFreightSellerPaid,
  freightCost,
  hasValidEstimate,
  isEstimating,
  estimateError,
  estimate,
  isAddressComplete,
  setIsAddressComplete,
  fetchFreightEstimate,
  clearEstimate,
  onContinue,
}: PurchaseStepDeliveryProps) => {
  const canContinue = fulfillmentSelected === 'pickup' || 
    (fulfillmentSelected === 'delivery' && deliveryAddress.trim()) ||
    (fulfillmentSelected === 'vendibook_freight' && hasValidEstimate);

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Delivery method</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose how you want to receive this item.
        </p>
      </div>

      {/* Fulfillment Options */}
      <div className="space-y-3">
        {/* Pickup Option */}
        {fulfillmentOptions.includes('pickup') && (
          <button
            type="button"
            onClick={() => setFulfillmentSelected('pickup')}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
              fulfillmentSelected === 'pickup' 
                ? "border-primary bg-primary/5 shadow-sm" 
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
              <div className="font-semibold text-foreground">Local Pickup</div>
              <div className="text-sm text-muted-foreground">Coordinate pickup time in Messages after checkout.</div>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-emerald-600">FREE</span>
            </div>
            {fulfillmentSelected === 'pickup' && (
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
          </button>
        )}

        {/* Local Delivery Option */}
        {fulfillmentOptions.includes('delivery') && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setFulfillmentSelected('delivery')}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                fulfillmentSelected === 'delivery' 
                  ? "border-primary bg-primary/5 shadow-sm" 
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
                <div className="font-semibold text-foreground">Local Delivery</div>
                <div className="text-sm text-muted-foreground">
                  {deliveryRadiusMiles ? `Delivered within ${deliveryRadiusMiles} miles. Fee shown below.` : 'Seller delivers to you.'}
                </div>
              </div>
              <div className="text-right">
                {deliveryFee ? (
                  <span className="text-sm font-semibold text-foreground">+${deliveryFee.toLocaleString()}</span>
                ) : (
                  <span className="text-sm font-semibold text-emerald-600">FREE</span>
                )}
              </div>
              {fulfillmentSelected === 'delivery' && (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </button>

            {/* Delivery Address Input */}
            {fulfillmentSelected === 'delivery' && (
              <div className="ml-16 p-4 bg-muted/30 rounded-lg border border-border space-y-3">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Delivery Address *</Label>
                  <AddressAutocomplete
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

                {/* Distance Check */}
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
                          <p className="font-medium text-amber-800 dark:text-amber-300">Outside delivery zone</p>
                          <p className="text-amber-700 dark:text-amber-400 text-xs mt-1">
                            Your address is {deliveryDistanceInfo.distance} miles away, but the seller only delivers within {deliveryRadiusMiles} miles.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-emerald-800 dark:text-emerald-300">Within delivery zone</p>
                          <p className="text-emerald-700 dark:text-emerald-400 text-xs mt-1">
                            {deliveryDistanceInfo.distance} miles from seller
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Vendibook Freight Option */}
        {fulfillmentOptions.includes('vendibook_freight') && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setFulfillmentSelected('vendibook_freight')}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                fulfillmentSelected === 'vendibook_freight' 
                  ? "border-primary bg-primary/5 shadow-sm" 
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
                <div className="font-semibold text-foreground flex items-center gap-2">
                  VendiBook Freight
                  <FreightInfoPopover />
                </div>
                <div className="text-sm text-muted-foreground">Nationwide shipping • 7–10 business days • Scheduling included</div>
              </div>
              <div className="text-right">
                {isFreightSellerPaid ? (
                  <span className="text-sm font-semibold text-emerald-600">FREE</span>
                ) : hasValidEstimate ? (
                  <span className="text-sm font-semibold text-foreground">+${freightCost.toLocaleString()}</span>
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

            {/* Freight Address & Quote */}
            {fulfillmentSelected === 'vendibook_freight' && (
              <div className="ml-16 p-4 bg-muted/30 rounded-lg border border-border space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Delivery Address *</Label>
                  <AddressAutocomplete
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
                    <span className="text-sm text-muted-foreground">Calculating freight rate...</span>
                  </div>
                )}

                {hasValidEstimate && !isEstimating && (
                  <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-foreground">Freight Quote</span>
                      <span className="text-xs text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full">
                        $4.50/mile
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs border-t border-primary/10 pt-3 mb-3">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Distance ({estimate?.distance_miles?.toFixed(0)} mi × $4.50)</span>
                        <span>${estimate?.base_cost?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Fuel surcharge (8%)</span>
                        <span>${estimate?.fuel_surcharge?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Handling fee</span>
                        <span>${estimate?.handling_fee?.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-primary/20">
                      <div>
                        <span className="text-sm font-semibold text-foreground">Total Freight</span>
                        <div className="text-xs text-muted-foreground">
                          Est. delivery: 7–10 business days
                        </div>
                      </div>
                      <span className={cn(
                        "text-xl font-bold",
                        isFreightSellerPaid ? "text-emerald-600" : "text-primary"
                      )}>
                        {isFreightSellerPaid ? 'FREE' : `$${freightCost.toLocaleString()}`}
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

      {/* Next Step Hint */}
      <NextStepHint text="Add your contact details for scheduling and receipts." />

      {/* Continue Button */}
      <Button
        onClick={onContinue}
        disabled={!canContinue}
        className="w-full"
        size="lg"
      >
        Continue
      </Button>
    </div>
  );
};

export default PurchaseStepDelivery;
