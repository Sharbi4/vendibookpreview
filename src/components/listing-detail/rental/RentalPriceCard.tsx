import { Clock, CalendarDays, Truck, Info } from 'lucide-react';
import { SaleCard } from '@/components/listing-detail/sale/SaleCard';
import { RENTAL_RENTER_FEE_PERCENT } from '@/lib/commissions';
import { deliveryRateLabel } from '@/lib/fulfillment/delivery';

interface RentalPriceCardProps {
  priceHourly?: number | null;
  priceDaily?: number | null;
  priceWeekly?: number | null;
  priceMonthly?: number | null;
  hourlyEnabled?: boolean;
  fulfillmentType?: string | null;
  deliveryFee?: number | null;
  deliveryFeeType?: string | null;
  instantBook?: boolean;
}

const Row = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) => (
  <div className="flex items-center gap-3 py-2.5 [box-shadow:inset_0_-1px_0_hsl(var(--border))]">
    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
    <span className="flex-1 text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium text-right">{value}</span>
  </div>
);

/**
 * "What you'll pay" — one transparent pricing surface for a rental.
 *
 * Rates come straight off the listing; the renter service fee comes from the
 * live commission source of truth. No totals are implied without dates.
 */
export const RentalPriceCard = ({
  priceHourly,
  priceDaily,
  priceWeekly,
  priceMonthly,
  hourlyEnabled,
  fulfillmentType,
  deliveryFee,
  deliveryFeeType,
  instantBook,
}: RentalPriceCardProps) => {
  const hasDelivery = fulfillmentType === 'delivery' || fulfillmentType === 'both';
  const deliveryLabel = hasDelivery ? deliveryRateLabel(deliveryFee, deliveryFeeType as any) : null;
  const anyRate = Boolean(
    (hourlyEnabled && priceHourly) || priceDaily || priceWeekly || priceMonthly,
  );

  return (
    <SaleCard padding="lg" className="space-y-3">
      <h2 className="text-lg font-semibold">What you&rsquo;ll pay</h2>

      {anyRate ? (
        <div className="grid sm:grid-cols-2 gap-x-10">
          {hourlyEnabled && priceHourly ? (
            <Row icon={Clock} label="Hourly rate" value={`$${priceHourly.toLocaleString()}/hr`} />
          ) : null}
          {priceDaily ? (
            <Row icon={CalendarDays} label="Daily rate" value={`$${priceDaily.toLocaleString()}/day`} />
          ) : null}
          {priceWeekly ? (
            <Row icon={CalendarDays} label="Weekly rate" value={`$${priceWeekly.toLocaleString()}/week`} />
          ) : null}
          {priceMonthly ? (
            <Row icon={CalendarDays} label="Monthly rate" value={`$${priceMonthly.toLocaleString()}/mo`} />
          ) : null}
          <Row
            icon={Info}
            label="Renter service fee"
            value={`${RENTAL_RENTER_FEE_PERCENT}% of the rental`}
          />
          {deliveryLabel ? <Row icon={Truck} label="Delivery" value={deliveryLabel} /> : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          The host hasn&rsquo;t published rates yet — send a message to ask.
        </p>
      )}

      <p className="text-xs text-muted-foreground leading-relaxed">
        Pick your dates in the booking panel to see the exact total. Longer bookings automatically
        use the best available rate.{' '}
        {instantBook
          ? 'This rental books instantly — you pay through PayPal at checkout.'
          : 'This rental is request-to-book: your payment method is authorized when you request, and you are only charged if the host accepts.'}
      </p>
    </SaleCard>
  );
};

export default RentalPriceCard;
