import { format } from 'date-fns';
import { Calendar, MapPin, Truck, ShieldCheck, Loader2, CheckCircle2, Wallet } from 'lucide-react';
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
  depositAmount?: number | null;
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
  depositAmount = null,
  fees,
  fulfillmentSelected,
  instantBook,
  isSubmitting,
  onSubmit,
  onBack,
}: BookingStepReviewProps) => {
  const hasDeposit = depositAmount && depositAmount > 0;
  const totalWithDeposit = fees.customerTotal + (hasDeposit ? depositAmount : 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-primary/10 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center shadow-md transition-transform duration-300 hover:scale-105">
            <CheckCircle2 className="h-5 w-5 text-white" />
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
      <div className="relative overflow-hidden border-2 border-primary/20 rounded-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-amber-500/5 to-yellow-400/5 opacity-50" />
        <div className="relative bg-gradient-to-r from-primary/15 via-amber-500/10 to-yellow-400/5 px-4 py-3 border-b border-primary/10">
          <p className="font-semibold text-foreground line-clamp-1">{listingTitle}</p>
        </div>
        
        <div className="relative p-4 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-amber-500/20 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <span className="text-foreground font-medium">
                {format(startDate, 'MMM d')} – {format(endDate, 'MMM d, yyyy')}
              </span>
              <span className="text-muted-foreground ml-2">({rentalDays} days)</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-amber-500/20 flex items-center justify-center">
              {fulfillmentSelected === 'delivery' ? (
                <Truck className="h-4 w-4 text-primary" />
              ) : (
                <MapPin className="h-4 w-4 text-primary" />
              )}
            </div>
            <span className="text-foreground font-medium capitalize">
              {fulfillmentSelected.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Price breakdown */}
      <div className="relative overflow-hidden border-2 border-primary/20 rounded-xl p-4 space-y-3">
        <div className="absolute inset-0 bg-gradient-to-br from-background to-primary/5" />
        <h4 className="relative font-semibold text-foreground text-sm">Price Breakdown</h4>
        
        <div className="relative space-y-2 text-sm">
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
          
          <div className="flex justify-between pt-3 border-t border-border">
            <span className="font-semibold">Rental Total</span>
            <span className="font-semibold">${fees.customerTotal.toFixed(2)}</span>
          </div>

          {/* Security Deposit */}
          {hasDeposit && (
            <>
              <div className="flex justify-between items-center pt-2">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-blue-500" />
                  <span className="text-muted-foreground">Security Deposit</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                    Refundable
                  </span>
                </div>
                <span className="text-foreground">${depositAmount.toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground pl-6">
                Returned after rental if no damage or late return
              </p>
            </>
          )}
          
          <div className="flex justify-between pt-3 border-t-2 border-primary/30">
            <span className="font-bold text-lg">
              {hasDeposit ? 'Total Due Today' : 'Total'}
            </span>
            <span className="font-bold text-lg bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
              ${hasDeposit ? totalWithDeposit.toFixed(2) : fees.customerTotal.toFixed(2)}
            </span>
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
          {instantBook ? `Pay $${(hasDeposit ? totalWithDeposit : fees.customerTotal).toFixed(2)}` : 'Submit Request'}
        </Button>
      </div>

      {/* Disclaimer */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        <span>
          {instantBook
            ? hasDeposit 
              ? 'Deposit is fully refundable after rental. Full refund if documents not approved.'
              : 'Charged immediately. Full refund if documents not approved.'
            : 'You won\'t be charged until host approves.'}
        </span>
      </div>
    </div>
  );
};

export default BookingStepReview;