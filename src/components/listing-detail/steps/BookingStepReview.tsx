import { format } from 'date-fns';
import { Calendar, MapPin, Truck, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RENTAL_RENTER_FEE_PERCENT } from '@/lib/commissions';
import type { FulfillmentSelection } from '../BookingWizard';

interface BookingStepReviewProps {
  listingTitle: string;
  startDate: Date;
  endDate: Date;
  rentalDays: number;
  priceDaily: number;
  basePrice: number;
  deliveryFee: number;
  fees: {
    subtotal: number;
    renterFee: number;
    customerTotal: number;
  };
  fulfillmentSelected: FulfillmentSelection;
  instantBook: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  onBack: () => void;
}

const BookingStepReview = ({
  listingTitle,
  startDate,
  endDate,
  rentalDays,
  priceDaily,
  basePrice,
  deliveryFee,
  fees,
  fulfillmentSelected,
  instantBook,
  isSubmitting,
  onSubmit,
  onBack,
}: BookingStepReviewProps) => {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          {instantBook ? 'Review & pay' : 'Review request'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {instantBook ? 'Confirm details and pay now' : 'Review and submit your request'}
        </p>
      </div>

      {/* Booking summary */}
      <div className="p-4 bg-muted/50 rounded-xl space-y-3">
        <p className="font-medium text-foreground line-clamp-1">{listingTitle}</p>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {format(startDate, 'MMM d')} – {format(endDate, 'MMM d, yyyy')}
          </span>
          <span className="text-foreground font-medium">({rentalDays} days)</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {fulfillmentSelected === 'delivery' ? (
            <Truck className="h-4 w-4" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
          <span className="capitalize">{fulfillmentSelected.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Price breakdown */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            ${priceDaily} × {rentalDays} day{rentalDays > 1 ? 's' : ''}
          </span>
          <span>${basePrice.toFixed(2)}</span>
        </div>
        
        {deliveryFee > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery fee</span>
            <span>${deliveryFee.toFixed(2)}</span>
          </div>
        )}
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Platform fee ({RENTAL_RENTER_FEE_PERCENT}%)
          </span>
          <span>${fees.renterFee.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between pt-2 border-t font-semibold">
          <span>Total</span>
          <span>${fees.customerTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Trust badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        <span>Payments processed securely</span>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1" disabled={isSubmitting}>
          Back
        </Button>
        <Button 
          variant="gradient" 
          onClick={onSubmit} 
          className="flex-1"
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {instantBook ? `Pay $${fees.customerTotal.toFixed(2)}` : 'Submit request'}
        </Button>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center">
        {instantBook
          ? 'Charged immediately. Full refund if documents not approved.'
          : 'Not charged until host approves.'}
      </p>
    </div>
  );
};

export default BookingStepReview;
