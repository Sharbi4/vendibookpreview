import { useCallback, useMemo, useState } from 'react';
import { Truck, MapPin, Loader2, CheckCircle2, AlertCircle, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { invokeEdge } from '@/lib/edge/invokeFunction';
import {
  deliveryRateLabel,
  estimateDelivery,
  formatUsd,
  normalizeDeliveryFeeType,
  type DeliveryEstimate,
} from '@/lib/fulfillment/delivery';
import { cn } from '@/lib/utils';

interface DeliveryAvailabilityPanelProps {
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  state?: string | null;
  fulfillmentType?: string | null;
  deliveryRadiusMiles?: number | null;
  deliveryFee?: number | null;
  deliveryFeeType?: string | null;
  vendibookFreightEnabled?: boolean;
  freightPayer?: string | null;
  className?: string;
}

function distanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type CheckResult = {
  zip: string;
  place: string;
  miles: number;
  inRadius: boolean;
  estimate: DeliveryEstimate;
};

export const DeliveryAvailabilityPanel = ({
  latitude,
  longitude,
  city,
  state,
  fulfillmentType,
  deliveryRadiusMiles,
  deliveryFee,
  deliveryFeeType,
  vendibookFreightEnabled = false,
  freightPayer,
  className,
}: DeliveryAvailabilityPanelProps) => {
  const [zip, setZip] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);

  const sellerDelivers = fulfillmentType === 'delivery' || fulfillmentType === 'both';
  const rateLabel = deliveryRateLabel(deliveryFee, deliveryFeeType);
  const perMile = normalizeDeliveryFeeType(deliveryFeeType) === 'per_mile';
  const radius = Number(deliveryRadiusMiles) || 0;
  const canCheck = sellerDelivers && typeof latitude === 'number' && typeof longitude === 'number' && radius > 0;

  const originLabel = useMemo(
    () => [city, state].filter(Boolean).join(', ') || 'the seller’s area',
    [city, state],
  );

  const handleCheck = useCallback(async () => {
    if (zip.length !== 5 || !canCheck) return;
    setChecking(true);
    setError(null);
    setResult(null);
    try {
      const { data, error: edgeError } = await invokeEdge<{ results?: any[] }>(
        'geocode-location',
        { body: { query: zip, limit: 1 } },
        { retries: 2 },
      );
      if (edgeError) throw new Error(edgeError);
      const hit = data?.results?.[0];
      const [lng, lat] = Array.isArray(hit?.center) ? hit.center : [];
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        setError("We couldn't find that ZIP code. Double-check the digits and try again.");
        return;
      }
      const miles = Math.round(distanceMiles(latitude as number, longitude as number, lat, lng));
      setResult({
        zip,
        place: [hit?.city || hit?.text, hit?.state || hit?.context].filter(Boolean).join(', '),
        miles,
        inRadius: miles <= radius,
        estimate: estimateDelivery(deliveryFee, deliveryFeeType, miles),
      });
    } catch (e) {
      console.error('[DeliveryAvailabilityPanel] ZIP check failed:', e);
      setError('We had trouble checking that ZIP right now. Please try again.');
    } finally {
      setChecking(false);
    }
  }, [zip, canCheck, latitude, longitude, radius, deliveryFee, deliveryFeeType]);

  if (!sellerDelivers && !vendibookFreightEnabled) return null;

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm p-5 sm:p-6',
        className,
      )}
      aria-labelledby="delivery-availability-heading"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/15 to-transparent" />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="delivery-availability-heading" className="text-lg font-semibold flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Delivery &amp; shipping
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {sellerDelivers
              ? `Ships from ${originLabel}${radius ? ` · seller delivers within ${radius} miles` : ''}`
              : `Ships from ${originLabel}`}
          </p>
        </div>
        {rateLabel && sellerDelivers && (
          <Badge variant="secondary" className="whitespace-nowrap">{rateLabel}</Badge>
        )}
      </div>

      {canCheck && (
        <div className="mt-5 space-y-3">
          <Label htmlFor="delivery-zip" className="text-sm">
            Check if the seller delivers to you
          </Label>
          <div className="flex gap-2">
            <Input
              id="delivery-zip"
              inputMode="numeric"
              placeholder="Your ZIP code"
              value={zip}
              maxLength={5}
              onChange={(e) => {
                setZip(e.target.value.replace(/\D/g, '').slice(0, 5));
                setResult(null);
                setError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
              className="text-base max-w-[180px]"
            />
            <Button type="button" onClick={handleCheck} disabled={zip.length !== 5 || checking}>
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check'}
            </Button>
          </div>

          {error && (
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> {error}
            </p>
          )}

          {result && (
            <div
              className={cn(
                'rounded-xl border p-4 text-sm',
                result.inRadius
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-amber-500/30 bg-amber-500/5',
              )}
            >
              <p className="font-medium flex items-center gap-2">
                {result.inRadius ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                )}
                {result.inRadius
                  ? `Yes — delivery is available to ${result.place || result.zip}`
                  : `Outside the seller's ${radius}-mile delivery area`}
              </p>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                <Route className="h-4 w-4" />
                About {result.miles} miles straight-line from {originLabel} (~{result.estimate.roadMiles} mi by road).
              </p>
              {result.inRadius && result.estimate.maxFee > 0 && (
                <div className="mt-3 rounded-lg border border-border/60 bg-background/40 p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-muted-foreground">Estimated delivery</span>
                    <span className="text-foreground font-semibold">
                      {result.estimate.isRange
                        ? `${formatUsd(result.estimate.minFee)}–${formatUsd(result.estimate.maxFee)}`
                        : formatUsd(result.estimate.fee)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {perMile
                      ? `${rateLabel} × ~${result.estimate.minMiles}–${result.estimate.maxMiles} driving miles (about ${result.estimate.roadMiles} mi by road).`
                      : `${rateLabel} — flat rate set by the seller.`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on ZIP-center distance, so the final amount is confirmed at checkout once you enter your full address.
                  </p>
                </div>
              )}
              {!result.inRadius && (
                <p className="mt-1 text-muted-foreground">
                  {vendibookFreightEnabled
                    ? 'Vendibook Freight can still ship this to you — see below.'
                    : 'You can still message the seller to ask about longer-distance delivery.'}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {sellerDelivers && !canCheck && (
        <p className="mt-4 text-sm text-muted-foreground flex items-start gap-2">
          <MapPin className="h-4 w-4 mt-0.5" />
          The seller offers delivery. Enter your delivery address at checkout for a final quote.
        </p>
      )}

      {vendibookFreightEnabled && (
        <div className="mt-5 rounded-xl border border-border/60 bg-background/40 p-4">
          <p className="font-medium flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            Vendibook Freight available
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Freight shipping is available to all 48 contiguous states, so distance isn’t a dealbreaker.
            {freightPayer === 'seller'
              ? ' The seller covers freight on this listing.'
              : ' Freight is quoted by distance and paid by the buyer.'}
          </p>
        </div>
      )}
    </section>
  );
};

export default DeliveryAvailabilityPanel;
