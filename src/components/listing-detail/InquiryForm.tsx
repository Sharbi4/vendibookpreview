import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, MapPin, Truck, Package, ArrowRight } from 'lucide-react';
import type { FulfillmentType } from '@/types/listing';

interface InquiryFormProps {
  listingId: string;
  hostId: string;
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
    navigate(`/checkout/${listingId}`);
  };

  return (
    <div data-booking-form className="bg-card border border-border rounded-xl p-6 shadow-card sticky top-24">
      <div className="mb-6">
        <span className="text-2xl font-bold text-foreground">
          ${priceSale?.toLocaleString()}
        </span>
      </div>

      <h3 className="text-sm font-medium text-foreground mb-3">Delivery Options</h3>
      
      <div className="space-y-2 mb-6">
        {fulfillmentOptions.includes('pickup') && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Local Pickup</span>
          </div>
        )}

        {fulfillmentOptions.includes('delivery') && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">
                Local Delivery {deliveryRadiusMiles ? `(${deliveryRadiusMiles} mi)` : ''}
              </span>
            </div>
            <span className="text-sm font-medium">
              {deliveryFee ? `+$${deliveryFee}` : <span className="text-emerald-600">FREE</span>}
            </span>
          </div>
        )}

        {fulfillmentOptions.includes('vendibook_freight') && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Nationwide Freight</span>
            </div>
            <span className="text-sm font-medium">
              {isFreightSellerPaid ? <span className="text-emerald-600">FREE</span> : 'Quote at checkout'}
            </span>
          </div>
        )}
      </div>

      <Button 
        onClick={handleStartPurchase}
        className="w-full" 
        size="lg"
        disabled={!priceSale}
      >
        Start Purchase
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>

      <div className="flex items-center gap-2 justify-center mt-3 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        <span>Protected by Vendibook escrow</span>
      </div>
    </div>
  );
};

export default InquiryForm;
