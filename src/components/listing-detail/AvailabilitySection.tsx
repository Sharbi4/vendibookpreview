import React, { useState } from 'react';
import { Calendar, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import DateSelectionModal from './DateSelectionModal';
import VendorSpaceBookingModal from './VendorSpaceBookingModal';
import type { ListingCategory } from '@/types/listing';

interface AvailabilitySectionProps {
  listingId: string;
  availableFrom?: string | null;
  availableTo?: string | null;
  priceDaily: number | null;
  priceWeekly?: number | null;
  priceMonthly?: number | null;
  priceHourly?: number | null;
  hourlyEnabled?: boolean;
  dailyEnabled?: boolean;
  instantBook?: boolean;
  onDatesSelected?: (startDate: Date, endDate: Date) => void;
  className?: string;
  category?: ListingCategory;
  totalSlots?: number;
  slotNames?: string[] | null;
}

export const AvailabilitySection: React.FC<AvailabilitySectionProps> = ({
  listingId,
  availableFrom,
  availableTo,
  priceDaily,
  priceWeekly,
  priceMonthly,
  priceHourly,
  hourlyEnabled = false,
  dailyEnabled = true,
  instantBook = false,
  onDatesSelected,
  className,
  category,
  totalSlots = 1,
  slotNames,
}) => {
  const [showDateModal, setShowDateModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  
  const isVendorSpace = category === 'vendor_space' || category === 'vendor_lot';

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
          {isVendorSpace 
            ? 'View availability and select your space to start booking.'
            : 'Select your rental dates to see pricing and start the booking process.'}
        </p>

        <Button
          variant="dark-shine"
          className="w-full gap-2"
          size="lg"
          onClick={() => isVendorSpace ? setShowVendorModal(true) : setShowDateModal(true)}
        >
          <Calendar className="h-4 w-4" />
          {isVendorSpace ? 'View Availability' : 'Select Dates'}
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

      {/* Vendor Space Modal */}
      {isVendorSpace && (
        <VendorSpaceBookingModal
          open={showVendorModal}
          onOpenChange={setShowVendorModal}
          listingId={listingId}
          availableFrom={availableFrom}
          availableTo={availableTo}
          priceDaily={priceDaily}
          priceWeekly={priceWeekly}
          priceMonthly={priceMonthly}
          priceHourly={priceHourly}
          hourlyEnabled={hourlyEnabled}
          instantBook={instantBook}
          totalSlots={totalSlots}
          slotNames={slotNames}
        />
      )}

      {/* Regular Date Selection Modal */}
      {!isVendorSpace && (
        <DateSelectionModal
          open={showDateModal}
          onOpenChange={setShowDateModal}
          listingId={listingId}
          availableFrom={availableFrom}
          availableTo={availableTo}
          priceDaily={priceDaily}
          priceWeekly={priceWeekly}
          priceMonthly={priceMonthly}
          priceHourly={priceHourly}
          hourlyEnabled={hourlyEnabled}
          dailyEnabled={dailyEnabled}
          instantBook={instantBook}
          onDatesSelected={onDatesSelected}
          navigateToBooking={true}
        />
      )}
    </>
  );
};

export default AvailabilitySection;
