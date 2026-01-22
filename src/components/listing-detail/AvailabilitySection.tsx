import React, { useState } from 'react';
import { Calendar, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import DateSelectionModal from './DateSelectionModal';

interface AvailabilitySectionProps {
  listingId: string;
  availableFrom?: string | null;
  availableTo?: string | null;
  priceDaily: number | null;
  priceWeekly?: number | null;
  instantBook?: boolean;
  onDatesSelected: (startDate: Date, endDate: Date) => void;
  className?: string;
}

export const AvailabilitySection: React.FC<AvailabilitySectionProps> = ({
  listingId,
  availableFrom,
  availableTo,
  priceDaily,
  priceWeekly,
  instantBook = false,
  onDatesSelected,
  className,
}) => {
  const [showDateModal, setShowDateModal] = useState(false);

  return (
    <>
      <div className={cn("p-4 bg-card rounded-xl border border-border", className)}>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Check Availability</h3>
          {instantBook && (
            <Badge variant="outline" className="ml-auto bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
              <Zap className="h-3 w-3 mr-1" />
              Instant Book
            </Badge>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Select your rental dates to see pricing and start the booking process.
        </p>

        <Button
          variant="gradient"
          className="w-full gap-2"
          size="lg"
          onClick={() => setShowDateModal(true)}
        >
          <Calendar className="h-4 w-4" />
          Select Dates
          <ArrowRight className="h-4 w-4 ml-auto" />
        </Button>

        {priceDaily && (
          <div className="mt-3 flex items-baseline justify-center gap-1 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">${priceDaily.toLocaleString()}</span>
            <span>/day</span>
            {priceWeekly && (
              <>
                <span className="mx-1">•</span>
                <span className="font-semibold text-foreground">${priceWeekly.toLocaleString()}</span>
                <span>/week</span>
              </>
            )}
          </div>
        )}
      </div>

      <DateSelectionModal
        open={showDateModal}
        onOpenChange={setShowDateModal}
        listingId={listingId}
        availableFrom={availableFrom}
        availableTo={availableTo}
        priceDaily={priceDaily}
        priceWeekly={priceWeekly}
        onDatesSelected={onDatesSelected}
      />
    </>
  );
};

export default AvailabilitySection;
