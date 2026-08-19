import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Tag,
  MessageSquare,
  MapPin,
  Truck,
  Package,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Banknote,
  ExternalLink,
  Lock,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { invokeEdge } from '@/lib/edge/invokeFunction';
import { MakeOfferModal } from '@/components/offers/MakeOfferModal';
import { AuthGateOfferModal } from '@/components/offers/AuthGateOfferModal';
import MessageHostForm from '@/components/messaging/MessageHostForm';
import { FinancingAvailableBadge } from '@/components/financing/FinancingAvailableBadge';
import { useEquinoxFinancingEnabled } from '@/hooks/useListingFinancing';
import { PayPalMonogram, PayPalWordmark } from '@/components/brand/ProviderLogos';
import { getPublicDisplayName } from '@/lib/displayName';
import { formatLastActive } from '@/hooks/useActivityTracker';
import {
  deliveryRateLabel,
  estimateDelivery,
  formatUsd,
  normalizeDeliveryFeeType,
} from '@/lib/fulfillment/delivery';
import { trackCTAClick } from '@/lib/analytics';
import { trackFinancingApplyClick, trackFinancingLearnMoreClick } from '@/lib/analytics';
import { SaleCard } from './SaleCard';

interface SalePurchaseCardProps {
  listing: any;
  host: any;
  isOwner: boolean;
  sellerVerified: boolean;
  ratingData?: { average: number; count: number } | null;
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

const FulfillmentRow = ({
  icon: Icon,
  label,
  note,
  free,
}: { icon: any; label: string; note?: string | null; free?: boolean }) => (
  <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] ring-hairline px-3 py-2.5">
    <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
      <Icon className="h-4 w-4" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium leading-tight">{label}</div>
      {note && <div className="text-xs text-muted-foreground mt-0.5 truncate">{note}</div>}
    </div>
    {free && <span className="text-xs text-emerald-400 shrink-0">Free</span>}
  </div>
);

/**
 * The single purchase surface for a for-sale listing.
 *
 * Everything a buyer needs to transact lives here — price, fulfillment
 * options, the delivery/address check, financing availability, the primary
 * CTAs and compact seller info. These must NOT be repeated in the page body.
 */
export const SalePurchaseCard = ({
  listing,
  host,
  isOwner,
  sellerVerified,
  ratingData,
}: SalePurchaseCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const financingEnabled = useEquinoxFinancingEnabled(listing);

  const [showOffer, setShowOffer] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [pending, setPending] = useState<'buy' | 'offer' | null>(null);
  const [showContact, setShowContact] = useState(false);
  const [applying, setApplying] = useState(false);

  // Delivery / address check
  const [zip, setZip] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    place: string;
    miles: number;
    inRadius: boolean;
    fee: string | null;
  } | null>(null);

  const priceSale: number | null = listing?.price_sale ?? null;
  const fulfillmentType: string = listing?.fulfillment_type ?? 'pickup';
  const sellerDelivers = fulfillmentType === 'delivery' || fulfillmentType === 'both';
  const offersPickup = fulfillmentType === 'pickup' || fulfillmentType === 'both';
  const freightEnabled = Boolean(listing?.vendibook_freight_enabled);
  const freightPayer = listing?.freight_payer === 'seller' ? 'seller' : 'buyer';
  const radius = Number(listing?.delivery_radius_miles) || 0;
  const rateLabel = deliveryRateLabel(listing?.delivery_fee, listing?.delivery_fee_type);
  const perMile = normalizeDeliveryFeeType(listing?.delivery_fee_type) === 'per_mile';
  const isAvailable = listing?.status === 'published';
  const canCheck =
    sellerDelivers &&
    typeof listing?.latitude === 'number' &&
    typeof listing?.longitude === 'number' &&
    radius > 0;
  const originLabel = [listing?.city, listing?.state].filter(Boolean).join(', ') || 'the seller’s area';

  const handleCheck = useCallback(async () => {
    if (zip.length !== 5 || !canCheck) return;
    setChecking(true);
    setCheckError(null);
    setResult(null);
    try {
      const { data, error } = await invokeEdge<{ results?: any[] }>(
        'geocode-location',
        { body: { query: zip, limit: 1 } },
        { retries: 2 },
      );
      if (error) throw new Error(error);
      const hit = data?.results?.[0];
      const [lng, lat] = Array.isArray(hit?.center) ? hit.center : [];
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        setCheckError("We couldn't find that ZIP code.");
        return;
      }
      const miles = Math.round(distanceMiles(listing.latitude, listing.longitude, lat, lng));
      const est = estimateDelivery(listing?.delivery_fee, listing?.delivery_fee_type, miles);
      setResult({
        place: [hit?.city || hit?.text, hit?.state].filter(Boolean).join(', ') || zip,
        miles,
        inRadius: miles <= radius,
        fee:
          est.maxFee > 0
            ? est.isRange
              ? `${formatUsd(est.minFee)}–${formatUsd(est.maxFee)}`
              : formatUsd(est.fee)
            : null,
      });
    } catch {
      setCheckError('We had trouble checking that ZIP. Please try again.');
    } finally {
      setChecking(false);
    }
  }, [zip, canCheck, listing, radius]);

  const gate = (action: 'buy' | 'offer') => {
    if (!user) {
      setPending(action);
      setShowAuthGate(true);
      return false;
    }
    return true;
  };

  const handleBuy = () => {
    trackCTAClick('buy_now', 'sale_purchase_card');
    if (!gate('buy')) return;
    navigate(`/checkout/${listing.id}`);
  };

  const handleOffer = () => {
    trackCTAClick('make_offer', 'sale_purchase_card');
    if (!gate('offer')) return;
    setShowOffer(true);
  };

  const handleAuthSuccess = () => {
    setShowAuthGate(false);
    if (pending === 'buy') navigate(`/checkout/${listing.id}`);
    else if (pending === 'offer') setShowOffer(true);
    setPending(null);
  };

  const handleApplyFinancing = async () => {
    trackFinancingApplyClick('listing_panel', listing.id);
    setApplying(true);
    const win = window.open('', '_blank', 'noopener,noreferrer');
    try {
      const { data, error } = await supabase.functions.invoke('financing-apply-link', {
        body: { listingId: listing.id },
      });
      if (error || !data?.applyUrl) throw new Error('apply_unavailable');
      if (win) win.location.href = data.applyUrl;
      else window.location.href = data.applyUrl;
    } catch {
      win?.close();
      toast.error('Could not open the financing application. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  if (isOwner) {
    return (
      <SaleCard padding="lg" className="space-y-3">
        <div className="text-3xl font-bold">
          {priceSale ? `$${priceSale.toLocaleString()}` : 'Price on request'}
        </div>
        <p className="text-sm text-muted-foreground">
          This is your listing. Buyers see the purchase actions here.
        </p>
        <Button variant="outline" className="w-full" asChild>
          <Link to={`/edit-listing/${listing.id}`}>Manage listing</Link>
        </Button>
      </SaleCard>
    );
  }

  const sellerName = getPublicDisplayName(host, 'Seller');

  return (
    <>
      <SaleCard padding="none" className="overflow-hidden">
        {/* Price */}
        <div className="px-5 sm:px-6 py-5 border-b border-white/[0.06]">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-3xl font-bold">
              {priceSale ? `$${priceSale.toLocaleString()}` : 'Price on request'}
            </span>
            {listing?.price_negotiable && (
              <span className="text-xs text-muted-foreground">or best offer</span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            <span>Checkout by</span>
            <PayPalMonogram className="h-3.5" />
            <PayPalWordmark className="h-3" />
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Fulfillment */}
          <div className="space-y-2">
            {offersPickup && <FulfillmentRow icon={MapPin} label="Local pickup" free />}
            {sellerDelivers && (
              <FulfillmentRow
                icon={Truck}
                label="Seller delivery"
                note={
                  radius
                    ? `${rateLabel ? `${rateLabel} · ` : ''}within ${radius} mi of ${originLabel}`
                    : rateLabel || 'Quoted at checkout'
                }
                free={!rateLabel}
              />
            )}
            {freightEnabled && (
              <FulfillmentRow
                icon={Package}
                label="Nationwide freight"
                note={
                  freightPayer === 'seller'
                    ? 'Seller covers freight'
                    : 'Quoted by distance at checkout'
                }
              />
            )}
          </div>

          {/* Delivery / address check */}
          {canCheck && (
            <div className="space-y-2">
              <label htmlFor="sale-delivery-zip" className="text-xs text-muted-foreground">
                Check delivery to your ZIP
              </label>
              <div className="flex gap-2">
                <Input
                  id="sale-delivery-zip"
                  inputMode="numeric"
                  placeholder="ZIP code"
                  maxLength={5}
                  value={zip}
                  onChange={(e) => {
                    setZip(e.target.value.replace(/\D/g, '').slice(0, 5));
                    setResult(null);
                    setCheckError(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                  className="text-base"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCheck}
                  disabled={zip.length !== 5 || checking}
                >
                  {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check'}
                </Button>
              </div>
              {checkError && (
                <p className="text-xs text-destructive flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" /> {checkError}
                </p>
              )}
              {result && (
                <div
                  className={`rounded-xl p-3 text-xs ring-1 ${
                    result.inRadius
                      ? 'ring-emerald-500/30 bg-emerald-500/5'
                      : 'ring-amber-500/30 bg-amber-500/5'
                  }`}
                >
                  <p className="font-medium flex items-center gap-1.5 text-sm">
                    {result.inRadius ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}
                    {result.inRadius
                      ? `Delivery available to ${result.place}`
                      : `Outside the ${radius}-mile delivery area`}
                  </p>
                  <p className="text-muted-foreground mt-1">
                    About {result.miles} mi from {originLabel}.
                    {result.inRadius && result.fee
                      ? ` Estimated delivery ${result.fee}${perMile ? ' by distance' : ''} — confirmed at checkout.`
                      : ''}
                    {!result.inRadius && freightEnabled
                      ? ' Nationwide freight can still ship this to you.'
                      : ''}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Financing availability */}
          {financingEnabled && (
            <div className="rounded-xl bg-white/[0.03] ring-hairline p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-primary" />
                <FinancingAvailableBadge />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Equipment financing is available on this listing through Equinox Funding. Vendibook
                is not a lender; approval and terms are set by the provider.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => void handleApplyFinancing()} disabled={applying}>
                  Apply now
                  {applying ? (
                    <Loader2 className="h-3.5 w-3.5 ml-1.5 animate-spin" />
                  ) : (
                    <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                  )}
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <Link
                    to={`/financing?listing_id=${listing.id}`}
                    onClick={() => trackFinancingLearnMoreClick('listing_panel', listing.id)}
                  >
                    Learn more
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2.5">
            <Button
              onClick={handleBuy}
              disabled={!isAvailable || !priceSale}
              size="lg"
              data-testid="sale-purchase-card-buy-now"
              className="w-full h-14 text-base font-bold rounded-2xl bg-cta-primary hover:opacity-95 shadow-cta-primary text-white border-0"
            >
              Buy Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleOffer}
                disabled={!isAvailable || !priceSale}
                variant="outline"
                className="h-12 rounded-2xl font-semibold"
              >
                <Tag className="w-4 h-4 mr-1.5" />
                Make Offer
              </Button>
              <Button
                onClick={() => setShowContact(true)}
                variant="outline"
                className="h-12 rounded-2xl font-semibold"
              >
                <MessageSquare className="w-4 h-4 mr-1.5" />
                Contact
              </Button>
            </div>
          </div>

          {/* Compact seller info */}
          <div className="pt-4 border-t border-white/[0.06] flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/[0.06] ring-hairline flex items-center justify-center text-sm font-semibold shrink-0">
              {sellerName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium truncate">{sellerName}</span>
                {sellerVerified && (
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-label="Identity verified" />
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {ratingData?.count ? (
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    {ratingData.average} · {ratingData.count} review
                    {ratingData.count !== 1 ? 's' : ''}
                  </span>
                ) : host?.last_active_at ? (
                  formatLastActive(host.last_active_at)
                ) : (
                  'Vendibook seller'
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/u/${listing.host_id}`}>Profile</Link>
            </Button>
          </div>
        </div>
      </SaleCard>

      <Dialog open={showContact} onOpenChange={setShowContact}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Message {sellerName}</DialogTitle>
          </DialogHeader>
          <MessageHostForm
            listingId={listing.id}
            hostId={listing.host_id}
            listingTitle={listing.title}
          />
        </DialogContent>
      </Dialog>

      <AuthGateOfferModal
        open={showAuthGate}
        onOpenChange={setShowAuthGate}
        onAuthSuccess={handleAuthSuccess}
      />

      {priceSale && (
        <MakeOfferModal
          open={showOffer}
          onOpenChange={setShowOffer}
          listingId={listing.id}
          sellerId={listing.host_id}
          listingTitle={listing.title}
          askingPrice={priceSale}
        />
      )}
    </>
  );
};

export default SalePurchaseCard;
