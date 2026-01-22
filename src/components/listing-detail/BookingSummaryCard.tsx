import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { Calendar, Zap, Shield, ArrowRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DateSelectionModal from './DateSelectionModal';
import { cn } from '@/lib/utils';
import { calculateRentalFees } from '@/lib/commissions';
interface BookingSummaryCardProps {
  listingId: string;
  listingTitle: string;
  priceDaily: number | null;
  priceWeekly?: number | null;
  availableFrom?: string | null;
  availableTo?: string | null;
  instantBook?: boolean;
  coverImage?: string;
}

export const BookingSummaryCard: React.FC<BookingSummaryCardProps> = ({
  listingId,
  listingTitle,
  priceDaily,
  priceWeekly,
  availableFrom,
  availableTo,
  instantBook = false,
  coverImage,
}) => {
  const navigate = useNavigate();
  const [showDateModal, setShowDateModal] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const rentalDays = startDate && endDate ? differenceInDays(endDate, startDate) : 0;

  const calculateBasePrice = () => {
    if (!priceDaily || rentalDays <= 0) return 0;
    const weeks = Math.floor(rentalDays / 7);
    const remainingDays = rentalDays % 7;
    if (priceWeekly && weeks > 0) {
      return (weeks * priceWeekly) + (remainingDays * priceDaily);
    }
    return rentalDays * priceDaily;
  };

  const basePrice = calculateBasePrice();
  const fees = calculateRentalFees(basePrice);
  const totalWithFees = fees.customerTotal;

  const handleDatesSelected = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleContinue = () => {
    if (startDate && endDate) {
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');
      navigate(`/book/${listingId}?start=${startStr}&end=${endStr}`);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-border shadow-xl bg-card overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-muted/30 border-b border-border">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              ${priceDaily?.toLocaleString() || '—'}
            </span>
            <span className="text-muted-foreground">/day</span>
          </div>
          {priceWeekly && (
            <p className="text-sm text-muted-foreground mt-1">
              ${priceWeekly.toLocaleString()}/week for 7+ days
            </p>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Date selection */}
          {startDate && endDate ? (
            <div className="space-y-3">
              {/* Selected dates */}
              <div className="p-3 bg-muted/50 rounded-xl border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Your dates</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={() => setShowDateModal(true)}
                  >
                    Change
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(startDate, 'MMM d')} – {format(endDate, 'MMM d, yyyy')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {rentalDays} day{rentalDays > 1 ? 's' : ''}
                </p>
              </div>

              {/* Price summary */}
              <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 space-y-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{rentalDays} day{rentalDays > 1 ? 's' : ''} × ${priceDaily?.toLocaleString()}</span>
                  <span>${basePrice.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Platform fee</span>
                  <span>${fees.renterFee.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="font-medium text-foreground">Est. total</span>
                  <span className="text-lg font-bold text-foreground">
                    ${totalWithFees.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Continue button */}
              <Button
                variant="dark-shine"
                className="w-full h-12 text-base"
                size="lg"
                onClick={handleContinue}
              >
                {instantBook ? (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Book Now
                  </>
                ) : (
                  'Request to Book'
                )}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              {!instantBook && (
                <p className="text-xs text-center text-muted-foreground">
                  You won't be charged until your request is approved
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Select dates button */}
              <Button
                variant="dark-shine"
                className="w-full h-12 text-base"
                size="lg"
                onClick={() => setShowDateModal(true)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Check availability
              </Button>

              {instantBook && (
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    <Zap className="h-3 w-3 mr-1" />
                    Instant Book
                  </Badge>
                </div>
              )}
            </>
          )}

          {/* Trust badges */}
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border border-border">
            <Shield className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-xs text-muted-foreground">
              Secure payments protected by Vendibook
            </span>
          </div>
        </div>
      </div>

      <DateSelectionModal
        open={showDateModal}
        onOpenChange={setShowDateModal}
        listingId={listingId}
        availableFrom={availableFrom}
        availableTo={availableTo}
        priceDaily={priceDaily}
        priceWeekly={priceWeekly}
        instantBook={instantBook}
        onDatesSelected={handleDatesSelected}
        navigateToBooking={false}
      />
    </>
  );
};

export default BookingSummaryCard;
