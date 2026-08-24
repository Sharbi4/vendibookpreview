import { useCallback, useEffect, useState } from 'react';
import {
  Truck,
  Package,
  MapPin,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { invokeEdge } from '@/lib/edge/invokeFunction';
import { useFreightEstimate } from '@/hooks/useFreightEstimate';
import {
  deliveryRateLabel,
  estimateDelivery,
  formatUsd,
  normalizeDeliveryFeeType,
  type DeliveryEstimate,
} from '@/lib/fulfillment/delivery';
import { cn } from '@/lib/utils';
import { FreightLink } from '@/components/shared/FreightLink';

export type DeliveryChoice = {
  /** Matches the checkout's FulfillmentSelection values. */
  method: 'delivery' | 'vendibook_freight';
  zip: string;
  place: string;
  miles: number;
  /** Human-readable charge shown to the buyer, e.g. "$450" or "Free". */
  chargeLabel: string;
  amount: number | null;
};

interface DeliveryCheckSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: any;
  zip: string;
  onContinue: (choice: DeliveryChoice) => void;
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

const OptionRow = ({
  icon: Icon,
  title,
  charge,
  detail,
  selected,
  onSelect,
  selectable,
  tone = 'ok',
}: {
  icon: any;
  title: string;
  charge?: string | null;
  detail: string;
  selected?: boolean;
  onSelect?: () => void;
  selectable?: boolean;
  tone?: 'ok' | 'muted';
}) => {
  const Wrapper: any = selectable ? 'button' : 'div';
  return (
    <Wrapper
      type={selectable ? 'button' : undefined}
      onClick={onSelect}
      className={cn(
        'w-full text-left flex items-start gap-3 rounded-2xl px-4 py-3.5 transition',
        selectable ? 'ring-1 ring-border/70 hover:ring-foreground/25' : '',
        selected && 'ring-2 ring-primary bg-primary/[0.04]',
        tone === 'muted' && 'opacity-80',
      )}
    >
      <Icon
        className={cn(
          'h-[18px] w-[18px] mt-0.5 shrink-0',
          tone === 'ok' ? 'text-emerald-600' : 'text-muted-foreground',
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-semibold">{title}</span>
          {charge && <span className="text-sm font-semibold shrink-0">{charge}</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{detail}</p>
      </div>
    </Wrapper>
  );
};

/**
 * Answers "can this get to me, and what does it cost?" on the listing page.
 *
 * Nothing here moves the buyer into checkout except the single continue CTA,
 * which carries the chosen method + address + estimate into the purchase flow.
 * All pricing comes from the seller's saved settings and the existing freight
 * estimator — no numbers are invented here.
 */
export const DeliveryCheckSheet = ({
  open,
  onOpenChange,
  listing,
  zip,
  onContinue,
}: DeliveryCheckSheetProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [place, setPlace] = useState('');
  const [miles, setMiles] = useState<number | null>(null);
  const [sellerEstimate, setSellerEstimate] = useState<DeliveryEstimate | null>(null);
  const [choice, setChoice] = useState<DeliveryChoice['method'] | null>(null);
  const { estimate: freight, getEstimate, clearEstimate } = useFreightEstimate();
  const [freightLoading, setFreightLoading] = useState(false);

  const fulfillmentType: string = listing?.fulfillment_type || 'pickup';
  const sellerDelivers = fulfillmentType === 'delivery' || fulfillmentType === 'both';
  const offersPickup =
    fulfillmentType === 'pickup' || fulfillmentType === 'on_site' || fulfillmentType === 'both';
  const freightEnabled = Boolean(listing?.vendibook_freight_enabled);
  const freightPayer = listing?.freight_payer === 'seller' ? 'seller' : 'buyer';
  const radius = Number(listing?.delivery_radius_miles) || 0;
  const rateLabel = deliveryRateLabel(listing?.delivery_fee, listing?.delivery_fee_type);
  const perMile = normalizeDeliveryFeeType(listing?.delivery_fee_type) === 'per_mile';
  const originLabel =
    [listing?.city, listing?.state].filter(Boolean).join(', ') || 'the seller’s area';

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSellerEstimate(null);
    setMiles(null);
    setChoice(null);
    clearEstimate();
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
      const label = [hit?.city || hit?.text, hit?.state].filter(Boolean).join(', ') || zip;
      setPlace(label);

      let straightMiles: number | null = null;
      if (typeof listing?.latitude === 'number' && typeof listing?.longitude === 'number') {
        straightMiles = distanceMiles(listing.latitude, listing.longitude, lat, lng);
        setMiles(Math.round(straightMiles));
        if (sellerDelivers) {
          setSellerEstimate(
            estimateDelivery(listing?.delivery_fee, listing?.delivery_fee_type, straightMiles),
          );
        }
      }

      if (freightEnabled) {
        setFreightLoading(true);
        await getEstimate({
          origin_address:
            [listing?.city, listing?.state, listing?.zip_code].filter(Boolean).join(', ') ||
            originLabel,
          destination_address: zip,
          origin_coords:
            typeof listing?.latitude === 'number' && typeof listing?.longitude === 'number'
              ? { lat: listing.latitude, lng: listing.longitude }
              : undefined,
          destination_coords: { lat, lng },
          item_category: 'oversized',
        }).finally(() => setFreightLoading(false));
      }

    } catch {
      setError('We had trouble checking that ZIP right now. Please try again.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zip, listing, sellerDelivers, freightEnabled]);

  useEffect(() => {
    if (open && zip.length === 5) void run();
    if (!open) {
      setChoice(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, zip]);

  const inRadius = sellerDelivers && radius > 0 && miles !== null && miles <= radius;
  const sellerAvailable = sellerDelivers && (radius <= 0 || inRadius);
  const freightAvailable = freightEnabled && Boolean(freight);

  const sellerCharge = (() => {
    if (!sellerEstimate || sellerEstimate.maxFee <= 0) return 'Free';
    return sellerEstimate.isRange
      ? `${formatUsd(sellerEstimate.minFee)}–${formatUsd(sellerEstimate.maxFee)}`
      : formatUsd(sellerEstimate.fee);
  })();

  const freightCharge = freightPayer === 'seller'
    ? 'Seller covers freight'
    : freight
      ? formatUsd(freight.total_cost)
      : null;

  const busy = loading || freightLoading;

  const handleContinue = () => {
    if (!choice) return;
    onContinue({
      method: choice,
      zip,
      place,
      miles: miles ?? 0,
      chargeLabel: choice === 'delivery' ? sellerCharge : freightCharge || 'Quoted at checkout',
      amount:
        choice === 'delivery'
          ? sellerEstimate?.fee ?? 0
          : freightPayer === 'seller'
            ? 0
            : freight?.total_cost ?? null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sale-light sm:max-w-lg rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-lg">Delivery to {place || zip}</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking delivery options for {zip}…
            </div>
          )}

          {!busy && error && (
            <p className="text-sm text-destructive flex items-center gap-2 py-4">
              <AlertCircle className="h-4 w-4" /> {error}
            </p>
          )}

          {!busy && !error && (
            <>
              <p className="text-sm text-muted-foreground">
                {miles !== null
                  ? `About ${miles} mi from ${originLabel}.`
                  : `Shipping from ${originLabel}.`}
              </p>

              {!sellerAvailable && !freightEnabled && (
                <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5 ring-1 ring-amber-500/30 bg-amber-500/[0.06]">
                  <AlertCircle className="h-[18px] w-[18px] mt-0.5 text-amber-600 shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold">Delivery isn’t available to {place || zip}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {sellerDelivers && radius > 0
                        ? `This address is outside the seller’s ${radius}-mile delivery area, and freight isn’t offered on this listing.`
                        : 'The seller doesn’t offer delivery on this listing.'}
                      {offersPickup ? ' Local pickup is still available.' : ''}
                    </p>
                  </div>
                </div>
              )}


              {sellerAvailable && (
                <OptionRow
                  icon={Truck}
                  title="Seller delivery available"
                  charge={sellerCharge}
                  detail={
                    radius > 0
                      ? `Within the seller’s ${radius}-mile radius of ${originLabel}. ${
                          rateLabel
                            ? perMile
                              ? `${rateLabel} × ~${sellerEstimate?.minMiles}–${sellerEstimate?.maxMiles} driving miles.`
                              : `${rateLabel} — flat rate set by the seller.`
                            : 'The seller delivers at no extra charge.'
                        } Confirmed at checkout.`
                      : `${rateLabel || 'No extra charge'} — confirmed at checkout.`
                  }
                  selectable
                  selected={choice === 'delivery'}
                  onSelect={() => setChoice('delivery')}
                />
              )}

              {sellerDelivers && !sellerAvailable && (
                <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5 ring-1 ring-amber-500/25 bg-amber-500/[0.05]">
                  <AlertCircle className="h-[18px] w-[18px] mt-0.5 text-amber-600 shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold">Seller delivery unavailable for this address</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {place || zip} is about {miles} mi away, outside the seller’s {radius}-mile
                      delivery radius.
                      {freightEnabled ? <> <FreightLink /> can still ship it to you.</> : null}
                    </p>
                  </div>
                </div>
              )}

              {freightAvailable && freight && (
                <OptionRow
                  icon={Package}
                  title="Vendibook Freight available"
                  charge={freightCharge}
                  detail={`${freight.distance_miles.toLocaleString()} mi at $${freight.rate_per_mile.toFixed(2)}/mile, including fuel and handling. Estimated transit ${freight.estimated_transit_days.min}–${freight.estimated_transit_days.max} business days.${
                    freightPayer === 'seller' ? ' The seller covers freight on this listing.' : ''
                  }`}
                  selectable
                  selected={choice === 'vendibook_freight'}
                  onSelect={() => setChoice('vendibook_freight')}
                />
              )}

              {freightEnabled && !freight && (
                <OptionRow
                  icon={Package}
                  title="Vendibook Freight available"
                  charge="Quoted at checkout"
                  detail={`Freight shipping is offered on this listing${
                    miles !== null ? ` for the ~${miles} mi to ${place || zip}` : ''
                  }. We couldn’t calculate a live estimate right now — your exact freight amount is quoted before you pay.`}
                  selectable
                  selected={choice === 'vendibook_freight'}
                  onSelect={() => setChoice('vendibook_freight')}
                />
              )}


              {offersPickup && (
                <div className="flex items-start gap-3 pt-1">
                  <MapPin className="h-[18px] w-[18px] mt-0.5 text-muted-foreground shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Local pickup is also available at no charge — you don’t have to choose delivery.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-1">
                <Button
                  onClick={handleContinue}
                  disabled={!choice}
                  size="lg"
                  variant="cta"
                  className="w-full h-12"
                >
                  {choice === 'delivery'
                    ? 'Continue with seller delivery'
                    : choice === 'vendibook_freight'
                      ? 'Continue with Vendibook Freight'
                      : 'Select a delivery option'}
                  {choice && <ArrowRight className="h-4 w-4 ml-2" />}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
                  Keep browsing this listing
                </Button>
              </div>

              {(sellerAvailable || freightEnabled) && (
                <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 mt-px shrink-0 text-emerald-600" />
                  Estimates use ZIP-center distance; the final amount is confirmed at checkout once
                  you enter your full address.
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryCheckSheet;
