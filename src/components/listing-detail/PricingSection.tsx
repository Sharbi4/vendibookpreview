import { DollarSign, Truck } from 'lucide-react';

interface PricingSectionProps {
  isRental: boolean;
  priceDaily?: number | null;
  priceWeekly?: number | null;
  priceSale?: number | null;
  deliveryFee?: number | null;
  fulfillmentType?: string;
  vendibookFreightEnabled?: boolean;
}

const PricingSection = ({
  isRental,
  priceDaily,
  priceWeekly,
  priceSale,
  deliveryFee,
  fulfillmentType,
  vendibookFreightEnabled,
}: PricingSectionProps) => {
  const hasDelivery = fulfillmentType === 'delivery' || fulfillmentType === 'both';

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-primary" />
        Pricing
      </h3>

      {isRental ? (
        <div className="space-y-2">
          {priceDaily && priceDaily > 0 ? (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Daily rate</span>
              <span className="font-medium">${priceDaily.toLocaleString()}/day</span>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Daily rate</span>
              <span className="font-medium text-muted-foreground">Price TBD</span>
            </div>
          )}
          {priceWeekly && priceWeekly > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Weekly rate</span>
              <span className="font-medium">${priceWeekly.toLocaleString()}/week</span>
            </div>
          )}
          {hasDelivery && deliveryFee && (
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5" />
                Delivery fee
              </span>
              <span className="font-medium">${deliveryFee}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Sale price</span>
            <span className="font-semibold text-lg">
              {priceSale && priceSale > 0 ? `$${priceSale.toLocaleString()}` : 'Price TBD'}
            </span>
          </div>
          {hasDelivery && deliveryFee && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5" />
                Local delivery
              </span>
              <span className="font-medium">${deliveryFee}</span>
            </div>
          )}
          {vendibookFreightEnabled && (
            <p className="text-xs text-muted-foreground">
              Vendibook Freight available for nationwide shipping
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PricingSection;
