import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, MapPin, Truck, Package, ArrowRight, Calendar } from 'lucide-react';
import type { FulfillmentType } from '@/types/listing';
import { StripeLogo } from '@/components/ui/StripeLogo';
import { AffirmBadge, isAffirmEligible } from '@/components/ui/AffirmBadge';
import { AfterpayBadge, isAfterpayEligible } from '@/components/ui/AfterpayBadge';
import { trackCTAClick } from '@/lib/analytics';

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
  listingTitle,
  priceSale,
  fulfillmentType = 'pickup',
  deliveryFee,
  deliveryRadiusMiles,
  vendibookFreightEnabled = false,
  freightPayer = 'buyer',
}: InquiryFormProps) => {
  const navigate = useNavigate();

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

  return (
    <div data-booking-form className="relative overflow-hidden bg-gradient-to-br from-background to-primary/5 border-2 border-primary/20 rounded-2xl shadow-xl sticky top-24">
      {/* Subtle animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-amber-500/5 to-yellow-400/5 opacity-50" />
      
      {/* Header section with gradient */}
      <div className="relative bg-gradient-to-r from-primary/15 via-amber-500/10 to-yellow-400/5 border-b border-primary/20 px-6 py-4">
        <h2 className="font-semibold text-base text-foreground line-clamp-2 mb-2">{listingTitle}</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
            ${priceSale?.toLocaleString()}
          </span>
          {priceSale && isAfterpayEligible(priceSale) && (
            <AfterpayBadge price={priceSale} className="text-xs" />
          )}
        </div>
        {vendibookFreightEnabled && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Est. delivery: 7-10 business days</span>
          </div>
        )}
      </div>

      {/* Content section with white background */}
      <div className="relative bg-white dark:bg-card p-6">
        <h3 className="text-sm font-medium text-foreground mb-3">Delivery Options</h3>
        
        <div className="space-y-2 mb-6">
          {fulfillmentOptions.includes('pickup') && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-muted/50 to-primary/5 border border-border/50">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-amber-500/20 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm text-foreground font-medium">Local Pickup</span>
            </div>
          )}

          {fulfillmentOptions.includes('delivery') && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-muted/50 to-primary/5 border border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-amber-500/20 flex items-center justify-center">
                  <Truck className="h-4 w-4 text-primary" />
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
            <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-muted/50 to-primary/5 border border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-amber-500/20 flex items-center justify-center">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm text-foreground font-medium">Nationwide Freight</span>
              </div>
              <span className="text-sm font-semibold">
                {isFreightSellerPaid ? <span className="text-emerald-600">FREE</span> : 'Quote at checkout'}
              </span>
            </div>
          )}
        </div>

        <Button 
          onClick={handleStartPurchase}
          variant="gradient"
          className="w-full h-12 text-base" 
          size="lg"
          disabled={!priceSale}
        >
          Start Purchase
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>

        {priceSale && isAffirmEligible(priceSale) && (
          <div className="mt-3">
            <AffirmBadge price={priceSale} className="w-full justify-center py-2" />
          </div>
        )}

        <div className="flex items-center gap-3 justify-center mt-4 text-xs text-muted-foreground p-2 bg-primary/5 rounded-lg border border-primary/10">
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
    </div>
  );
};

export default InquiryForm;
