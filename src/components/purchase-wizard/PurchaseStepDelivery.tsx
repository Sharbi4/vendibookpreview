import { MapPin, Truck, Package, Check, Loader2, AlertCircle, CheckCircle2, AlertTriangle, Clock, MessageSquare, Info, CalendarClock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AddressAutocomplete } from '@/components/listing-detail/AddressAutocomplete';
import NextStepHint from '@/components/shared/NextStepHint';
import { FreightInfoPopover } from '@/components/shared/InfoPopover';
import InfoPopover from '@/components/shared/InfoPopover';

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

const NEXT_STEPS: Record<FulfillmentSelection, { title: string; body: string }[]> = {
  pickup: [
    { title: 'Message the seller', body: 'After checkout, use in-app Messages to schedule an exact pickup time.' },
    { title: 'Meet & inspect', body: 'Meet at the seller\'s pickup location. Inspect the item before you leave.' },
    { title: 'Confirm receipt', body: 'Mark the item as received in your dashboard — payment releases to the seller.' },
  ],
  delivery: [
    { title: 'Seller coordinates delivery', body: 'The seller will contact you within 24h to schedule a delivery window.' },
    { title: 'Delivery to your address', body: 'Have someone available to receive and inspect the item at drop-off.' },
    { title: 'Confirm receipt', body: 'Confirm in your dashboard — funds release to the seller after the protection window.' },
  ],
  vendibook_freight: [
    { title: 'Freight scheduling', body: 'Vendibook Freight contacts you within 2 business days to schedule pickup and delivery.' },
    { title: 'Nationwide transit', body: '7–10 business days typical transit. You\'ll get tracking updates throughout.' },
    { title: 'Inspect on delivery', body: 'Inspect the item before signing. Note any damage on the driver\'s BOL immediately.' },
  ],
};

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
    tagline: 'You pick up from the seller\'s location.',
    eta: 'Coordinate within 24h',
    etaSub: 'Message the seller in-app to lock a time',
    explainerTitle: 'How pickup coordination works',
    explainerBody: 'Once payment is protected, you and the seller exchange messages to agree on an exact pickup time and address. The precise location is revealed to you after checkout.',
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
    tagline: 'Nationwide freight, scheduling included.',
    eta: '7–10 business days',
    etaSub: 'Scheduled pickup + delivery with tracking',
    explainerTitle: 'How Vendibook Freight works',
    explainerBody: 'We coordinate carrier pickup at the seller and delivery to you. Rate is quoted live from real freight brokers based on address, size, and weight. Insurance is included on eligible shipments.',
  },
};

const NextStepsPanel = ({ selection }: { selection: FulfillmentSelection }) => {
  const steps = NEXT_STEPS[selection];
  return (
    <div className="rounded-md border border-border bg-card/60 backdrop-blur-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">What to expect after checkout</h4>
      </div>
      <ol className="space-y-2.5">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3 text-xs">
            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 border border-primary/30 text-[10px] font-semibold text-primary shrink-0">
              {i + 1}
            </span>
            <div>
              <p className="font-medium text-foreground">{s.title}</p>
              <p className="text-muted-foreground mt-0.5">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
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
            <span className="font-semibold text-foreground">{meta.name}</span>
            {selection === 'vendibook_freight' && <FreightInfoPopover />}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{meta.tagline}</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium text-foreground">{meta.eta}</span>
            <span className="opacity-60">·</span>
            <span>{meta.etaSub}</span>
          </div>
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
            <span className="font-semibold text-foreground">{meta.explainerTitle}. </span>
            <span className="text-muted-foreground">{meta.explainerBody}</span>
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

  const isSingleMethod = fulfillmentOptions.length === 1;
  const showRadios = !isSingleMethod;

  const pickupPriceNode = <span className="text-emerald-500">FREE</span>;
  const deliveryPriceNode = deliveryFee
    ? <span className="text-foreground">+${deliveryFee.toLocaleString()}</span>
    : deliveryFeeType === 'per_mile' && deliveryRateText
      ? <span className="text-xs font-normal text-muted-foreground">{deliveryRateText}</span>
      : <span className="text-emerald-500">FREE</span>;
  const freightPriceNode = isFreightSellerPaid
    ? <span className="text-emerald-500">FREE</span>
    : hasValidEstimate && freightCost > 0
      ? <span className="text-foreground">+${freightCost.toLocaleString()}</span>
      : <span className="text-xs font-normal text-muted-foreground">Quote below</span>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">
          {isSingleMethod ? 'How you\'ll get it' : 'Choose how you\'ll get it'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
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
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                <MessageSquare className="h-3 w-3" />
                Exact address shared in Messages once payment is protected.
              </p>
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
                    ${freightCost.toLocaleString()}
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
          </MethodCard>
        )}
      </div>

      {/* Always show next-steps for the selected method — never leave an empty step */}
      <NextStepsPanel selection={fulfillmentSelected} />

      <NextStepHint text="Review your order and complete payment next." />

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
          Continue to review
        </Button>
      </div>
    </div>
  );
};

export default PurchaseStepDelivery;
