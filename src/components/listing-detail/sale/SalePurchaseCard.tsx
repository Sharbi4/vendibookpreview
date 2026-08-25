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
import { MakeOfferModal } from '@/components/offers/MakeOfferModal';
import { AuthGateOfferModal } from '@/components/offers/AuthGateOfferModal';
import MessageHostForm from '@/components/messaging/MessageHostForm';
import { useEquinoxFinancingEnabled } from '@/hooks/useListingFinancing';
import { PayPalMonogram } from '@/components/brand/ProviderLogos';
import { getPublicDisplayName } from '@/lib/displayName';
import { formatLastActive } from '@/hooks/useActivityTracker';
import { deliveryRateLabel } from '@/lib/fulfillment/delivery';
import { trackCTAClick } from '@/lib/analytics';
import { trackFinancingLearnMoreClick, type FinancingSource } from '@/lib/analytics';
import { useFinancingHandoff } from '@/hooks/useFinancingHandoff';

import { SaleCard } from './SaleCard';
import { BuyingInfoDialog } from './BuyingInfoDialog';
import { DeliveryCheckSheet, type DeliveryChoice } from './DeliveryCheckSheet';


interface SalePurchaseCardProps {
  listing: any;
  host: any;
  isOwner: boolean;
  sellerVerified: boolean;
  ratingData?: { average: number; count: number } | null;
  /** Distinguishes the mobile and desktop instances so DOM ids stay unique. */
  instanceId?: string;
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
  <div className="flex items-start gap-3">
    <Icon className="h-[18px] w-[18px] mt-0.5 shrink-0 text-muted-foreground" />
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium leading-tight">{label}</div>
      {note && <div className="text-xs text-muted-foreground mt-0.5">{note}</div>}
    </div>
    {free && <span className="text-xs font-medium text-emerald-600 shrink-0">Free</span>}
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
  instanceId = 'desktop',
}: SalePurchaseCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const financingEnabled = useEquinoxFinancingEnabled(listing);

  const [showOffer, setShowOffer] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [pending, setPending] = useState<'buy' | 'offer' | null>(null);
  const [showContact, setShowContact] = useState(false);
  const [applying, setApplying] = useState(false);

  // Delivery / address check — answered on this page, never a checkout jump.
  const [zip, setZip] = useState('');
  const [showDeliveryResult, setShowDeliveryResult] = useState(false);

  const priceSale: number | null = listing?.price_sale ?? null;
  const fulfillmentType: string = listing?.fulfillment_type || 'pickup';
  const sellerDelivers = fulfillmentType === 'delivery' || fulfillmentType === 'both';
  const offersPickup =
    fulfillmentType === 'pickup' || fulfillmentType === 'on_site' || fulfillmentType === 'both';
  const freightEnabled = Boolean(listing?.vendibook_freight_enabled);
  const freightPayer = listing?.freight_payer === 'seller' ? 'seller' : 'buyer';
  const radius = Number(listing?.delivery_radius_miles) || 0;
  const rateLabel = deliveryRateLabel(listing?.delivery_fee, listing?.delivery_fee_type);
  const isAvailable = listing?.status === 'published';
  const canCheck =
    (sellerDelivers || freightEnabled) &&
    typeof listing?.latitude === 'number' &&
    typeof listing?.longitude === 'number';
  const originLabel = [listing?.city, listing?.state].filter(Boolean).join(', ') || 'the seller’s area';

  const handleCheck = useCallback(() => {
    if (zip.length !== 5 || !canCheck) return;
    trackCTAClick('check_delivery', 'sale_purchase_card');
    setShowDeliveryResult(true);
  }, [zip, canCheck]);


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

  const [pendingDelivery, setPendingDelivery] = useState<DeliveryChoice | null>(null);

  const handleAuthSuccess = () => {
    setShowAuthGate(false);
    if (pending === 'buy')
      navigate(`/checkout/${listing.id}`, {
        state: pendingDelivery ? { deliveryChoice: pendingDelivery } : undefined,
      });
    else if (pending === 'offer') setShowOffer(true);
    setPending(null);
    setPendingDelivery(null);
  };


  // Every financing entry point on this card runs through the shared handoff:
  // placement tracking → Vendibook lead capture → Equinox.
  const handleApplyFinancing = (source: FinancingSource) => {
    startFinancingApply(source, listing.id);
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
  const zipInputId = `sale-delivery-zip-${instanceId}`;
  const deliveryNote = radius
    ? `${rateLabel ? `${rateLabel} · ` : ''}within ${radius} mi of ${originLabel}`
    : rateLabel || null;

  return (
    <>
      <SaleCard padding="none" className="overflow-hidden">
        {/* Price */}
        <div className="px-5 sm:px-6 pt-5 pb-4">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-3xl font-bold">
              {priceSale ? `$${priceSale.toLocaleString()}` : 'Price on request'}
            </span>
            {listing?.price_negotiable && (
              <span className="text-xs text-muted-foreground">or best offer</span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            <span>Checkout by</span>
            {/* Light card surface: the white wordmark would be invisible here. */}
            <PayPalMonogram className="h-3.5" />
            <span className="font-medium text-foreground">PayPal</span>
          </div>

        </div>

        <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-5">
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

          {/* Delivery / address check — results open in a sheet on this page */}
          {canCheck && (
            <div className="space-y-2">
              <label htmlFor={zipInputId} className="text-xs text-muted-foreground">
                Check delivery to your ZIP
              </label>
              <div className="flex gap-2">
                <Input
                  id={zipInputId}
                  inputMode="numeric"
                  placeholder="ZIP code"
                  maxLength={5}
                  value={zip}
                  onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                  className="text-base"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCheck}
                  disabled={zip.length !== 5}
                >
                  Check delivery
                </Button>
              </div>
            </div>
          )}


          {/* Financing availability */}
          {financingEnabled && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Banknote className="h-[18px] w-[18px] text-primary" />
                <span className="text-sm font-medium">Financing available</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Through Equinox Funding. Vendibook is not a lender; approval and terms are set by
                the provider.
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
              data-testid={`sale-purchase-card-buy-now-${instanceId}`}
              variant="cta"
              className="w-full h-14 text-base"
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

          {/* Small print — details live in one overlay, never as extra modules */}
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            You won&rsquo;t be charged until you review the total at checkout. All sales are final.{' '}
            <BuyingInfoDialog
              offersPickup={offersPickup}
              sellerDelivers={sellerDelivers}
              freightEnabled={freightEnabled}
              financingEnabled={financingEnabled}
              listingId={listing.id}
              locationLabel={originLabel}
              deliveryNote={deliveryNote}
            />
          </p>

          {/* Compact seller info */}
          <div className="pt-4 [box-shadow:inset_0_1px_0_hsl(var(--border))] flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
              {sellerName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium truncate">{sellerName}</span>
                {sellerVerified && (
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" aria-label="Identity verified" />
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

      <DeliveryCheckSheet
        open={showDeliveryResult}
        onOpenChange={setShowDeliveryResult}
        listing={listing}
        zip={zip}
        onContinue={(choice) => {
          setShowDeliveryResult(false);
          trackCTAClick('continue_with_delivery_option', 'sale_purchase_card');
          setPendingDelivery(choice);
          if (!gate('buy')) return;
          navigate(`/checkout/${listing.id}`, { state: { deliveryChoice: choice } });
        }}

      />


      <AuthGateOfferModal
        open={showAuthGate}
        onOpenChange={setShowAuthGate}
        intent={pending === 'buy' ? 'buy' : 'offer'}
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
