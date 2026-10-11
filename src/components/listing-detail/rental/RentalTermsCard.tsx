import { CalendarRange, Clock3, BellRing, Truck, MapPin, Zap } from 'lucide-react';
import { SaleCard } from '@/components/listing-detail/sale/SaleCard';
import RequirementsModal from '@/components/listing-detail/RequirementsModal';
import CancellationPolicyCard from '@/components/trust/CancellationPolicyCard';
import { deliveryRateLabel } from '@/lib/fulfillment/delivery';

interface RentalTermsCardProps {
  listingId: string;
  availableFrom?: string | null;
  availableTo?: string | null;
  minDays?: number | null;
  minHours?: number | null;
  minNoticeHours?: number | null;
  hourlyEnabled?: boolean;
  instantBook?: boolean;
  fulfillmentType?: string | null;
  deliveryFee?: number | null;
  deliveryFeeType?: unknown;
  deliveryRadiusMiles?: number | null;
  locationShort?: string | null;
  children?: React.ReactNode;
}

const fmtDate = (value?: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * One card for everything a renter has to agree to before booking:
 * availability window, minimums, handoff, documents and cancellation.
 */
export const RentalTermsCard = ({
  listingId,
  availableFrom,
  availableTo,
  minDays,
  minHours,
  minNoticeHours,
  hourlyEnabled,
  instantBook,
  fulfillmentType,
  deliveryFee,
  deliveryFeeType,
  deliveryRadiusMiles,
  locationShort,
  children,
}: RentalTermsCardProps) => {
  const from = fmtDate(availableFrom);
  const to = fmtDate(availableTo);
  const window = from || to ? `${from || 'Now'} – ${to || 'ongoing'}` : 'Select dates in the booking calendar';

  const minimum = hourlyEnabled && minHours
    ? `${minHours} hour${minHours === 1 ? '' : 's'}`
    : minDays
      ? `${minDays} day${minDays === 1 ? '' : 's'}`
      : 'No minimum';

  const doesPickup = fulfillmentType === 'pickup' || fulfillmentType === 'both';
  const doesDelivery = fulfillmentType === 'delivery' || fulfillmentType === 'both';
  const deliveryLabel = deliveryRateLabel(deliveryFee, deliveryFeeType);

  const facts = [
    { icon: CalendarRange, label: 'Available', value: window },
    { icon: Clock3, label: 'Minimum booking', value: minimum },
    minNoticeHours
      ? { icon: BellRing, label: 'Advance notice', value: `${minNoticeHours} hours` }
      : null,
    {
      icon: Zap,
      label: 'Booking type',
      value: instantBook ? 'Instant Book' : 'Host reviews each request',
    },
  ].filter(Boolean) as { icon: React.ComponentType<{ className?: string }>; label: string; value: string }[];

  return (
    <SaleCard padding="lg" className="space-y-5">
      <h2 className="text-lg font-semibold">Availability &amp; rental terms</h2>

      <div className="grid sm:grid-cols-2 gap-4">
        {facts.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-3">
            <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-medium">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {(doesPickup || doesDelivery) && (
        <div className="space-y-2 pt-1 border-t border-border">
          <p className="text-sm font-medium pt-3">Pickup &amp; delivery</p>
          {doesPickup && (
            <p className="text-sm text-muted-foreground flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              Pick up{locationShort ? ` near ${locationShort}` : ''} — the exact address unlocks once
              your booking is confirmed.
            </p>
          )}
          {doesDelivery && (
            <p className="text-sm text-muted-foreground flex items-start gap-2">
              <Truck className="h-4 w-4 mt-0.5 shrink-0" />
              Host delivers{deliveryRadiusMiles ? ` within ${deliveryRadiusMiles} miles` : ''}
              {deliveryLabel ? ` — ${deliveryLabel}` : ''}. Add your address during booking.
            </p>
          )}
        </div>
      )}

      {children}

      <div className="space-y-3 pt-1">
        <RequirementsModal listingId={listingId} />
        <CancellationPolicyCard isRental />
      </div>
    </SaleCard>
  );
};

export default RentalTermsCard;
