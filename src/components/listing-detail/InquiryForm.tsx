import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, MapPin, Truck, Package, ArrowRight, Calendar, Tag } from 'lucide-react';
import type { FulfillmentType } from '@/types/listing';
import { StripeLogo } from '@/components/ui/StripeLogo';
import { AffirmBadge, isAffirmEligible } from '@/components/ui/AffirmBadge';
import { AfterpayBadge, isAfterpayEligible } from '@/components/ui/AfterpayBadge';
import { trackCTAClick } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';
import { MakeOfferModal, AuthGateOfferModal } from '@/components/offers';

interface InquiryFormProps {
  listingId: string;
  hostId: string;
  listingTitle: string;
  priceSale: number | null;
  fulfillmentType?: FulfillmentType;
  deliveryFee?: number | null;
  deliveryRadiusMiles?: number | null;
  pickupLocation?: string | null;
  vendibookFreightEnabled?: boolean;
  freightPayer?: 'buyer' | 'seller';
  originAddress?: string | null;
  weightLbs?: number | null;
  lengthInches?: number | null;
  widthInches?: number | null;
  heightInches?: number | null;
  freightCategory?: string | null;
  acceptCardPayment?: boolean;
  acceptCashPayment?: boolean;
}

const InquiryForm = ({ 
  listingId,
  hostId,
  listingTitle,
  priceSale,
  fulfillmentType = 'pickup',
  deliveryFee,
  deliveryRadiusMiles,
  vendibookFreightEnabled = false,
  freightPayer = 'buyer',
}: InquiryFormProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const getAvailableFulfillmentOptions = () => {
    const options: string[] = [];
    if (vendibookFreightEnabled) options.push('vendibook_freight');
    if (fulfillmentType === 'both') {
      options.push('pickup', 'delivery');
    } else if (fulfillmentType === 'delivery') {
      options.push('delivery');
    } else if (fulfillmentType === 'pickup') {
      options.push('pickup');
    }
    return options;
  };

  const fulfillmentOptions = getAvailableFulfillmentOptions();
  const isFreightSellerPaid = vendibookFreightEnabled && freightPayer === 'seller';

  const handleStartPurchase = () => {
    trackCTAClick('start_purchase', 'inquiry_form');
    navigate(`/checkout/${listingId}`);
  };

  const handleMakeOffer = () => {
    trackCTAClick('make_offer', 'inquiry_form');
    if (!user) {
      setShowAuthModal(true);
    } else {
      setShowOfferModal(true);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    setShowOfferModal(true);
  };

  return (
    <div data-booking-form className="rounded-2xl border-0 shadow-xl bg-card sticky top-24 overflow-hidden">
      {/* Header section */}
      <div className="bg-muted/30 border-b border-border px-6 py-4">
        <h2 className="font-semibold text-base text-foreground line-clamp-2 mb-2">{listingTitle}</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-2xl font-bold text-foreground">
            ${priceSale?.toLocaleString()}
          </span>
          {priceSale && isAfterpayEligible(priceSale) && (
            <AfterpayBadge price={priceSale} className="text-xs" showEstimate={false} />
          )}
        </div>
        {vendibookFreightEnabled && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Est. delivery: 7-10 business days</span>
          </div>
        )}
      </div>

      {/* Content section */}
      <div className="p-6">
        <h3 className="text-sm font-medium text-foreground mb-3">Delivery Options</h3>
        
        <div className="space-y-2 mb-6">
          {fulfillmentOptions.includes('pickup') && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
              <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                <MapPin className="h-4 w-4" />
              </div>
              <span className="text-sm text-foreground font-medium">Local Pickup</span>
            </div>
          )}

          {fulfillmentOptions.includes('delivery') && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                  <Truck className="h-4 w-4" />
                </div>
                <span className="text-sm text-foreground font-medium">
                  Local Delivery {deliveryRadiusMiles ? `(${deliveryRadiusMiles} mi)` : ''}
                </span>
              </div>
              <span className="text-sm font-semibold">
                {deliveryFee ? `+$${deliveryFee}` : <span className="text-emerald-600">FREE</span>}
              </span>
            </div>
          )}

          {fulfillmentOptions.includes('vendibook_freight') && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                  <Package className="h-4 w-4" />
                </div>
                <span className="text-sm text-foreground font-medium">Nationwide Freight</span>
              </div>
              <span className="text-sm font-semibold">
                {isFreightSellerPaid ? <span className="text-emerald-600">FREE</span> : 'Quote at checkout'}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleStartPurchase}
            variant="dark-shine"
            className="flex-1 h-12 text-base" 
            size="lg"
            disabled={!priceSale}
          >
            Buy Now
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button 
            onClick={handleMakeOffer}
            variant="outline"
            className="h-12 px-4 border-primary text-primary hover:bg-primary/10" 
            size="lg"
            disabled={!priceSale}
          >
            <Tag className="w-4 h-4" />
          </Button>
        </div>

        <Button 
          onClick={handleMakeOffer}
          variant="ghost"
          className="w-full text-sm text-muted-foreground hover:text-primary" 
          disabled={!priceSale}
        >
          <Tag className="w-4 h-4 mr-2" />
          Make an Offer
        </Button>

        {priceSale && (isAffirmEligible(priceSale) || isAfterpayEligible(priceSale)) && (
          <div className="mt-3 flex flex-col gap-2">
            {isAffirmEligible(priceSale) && (
              <AffirmBadge price={priceSale} className="w-full justify-center py-2" showEstimate={false} />
            )}
            {isAfterpayEligible(priceSale) && (
              <AfterpayBadge price={priceSale} className="w-full justify-center py-2" showEstimate={false} />
            )}
          </div>
        )}

        <div className="flex items-center gap-3 justify-center mt-4 text-xs text-muted-foreground p-3 bg-muted/30 rounded-xl border border-border">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Vendibook escrow</span>
          </div>
          <span className="text-border">•</span>
          <div className="flex items-center gap-1.5">
            <span>Powered by</span>
            <StripeLogo size="xs" />
          </div>
        </div>
      </div>

      {/* Offer Modals */}
      <AuthGateOfferModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onAuthSuccess={handleAuthSuccess}
      />

      {priceSale && (
        <MakeOfferModal
          open={showOfferModal}
          onOpenChange={setShowOfferModal}
          listingId={listingId}
          sellerId={hostId}
          listingTitle={listingTitle}
          askingPrice={priceSale}
        />
      )}
    </div>
  );
};

export default InquiryForm;
