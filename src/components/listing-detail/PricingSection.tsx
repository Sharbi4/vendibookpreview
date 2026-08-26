import { DollarSign, Truck, Clock, CalendarDays } from 'lucide-react';
import { FreightLink } from '@/components/shared/FreightLink';

interface PricingSectionProps {
  isRental: boolean;
  priceHourly?: number | null;
  priceDaily?: number | null;
  priceWeekly?: number | null;
  priceMonthly?: number | null;
  priceSale?: number | null;
  deliveryFee?: number | null;
  fulfillmentType?: string;
  vendibookFreightEnabled?: boolean;
}

const PricingSection = ({
  isRental,
  priceHourly,
  priceDaily,
  priceWeekly,
  priceMonthly,
  priceSale,
  deliveryFee,
  fulfillmentType,
  vendibookFreightEnabled,
}: PricingSectionProps) => {
  const hasDelivery = fulfillmentType === 'delivery' || fulfillmentType === 'both';
  const rentalRates = listRentalRates({
    price_hourly: priceHourly,
    price_daily: priceDaily,
    price_weekly: priceWeekly,
    price_monthly: priceMonthly,
  });

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-primary" />
        Pricing
      </h3>

      {isRental ? (
        <div className="space-y-2">
          {rentalRates.length > 0 ? (
            rentalRates.map((rate) => (
              <div key={rate.unit} className="flex justify-between items-center" data-testid={`rate-${rate.unit}`}>
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  {rate.unit === 'hourly' ? (
                    <Clock className="h-3.5 w-3.5" />
                  ) : rate.unit === 'daily' ? null : (
                    <CalendarDays className="h-3.5 w-3.5" />
                  )}
                  {rate.label}
                </span>
                <span className="font-medium">{formatRentalRate(rate)}</span>
              </div>
            ))
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Rental rate</span>
              <span className="font-medium text-muted-foreground">{PRICE_TBD}</span>
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
              <FreightLink /> available for nationwide shipping
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PricingSection;
