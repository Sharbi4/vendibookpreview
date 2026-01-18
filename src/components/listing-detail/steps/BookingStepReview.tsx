import { format } from 'date-fns';
import { Calendar, MapPin, Truck, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RENTAL_RENTER_FEE_PERCENT } from '@/lib/commissions';
import { 
  WhatsIncluded, 
  WhatHappensNext, 
  getBookingInstantSteps, 
  getBookingRequestSteps 
} from '@/components/shared';
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
      {/* Header */}
      <div className="border-b border-border/50 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {instantBook ? 'Review & Pay' : 'Review Your Request'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {instantBook ? 'Confirm details and complete your booking' : 'Check everything looks right before submitting'}
            </p>
          </div>
        </div>
      </div>

      {/* Booking summary card */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3 border-b border-border/50">
          <p className="font-semibold text-foreground line-clamp-1">{listingTitle}</p>
        </div>
        
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <span className="text-foreground font-medium">
                {format(startDate, 'MMM d')} – {format(endDate, 'MMM d, yyyy')}
              </span>
              <span className="text-muted-foreground ml-2">({rentalDays} days)</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              {fulfillmentSelected === 'delivery' ? (
                <Truck className="h-4 w-4 text-muted-foreground" />
              ) : (
                <MapPin className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <span className="text-foreground font-medium capitalize">
              {fulfillmentSelected.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Price breakdown */}
      <div className="border border-border rounded-xl p-4 space-y-3">
        <h4 className="font-semibold text-foreground text-sm">Price Breakdown</h4>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              ${priceDaily} × {rentalDays} day{rentalDays > 1 ? 's' : ''}
            </span>
            <span className="text-foreground">${basePrice.toFixed(2)}</span>
          </div>
          
          {deliveryFee > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery fee</span>
              <span className="text-foreground">${deliveryFee.toFixed(2)}</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Platform fee ({RENTAL_RENTER_FEE_PERCENT}%)
            </span>
            <span className="text-foreground">${fees.renterFee.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between pt-3 border-t-2 border-primary/20">
            <span className="font-bold text-lg">Total</span>
            <span className="font-bold text-lg text-primary">${fees.customerTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* What's Included */}
      <WhatsIncluded mode="booking" />

      {/* What happens next */}
      <WhatHappensNext
        steps={instantBook ? getBookingInstantSteps() : getBookingRequestSteps()}
      />

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1 h-12" disabled={isSubmitting}>
          Back
        </Button>
        <Button 
          variant="gradient" 
          onClick={onSubmit} 
          className="flex-1 h-12 text-base"
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {instantBook ? `Pay $${fees.customerTotal.toFixed(2)}` : 'Submit Request'}
        </Button>
      </div>

      {/* Disclaimer */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        <span>
          {instantBook
            ? 'Charged immediately. Full refund if documents not approved.'
            : 'You won\'t be charged until host approves.'}
        </span>
      </div>
    </div>
  );
};

export default BookingStepReview;