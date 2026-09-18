import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Truck, Package, Check, Loader2, AlertCircle, CheckCircle2, AlertTriangle, Info, CalendarClock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AddressAutocomplete } from '@/components/listing-detail/AddressAutocomplete';
import NextStepHint from '@/components/shared/NextStepHint';
import { FreightLink, linkifyFreight } from '@/components/shared/FreightLink';
import { FreightInfoPopover } from '@/components/shared/InfoPopover';
import InfoPopover from '@/components/shared/InfoPopover';
import { formatCurrency } from '@/lib/commissions';

type FulfillmentSelection = 'pickup' | 'delivery' | 'vendibook_freight';

interface PurchaseStepDeliveryProps {
  fulfillmentOptions: FulfillmentSelection[];
  fulfillmentSelected: FulfillmentSelection;
  setFulfillmentSelected: (value: FulfillmentSelection) => void;
  deliveryAddress: string;
  setDeliveryAddress: (value: string) => void;
  setDeliveryCoords: (coords: [number, number] | null) => void;
  deliveryFee: number;
  /** e.g. "$4.50/mile" or "$150 per delivery" — how the seller prices delivery */
  deliveryRateText?: string | null;
  deliveryFeeType?: 'flat' | 'per_mile';
  deliveryRadiusMiles: number | null;
  deliveryDistanceInfo: { distance: number | null; isOutsideRadius: boolean };
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
  onBack: () => void;
  onContinue: () => void;
  /** Host page owns the stepper footer (light sale checkout). */
  embedded?: boolean;
  /** Reported upward so the host footer can disable Continue. */
  onCanContinueChange?: (ok: boolean) => void;
  // Optional listing context for richer pickup/next-step copy
  listingCity?: string | null;
  listingState?: string | null;
  // Structured scheduling — replaces "tell the seller in Messages later"
  preferredDate: string;
  setPreferredDate: (value: string) => void;
  preferredWindow: DeliveryWindow | '';
  setPreferredWindow: (value: DeliveryWindow | '') => void;
  onSiteContact: string;
  setOnSiteContact: (value: string) => void;
}

export type DeliveryWindow = 'morning' | 'afternoon' | 'evening' | 'flexible';

export const DELIVERY_WINDOW_LABELS: Record<DeliveryWindow, string> = {
  morning: 'Morning (8am – 12pm)',
  afternoon: 'Afternoon (12pm – 4pm)',
  evening: 'Evening (4pm – 8pm)',
  flexible: 'Flexible — any time that day',
};

export type { PurchaseStepDeliveryProps };

/** Earliest date a buyer can request: tomorrow, in the buyer's local time. */
const minPreferredDate = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

interface SchedulingFieldsProps {
  mode: 'delivery' | 'vendibook_freight';
  preferredDate: string;
  setPreferredDate: (value: string) => void;
  preferredWindow: DeliveryWindow | '';
  setPreferredWindow: (value: DeliveryWindow | '') => void;
  onSiteContact: string;
  setOnSiteContact: (value: string) => void;
}

const SchedulingFields = ({
  mode,
  preferredDate,
  setPreferredDate,
  preferredWindow,
  setPreferredWindow,
  onSiteContact,
  setOnSiteContact,
}: SchedulingFieldsProps) => (
  <div className="rounded-lg border border-border bg-background/40 p-4 space-y-4">
    <div className="flex items-center gap-2">
      <CalendarClock className="h-4 w-4 text-primary" />
      <h4 className="text-sm font-semibold text-foreground">
        {mode === 'delivery' ? 'Preferred delivery window' : 'Preferred receiving window'}
      </h4>
    </div>
    <p className="text-xs text-muted-foreground -mt-2">
      {mode === 'delivery'
        ? 'The seller confirms the exact time after checkout — this gives them your target.'
        : 'Freight scheduling uses this as your target receiving day. Carriers confirm a final window.'}
    </p>

    <div className="grid sm:grid-cols-2 gap-3">
      <div>
        <Label htmlFor="preferredDate" className="text-sm font-medium mb-1.5 block">
          Preferred date {mode === 'delivery' ? '*' : ''}
        </Label>
        <input
          id="preferredDate"
          type="date"
          min={minPreferredDate()}
          value={preferredDate}
          onChange={(e) => setPreferredDate(e.target.value)}
          className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div>
        <Label htmlFor="preferredWindow" className="text-sm font-medium mb-1.5 block">
          Time of day
        </Label>
        <select
          id="preferredWindow"
          value={preferredWindow}
          onChange={(e) => setPreferredWindow(e.target.value as DeliveryWindow | '')}
          className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Select a window</option>
          {(Object.keys(DELIVERY_WINDOW_LABELS) as DeliveryWindow[]).map((w) => (
            <option key={w} value={w}>{DELIVERY_WINDOW_LABELS[w]}</option>
          ))}
        </select>
      </div>
    </div>

    <div>
      <Label htmlFor="onSiteContact" className="text-sm font-medium mb-1.5 block">
        On-site contact at drop-off
      </Label>
      <input
        id="onSiteContact"
        type="text"
        value={onSiteContact}
        onChange={(e) => setOnSiteContact(e.target.value)}
        placeholder="Name and phone of whoever will receive it"
        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <p className="text-xs text-muted-foreground mt-1.5">
        Leave blank if that's you — we'll use your checkout phone number.
      </p>
    </div>
  </div>
);

const METHOD_META: Record<FulfillmentSelection, {
  icon: typeof MapPin;
  name: string;
  tagline: string;
  eta: string;
  etaSub: string;
  explainerTitle: string;
  explainerBody: string;
}> = {
  pickup: {
    icon: MapPin,
    name: 'Local Pickup',
    tagline: 'Pick up directly from the seller.',
    eta: '',
    etaSub: '',
    explainerTitle: 'Pickup details',
    explainerBody: 'After payment, use Vendibook Messages to agree on a pickup time and receive the exact handoff location.',
  },
  delivery: {
    icon: Truck,
    name: 'Local Delivery',
    tagline: 'The seller brings the item to your address.',
    eta: 'Typically within 3–7 days',
    etaSub: 'The seller will confirm an exact delivery window',
    explainerTitle: 'What affects the delivery fee',
    explainerBody: 'The delivery fee is set by the seller and reflects distance, item size, and any special handling. Some sellers include delivery inside a radius at no charge.',
  },
  vendibook_freight: {
    icon: Package,
    name: 'Vendibook Freight',
    tagline: 'Long-distance freight, scheduling included.',
    eta: '7–10 business days',
    etaSub: 'Estimated transit — actual pickup and delivery timing can vary',
    explainerTitle: 'How Vendibook Freight works',
    explainerBody: 'We coordinate carrier pickup at the seller and delivery to you. The estimate is calculated from the route distance using a per-mile rate plus a fuel surcharge and handling fee. Freight is finalized as a separate step after the seller confirms the sale.',
  },
};

interface MethodCardProps {
  selection: FulfillmentSelection;
  selected: boolean;
  onSelect: () => void;
  priceNode: React.ReactNode;
  showRadio: boolean;
  children?: React.ReactNode;
}

const MethodCard = ({ selection, selected, onSelect, priceNode, showRadio, children }: MethodCardProps) => {
  const meta = METHOD_META[selection];
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        'rounded-lg border-2 transition-all overflow-hidden',
        selected
          ? 'border-primary bg-primary/[0.05] shadow-[0_0_0_1px_rgba(255,81,36,0.35)]'
          : 'border-border bg-card/40 hover:border-white/25',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={!showRadio}
        className={cn(
          'w-full flex items-start gap-4 p-5 text-left',
          showRadio && 'hover:bg-muted/20 transition-colors cursor-pointer',
          !showRadio && 'cursor-default',
        )}
      >
        <div
          className={cn(
            'flex items-center justify-center w-12 h-12 rounded-xl shrink-0',
            selected ? 'bg-primary/10' : 'bg-muted',
          )}
        >
          <Icon className={cn('h-6 w-6', selected ? 'text-primary' : 'text-muted-foreground')} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">{linkifyFreight(meta.name)}</span>
            {selection === 'vendibook_freight' && <FreightInfoPopover />}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{meta.tagline}</p>
          {meta.eta ? <p className="mt-2 text-xs text-muted-foreground"><span className="font-medium text-foreground">{meta.eta}</span> · {meta.etaSub}</p> : null}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="text-sm font-semibold">{priceNode}</div>
          {showRadio && selected && (
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <Check className="w-4 h-4 text-primary-foreground" />
            </div>
          )}
        </div>
      </button>

      {/* Explainer strip */}
      <div className="px-4 pb-4 -mt-1">
        <div className="rounded-lg bg-muted/40 border border-border px-3 py-2.5 flex gap-2">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold text-foreground">{linkifyFreight(meta.explainerTitle)}. </span>
            <span className="text-muted-foreground">{linkifyFreight(meta.explainerBody)}</span>
            {selection === 'vendibook_freight' && (
              <>
                {' '}
                <Link
                  to="/vendibook-freight"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  Learn about Vendibook Freight
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {selected && children ? (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-4 bg-muted/[0.15]">
          {children}
        </div>
      ) : null}
    </div>
  );
};

const PurchaseStepDelivery = ({
  fulfillmentOptions,
  fulfillmentSelected,
  setFulfillmentSelected,
  deliveryAddress,
  setDeliveryAddress,
  setDeliveryCoords,
  deliveryFee,
  deliveryRateText,
  deliveryFeeType = 'flat',
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
  onBack,
  onContinue,
  embedded = false,
  onCanContinueChange,
  listingCity,
  listingState,
  preferredDate,
  setPreferredDate,
  preferredWindow,
  setPreferredWindow,
  onSiteContact,
  setOnSiteContact,
}: PurchaseStepDeliveryProps) => {
  // A delivery the seller can't legally perform must never reach payment.
  const outsideRadius =
    fulfillmentSelected === 'delivery' && deliveryDistanceInfo.isOutsideRadius;

  const canContinue =
    fulfillmentSelected === 'pickup' ||
    (fulfillmentSelected === 'delivery' &&
      Boolean(deliveryAddress.trim()) &&
      Boolean(preferredDate) &&
      !outsideRadius) ||
    (fulfillmentSelected === 'vendibook_freight' && hasValidEstimate);

  // Let an embedding page (light sale checkout) drive its own footer state.
  useEffect(() => {
    onCanContinueChange?.(canContinue);
  }, [canContinue, onCanContinueChange]);


  const isSingleMethod = fulfillmentOptions.length === 1;
  const showRadios = !isSingleMethod;

  const pickupPriceNode = <span className="text-emerald-500">FREE</span>;
  const deliveryPriceNode = deliveryFee
    ? <span className="text-foreground">+{formatCurrency(deliveryFee)}</span>
    : deliveryFeeType === 'per_mile' && deliveryRateText
      ? <span className="text-xs font-normal text-muted-foreground">{deliveryRateText}</span>
      : <span className="text-emerald-500">FREE</span>;
  const freightPriceNode = isFreightSellerPaid
    ? <span className="text-emerald-500">FREE</span>
    : hasValidEstimate && freightCost > 0
      ? <span className="text-foreground">+{formatCurrency(freightCost)}</span>
      : <span className="text-xs font-normal text-muted-foreground">Quote below</span>;

  return (
    <div className="space-y-6">
      <div>
        {!embedded && (
          <h2 className="text-2xl font-bold text-foreground tracking-tight">
            {isSingleMethod ? 'How you\'ll get it' : 'Choose how you\'ll get it'}
          </h2>
        )}
        <p className={embedded ? 'text-sm text-muted-foreground' : 'text-sm text-muted-foreground mt-1'}>
          {isSingleMethod
            ? 'Here\'s the fulfillment option the seller offers for this item.'
            : 'Pick the option that works best for you. You can update details below.'}
        </p>
      </div>

      <div className="space-y-3">
        {fulfillmentOptions.includes('pickup') && (
          <MethodCard
            selection="pickup"
            selected={fulfillmentSelected === 'pickup'}
            onSelect={() => setFulfillmentSelected('pickup')}
            priceNode={pickupPriceNode}
            showRadio={showRadios}
          >
            <div className="rounded-lg border border-border bg-background/40 p-3">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Pickup area</span>
              </div>
              <p className="text-sm text-foreground">
                {listingCity && listingState ? `${listingCity}, ${listingState}` : 'Location shared after checkout'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                After payment, use Vendibook Messages to agree on a pickup time and receive the exact handoff location.
              </p>
              <Link to="/guides/meetup-inspection" className="mt-2 inline-flex text-xs font-semibold text-foreground underline underline-offset-4">
                How to prepare for pickup &amp; inspection →
              </Link>
            </div>
          </MethodCard>
        )}

        {fulfillmentOptions.includes('delivery') && (
          <MethodCard
            selection="delivery"
            selected={fulfillmentSelected === 'delivery'}
            onSelect={() => setFulfillmentSelected('delivery')}
            priceNode={deliveryPriceNode}
            showRadio={showRadios}
          >
            <div>
              <Label className="text-sm font-medium mb-2 block">Delivery address *</Label>
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
                placeholder="Start typing your delivery address"
              />
              {deliveryRateText && (
                <p className="text-xs text-muted-foreground mt-2">
                  {deliveryFeeType === 'per_mile'
                    ? `The seller charges ${deliveryRateText}. Your delivery charge is calculated from the distance to this address.`
                    : `The seller charges a flat ${deliveryRateText}.`}
                </p>
              )}
            </div>

            {deliveryDistanceInfo.distance !== null && (
              <div
                className={cn(
                  'flex items-start gap-2 p-3 rounded-lg text-sm',
                  deliveryDistanceInfo.isOutsideRadius
                    ? 'bg-amber-500/10 border border-amber-500/30'
                    : 'bg-emerald-500/10 border border-emerald-500/30',
                )}
              >
                {deliveryDistanceInfo.isOutsideRadius ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">Outside the seller's delivery zone</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        Your address is {deliveryDistanceInfo.distance} mi away — the seller delivers within {deliveryRadiusMiles} mi. Choose pickup or freight if offered, or message the seller to arrange it. You can't book delivery to this address.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">Within delivery zone</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        {deliveryDistanceInfo.distance} mi from seller
                        {deliveryRadiusMiles ? ` (radius: ${deliveryRadiusMiles} mi)` : ''}.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {!outsideRadius && (
              <SchedulingFields
                mode="delivery"
                preferredDate={preferredDate}
                setPreferredDate={setPreferredDate}
                preferredWindow={preferredWindow}
                setPreferredWindow={setPreferredWindow}
                onSiteContact={onSiteContact}
                setOnSiteContact={setOnSiteContact}
              />
            )}
          </MethodCard>
        )}

        {fulfillmentOptions.includes('vendibook_freight') && (
          <MethodCard
            selection="vendibook_freight"
            selected={fulfillmentSelected === 'vendibook_freight'}
            onSelect={() => setFulfillmentSelected('vendibook_freight')}
            priceNode={freightPriceNode}
            showRadio={showRadios}
          >
            <div>
              <Label className="text-sm font-medium mb-2 block">Delivery address *</Label>
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
                  if (addr.validation.isComplete) fetchFreightEstimate(addr.fullAddress);
                }}
                onValidationChange={(validation) => setIsAddressComplete(validation?.isComplete ?? false)}
                placeholder="Enter delivery address for a live freight quote"
                requireComplete
              />
            </div>

            {isEstimating && (
              <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Getting live freight quote…</span>
              </div>
            )}

            {hasValidEstimate && !isEstimating && (
              <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm text-foreground">
                    {isFreightSellerPaid ? 'Free shipping — seller pays freight' : 'Quote ready'}
                  </span>
                </div>
                {!isFreightSellerPaid && freightCost > 0 && (
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(freightCost)}
                  </span>
                )}
              </div>
            )}

            {estimateError && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{estimateError}</span>
              </div>
            )}

            {hasValidEstimate && (
              <SchedulingFields
                mode="vendibook_freight"
                preferredDate={preferredDate}
                setPreferredDate={setPreferredDate}
                preferredWindow={preferredWindow}
                setPreferredWindow={setPreferredWindow}
                onSiteContact={onSiteContact}
                setOnSiteContact={setOnSiteContact}
              />
            )}
          </MethodCard>
        )}
      </div>

      {!embedded && (
        <>
          <NextStepHint text="Next, confirm your details." />

          <div className="flex gap-3">
            <Button variant="outline" onClick={onBack} className="flex-1" size="lg">
              Back
            </Button>
            <Button
              onClick={onContinue}
              disabled={!canContinue}
              className="flex-1"
              size="lg"
            >
              Continue
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default PurchaseStepDelivery;
